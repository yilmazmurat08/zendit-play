import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import type {
  AppSettings,
  Channel,
  Episode,
  Movie,
  Series,
  TabType,
  WatchHistoryEntry,
  WatchLogEntry,
  XtreamAccount,
} from './types';
import { defaultSettings } from './data/mockData';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LiveTvScreen } from './components/LiveTvScreen';
import { GuideScreen } from './components/GuideScreen';
import { ContinueScreen } from './components/ContinueScreen';
import { VodScreen } from './components/VodScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LegalScreen } from './components/LegalScreen';
import { AccountLoginModal } from './components/AccountLoginModal';
import { TrailerPlayer } from './components/TrailerPlayer';
import { ParentalCategoryEditor, PinDialog, type PinPromptOptions } from './components/ParentalControl';
import { ZenditLogo } from './components/ZenditLogo';
import { CATEGORY_FAVORITES, getDeviceInfo, useSpatialNavigation, useTvStage } from './lib/tv';
import { isNativeApp, NativePlayer, type NativePlayerItem, type NativePlayerResult } from './lib/nativePlayer';
import {
  fetchSeriesDetail,
  fetchShortEpg,
  fetchVodDetail,
  loadXtreamAccount,
  shortEpgUrl,
  type XtreamCredentials,
} from './lib/xtreamApi';
import {
  classifyM3UEntries,
  fetchM3UFromUrl,
  groupSeriesFromEntries,
  m3uEntryToChannel,
  m3uEntryToMovie,
  parseM3U,
  playlistEpgUrl,
} from './lib/m3uParser';
import { clearEpg, formatClock, refreshEpg, type EpgProgramme } from './lib/epg';
import { archiveDays, buildCatchupUrl, catchupTemplate } from './lib/catchup';
import { checkPin, DEFAULT_PARENTAL, isItemRestricted, makeParentalApi, ParentalContext } from './lib/parental';
import { useContinueLists, type ContinueKind } from './lib/continueWatching';
import { appendWatchLog } from './lib/watchLog';
import { trailerInfo } from './lib/trailer';
import { clearStoredLists, LIST_KEYS, loadStoredLists, sanitizeList, saveStoredList, type ListKey } from './lib/listStore';
import type { LegalDocId } from './lib/legal';

// Browser-only player (with hls.js / mpegts.js): loaded when first opened. The Android app uses the native player.
const VideoPlayerModal = lazy(() => import('./components/VideoPlayerModal').then((m) => ({ default: m.VideoPlayerModal })));

/** Saved playback position of a movie / episode (ms). */
interface ResumePoint {
  pos: number;
  dur: number;
  at: number;
}

interface PinPrompt extends PinPromptOptions {
  id: number;
  resolve: (pin: string | null) => void;
}

/** Items handed to the native player always carry an id (used to match the watch report). */
type PlayItem = NativePlayerItem & { id: string };

function loadJson<T>(key: string, fallback: T): T {
  try {
    const t = localStorage.getItem(key);
    return t ? JSON.parse(t) : fallback;
  } catch {
    return fallback;
  }
}
/** Saved lists must be arrays: anything else (a damaged or foreign value) is ignored instead of crashing the first render. */
function loadArray<T>(key: string): T[] {
  const value = loadJson<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}
function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function loadSettings(): AppSettings {
  const saved = loadJson<Partial<AppSettings>>('zendit_settings', {}),
    s = { ...defaultSettings, ...saved };
  return (
    saved.playerEngine === 'intent' &&
      !saved.changePlayerLive &&
      ((s.changePlayerLive = 'system'), (s.changePlayerVOD = 'system')),
    ['.ts', '.m3u8'].includes(s.liveStreamFormat) || (s.liveStreamFormat = '.ts'),
    (s.parental = { ...DEFAULT_PARENTAL, ...(saved.parental || {}) }),
    (!s.parental.overrides || typeof s.parental.overrides != 'object') && (s.parental.overrides = {}),
    s
  );
}
function credsOf(account: XtreamAccount): XtreamCredentials {
  return { serverUrl: account.serverUrl, username: account.username, password: account.password || '' };
}
const REFRESH_INTERVAL_MS = 864e5,
  // Channels handed to the native player around the one being opened (for channel up / down and the
  // in-player list). Kept moderate: the whole list crosses the bridge on every channel open.
  MAX_PLAYLIST_ITEMS = 2000,
  MAX_RESUME_POINTS = 400;
/**
 * Older test builds could save a built-in demo account. The app ships no demo content any more:
 * such an install starts again at the account screen (the demo lists are not user data).
 */
function hasSavedDemoAccount(): boolean {
  return loadJson<{ type?: string } | null>('zendit_active_account', null)?.type === 'demo';
}
function episodeKey(seriesId: string, season: number, episode: number) {
  return `${seriesId}:s${season}e${episode}`;
}
export default function App() {
  const [dropDemo] = useState(hasSavedDemoAccount),
    [account, setAccount] = useState<XtreamAccount | null>(() => (dropDemo ? null : loadJson('zendit_active_account', null))),
    [channels, setChannels] = useState<Channel[]>(() =>
      dropDemo ? [] : sanitizeList('zendit_channels', loadArray<Channel>('zendit_channels')),
    ),
    [movies, setMovies] = useState<Movie[]>(() =>
      dropDemo ? [] : sanitizeList('zendit_movies', loadArray<Movie>('zendit_movies')),
    ),
    [series, setSeries] = useState<Series[]>(() =>
      dropDemo ? [] : sanitizeList('zendit_series', loadArray<Series>('zendit_series')),
    ),
    [settings, setSettings] = useState<AppSettings>(loadSettings),
    [watchLog, setWatchLog] = useState<WatchLogEntry[]>(() => loadArray('zendit_watch_log')),
    [positions, setPositions] = useState<Record<string, ResumePoint>>(() => {
      const saved = loadJson<unknown>('zendit_positions', {});
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Record<string, ResumePoint>) : {};
    }),
    [lastChannelId, setLastChannelId] = useState<string | null>(() => loadJson('zendit_last_channel', null)),
    [tab, setTab] = useState<TabType>(() => (loadSettings().startupBehavior === 'home' ? 'home' : 'live')),
    [searchQuery, setSearchQuery] = useState(''),
    [isSearchOpen, setIsSearchOpen] = useState(false),
    [isRefreshing, setIsRefreshing] = useState(false),
    [toast, setToast] = useState<string | null>(null),
    [selectedMedia, setSelectedMedia] = useState<Movie | Series | null>(null),
    [isDetailLoading, setIsDetailLoading] = useState(false),
    [webPlayerMedia, setWebPlayerMedia] = useState<Movie | Series | Channel | null>(null),
    [activeEpisode, setActiveEpisode] = useState<Episode | null>(null),
    [activeSeasonNum, setActiveSeasonNum] = useState(1),
    [isAccountOpen, setIsAccountOpen] = useState(false),
    [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false),
    [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null),
    [isNativePlaying, setIsNativePlaying] = useState(false),
    [history, setHistory] = useState<WatchHistoryEntry[]>(() => loadArray('zendit_history')),
    [screenKey, setScreenKey] = useState(0),
    [initialCategory, setInitialCategory] = useState<string | undefined>(undefined),
    [device] = useState(getDeviceInfo),
    focusBeforePlayerRef = useRef<HTMLElement | null>(null),
    webSessionRef = useRef<{ media: Movie | Series | Channel; startedAt: number } | null>(null),
    isPlayerOpen = !!webPlayerMedia || isNativePlaying,
    stage = useTvStage(),
    [parentalUnlocked, setParentalUnlockedState] = useState(false),
    parentalUnlockedRef = useRef(false),
    setParentalUnlocked = (J) => {
      ((parentalUnlockedRef.current = J), setParentalUnlockedState(J));
    },
    [pinPrompt, setPinPrompt] = useState<PinPrompt | null>(null),
    pinPromptIdRef = useRef(0),
    [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false),
    [trailer, setTrailer] = useState<{ youtubeId: string; url: string; title: string } | null>(null),
    [crashReport, setCrashReport] = useState<string | null>(null),
    exitArmedAtRef = useRef(0),
    pinFocusRef = useRef<HTMLElement | null>(null),
    askPin = (J: PinPromptOptions) =>
      new Promise<string | null>((xe) => {
        pinFocusRef.current || (pinFocusRef.current = document.activeElement);
        const Ie = ++pinPromptIdRef.current;
        setPinPrompt((Ke) => (Ke == null || Ke.resolve(null), { ...J, id: Ie, resolve: xe }));
      }),
    closePin = (J: string | null) => {
      (pinPrompt == null || pinPrompt.resolve(J),
        setPinPrompt(null),
        setTimeout(() => {
          if (document.querySelector('[aria-modal="true"]')) return;
          const xe = pinFocusRef.current;
          pinFocusRef.current = null;
          const Ie = document.activeElement;
          xe != null && xe.isConnected && (!Ie || Ie === document.body) && xe.focus();
        }, 60));
    },
    unlockRef = useRef(() => Promise.resolve(true));
  unlockRef.current = async () =>
    (await askPin({
      mode: 'verify',
      title: 'Ebeveyn denetimi',
      message: 'Bu içerik kilitli. Açmak için 4 haneli şifrenizi girin.',
    }))
      ? (setParentalUnlocked(true), true)
      : false;
  const parentalApi = useMemo(
      () => makeParentalApi(settings.parental, parentalUnlocked, () => unlockRef.current()),
      [settings.parental, parentalUnlocked],
    ),
    isHidden = (J: 'live' | 'movie' | 'series', xe: Channel | Movie | Series) =>
      settings.parental.enabled && !parentalUnlockedRef.current && isItemRestricted(settings.parental, J, xe),
    parentalCategories = useMemo(() => {
      const J = (xe) => {
        const Ie = /* @__PURE__ */ new Map();
        for (const Qe of xe) {
          const Je = Qe.category?.trim();
          Je && Ie.set(Je, (Ie.get(Je) || 0) + 1);
        }
        return Array.from(Ie, ([Qe, Je]) => ({ name: Qe, count: Je })).sort((Qe, Je) => Qe.name.localeCompare(Je.name, 'tr'));
      };
      return { live: J(channels), movie: J(movies), series: J(series) };
    }, [channels, movies, series]);
  (useSpatialNavigation(),
    useEffect(() => {
      var J;
      isPlayerOpen
        ? (focusBeforePlayerRef.current = document.activeElement)
        : (J = focusBeforePlayerRef.current) != null &&
          J.isConnected &&
          (focusBeforePlayerRef.current.focus(), (focusBeforePlayerRef.current = null));
    }, [isPlayerOpen]),
    useEffect(() => saveJson('zendit_history', history), [history]),
    useEffect(() => saveJson('zendit_active_account', account), [account]));
  const [listsLoaded, setListsLoaded] = useState(false),
    idbAvailableRef = useRef(true),
    savedListsRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    let J = false;
    return (
      loadStoredLists().then((xe) => {
        if (!J) {
          if (!xe) idbAvailableRef.current = false;
          else if (dropDemo) {
            // Saved demo lists are discarded (see hasSavedDemoAccount).
            clearStoredLists();
            for (const Ke of LIST_KEYS)
              try {
                localStorage.removeItem(Ke);
              } catch {}
          } else {
            const Ie = { zendit_channels: setChannels, zendit_movies: setMovies, zendit_series: setSeries };
            for (const Ke of LIST_KEYS) {
              const Qe = xe[Ke] && sanitizeList(Ke, xe[Ke]);
              if (Qe) {
                ((savedListsRef.current[Ke] = Qe), Ie[Ke](Qe));
                try {
                  localStorage.removeItem(Ke);
                } catch {}
              }
            }
          }
          setListsLoaded(true);
        }
      }),
      () => {
        J = true;
      }
    );
  }, []);
  const saveTimersRef = useRef<Record<string, number>>({}),
    persistList = (J: ListKey, xe: unknown[]) => {
      !listsLoaded ||
        savedListsRef.current[J] === xe ||
        (window.clearTimeout(saveTimersRef.current[J]),
        (saveTimersRef.current[J] = window.setTimeout(async () => {
          if (idbAvailableRef.current && (await saveStoredList(J, xe))) {
            savedListsRef.current[J] = xe;
            try {
              localStorage.removeItem(J);
            } catch {}
          } else saveJson(J, xe);
        }, 1200)));
    };
  (useEffect(() => persistList('zendit_channels', channels), [channels, listsLoaded]),
    useEffect(() => persistList('zendit_movies', movies), [movies, listsLoaded]),
    useEffect(() => persistList('zendit_series', series), [series, listsLoaded]),
    useEffect(() => saveJson('zendit_settings', settings), [settings]),
    useEffect(() => saveJson('zendit_watch_log', watchLog), [watchLog]),
    useEffect(() => saveJson('zendit_positions', positions), [positions]),
    useEffect(() => saveJson('zendit_last_channel', lastChannelId), [lastChannelId]),
    useEffect(() => {
      if (!toast) return;
      const J = setTimeout(() => setToast(null), 5e3);
      return () => clearTimeout(J);
    }, [toast]));
  const addToHistory = (J: string, xe: WatchHistoryEntry['type']) => {
      setHistory((Ie) =>
        [{ id: J, type: xe, at: Date.now() }, ...Ie.filter((Ke) => !(Ke.id === J && Ke.type === xe))].slice(0, 40),
      );
    },
    navigate = (J: TabType, xe?: string) => {
      (setTab(J),
        setInitialCategory(xe),
        setScreenKey((Ie) => Ie + 1),
        setSelectedMedia(null),
        setSearchQuery(''),
        setIsSearchOpen(false));
    },
    epgChannelCount = channels.reduce((J, xe) => J + (xe.epgId ? 1 : 0), 0),
    archiveChannelCount = channels.reduce((J, xe) => J + (xe.archiveDays ? 1 : 0), 0),
    epgKey = `${account?.id}|${channels.length}|${epgChannelCount}|${archiveChannelCount}|${channels[0]?.id}|${channels[channels.length - 1]?.id}`;
  useEffect(() => {
    refreshEpg({ account, channels, settings });
  }, [epgKey, settings.epgEnabled, settings.epgUrl, settings.epgOffsetHours, account?.epgUrl]);
  const refreshGuide = () => refreshEpg({ account, channels, settings, force: true });
  useEffect(() => {
    const J = settings.liveStreamFormat === '.m3u8' ? '.m3u8' : '.ts';
    setChannels((xe) => {
      let Ie = false;
      const Ke = xe.map((Qe) =>
        !Qe.streamId || Qe.format === J
          ? Qe
          : ((Ie = true), { ...Qe, format: J, streamUrl: Qe.streamUrl.replace(/\.(ts|m3u8)$/i, J) }),
      );
      return Ie ? Ke : xe;
    });
  }, [settings.liveStreamFormat]);
  const toggleChannelFavorite = (J: string) => {
      setChannels((xe) => xe.map((Ie) => (Ie.id === J ? { ...Ie, isFavorite: !Ie.isFavorite } : Ie)));
    },
    toggleMediaFavorite = (J: string, xe: 'movie' | 'series') => {
      (xe === 'movie'
        ? setMovies((Ie) => Ie.map((Ke) => (Ke.id === J ? { ...Ke, isFavorite: !Ke.isFavorite } : Ke)))
        : setSeries((Ie) => Ie.map((Ke) => (Ke.id === J ? { ...Ke, isFavorite: !Ke.isFavorite } : Ke))),
        setSelectedMedia((Ie) => (Ie && Ie.id === J ? { ...Ie, isFavorite: !Ie.isFavorite } : Ie)));
    },
    selectMedia = async (J: Movie | Series) => {
      if ((setSelectedMedia(J), !account || account.type !== 'xtream')) return;
      const xe = 'seasons' in J;
      if (xe ? J.seasons.length === 0 : !J.synopsis) {
        setIsDetailLoading(true);
        try {
          const Ke = credsOf(account);
          if (xe) {
            const Qe = await fetchSeriesDetail(Ke, J);
            (setSeries((Je) => Je.map((ot) => (ot.id === J.id ? { ...ot, ...Qe } : ot))),
              setSelectedMedia((Je) => (Je && Je.id === J.id ? { ...Je, ...Qe } : Je)));
          } else {
            const Qe = await fetchVodDetail(Ke, J);
            (setMovies((Je) => Je.map((ot) => (ot.id === J.id ? { ...ot, ...Qe } : ot))),
              setSelectedMedia((Je) => (Je && Je.id === J.id ? { ...Je, ...Qe } : Je)));
          }
        } catch {
        } finally {
          setIsDetailLoading(false);
        }
      }
    },
    resumePositionOf = (J: string) => {
      const xe = positions[J];
      if (!settings.resumePlayback || !xe || !xe.dur) return 0;
      const Ie = xe.pos / xe.dur;
      return Ie > 0.01 && Ie < 0.95 ? xe.pos : 0;
    },
    playerConfig = () => ({
      bufferSize: settings.bufferSize,
      hardwareAcceleration: settings.hardwareAcceleration,
      audioLanguage: settings.audioTrack || 'auto',
      subtitleLanguage: settings.subtitleTrack || 'none',
      subtitleScale: settings.subtitleScale || 1,
      aspectMode: settings.aspectMode || 'fit',
      autoPlayNext: settings.autoPlayNext,
    }),
    applyPlayerResult = (J: NativePlayerResult, xe: PlayItem[], Ie: Channel | Movie | Series) => {
      const Ke = new Map(xe.map((et) => [et.id, et])),
        Qe = Date.now(),
        Je = [],
        ot = {},
        vt = 'seasons' in Ie;
      let Ht;
      for (const et of J.sessions || []) {
        const ct = Ke.get(et.id);
        if (!ct) continue;
        if (ct.kind === 'live' || ct.kind === 'catchup') {
          const Xt = ct.kind === 'catchup' ? ct.id.split('|')[1] : ct.id,
            It = channels.find((St) => St.id === Xt);
          Je.push({
            id: Xt,
            kind: 'live',
            title: It?.name || ct.title,
            category: It?.category || '',
            at: Qe - et.watchedMs,
            ms: et.watchedMs,
          });
          continue;
        }
        const ni = 'title' in Ie ? Ie.title : ct.title;
        if (
          (Je.push({
            id: Ie.id,
            kind: vt ? 'series' : 'movie',
            title: ni,
            category: Ie.category || '',
            at: Qe - et.watchedMs,
            ms: et.watchedMs,
          }),
          et.durationMs > 0)
        ) {
          const Xt = et.completed || et.positionMs / et.durationMs >= 0.95;
          if (((ot[ct.id] = Xt ? null : { pos: et.positionMs, dur: et.durationMs, at: Qe }), vt)) {
            const It = ct.id.match(/:s(\d+)e(\d+)$/);
            It &&
              (Ht = {
                seasonNum: Number(It[1]),
                episodeNum: Number(It[2]),
                title: ct.subtitle || ct.title,
                progress: Xt ? 100 : Math.round((et.positionMs / et.durationMs) * 100),
              });
          } else {
            const It = Xt ? 0 : Math.round((et.positionMs / et.durationMs) * 100);
            setMovies((St) => St.map((Ut) => (Ut.id === Ie.id ? { ...Ut, progress: It } : Ut)));
          }
        }
      }
      if (
        (Object.keys(ot).length &&
          setPositions((et) => {
            const ct = { ...et };
            for (const [ni, Xt] of Object.entries(ot)) Xt ? (ct[ni] = Xt) : delete ct[ni];
            // Keep only the most recent resume points so this map cannot grow without limit.
            const keys = Object.keys(ct);
            if (keys.length > MAX_RESUME_POINTS) {
              keys.sort((a, b) => (ct[b].at || 0) - (ct[a].at || 0));
              for (const key of keys.slice(MAX_RESUME_POINTS)) delete ct[key];
            }
            return ct;
          }),
        Ht)
      ) {
        const et = Ht;
        setSeries((ct) => ct.map((ni) => (ni.id === Ie.id ? { ...ni, lastWatchedEpisode: et } : ni)));
      }
      (setWatchLog((et) => appendWatchLog(et, Je)),
        'currentShow' in Ie && J.lastId && (setLastChannelId(J.lastId), addToHistory(J.lastId, 'live')),
        J.aspectMode && J.aspectMode !== settings.aspectMode && setSettings((et) => ({ ...et, aspectMode: J.aspectMode })),
        J.subtitleScale &&
          Math.abs(J.subtitleScale - settings.subtitleScale) > 0.01 &&
          setSettings((et) => ({ ...et, subtitleScale: J.subtitleScale })));
    },
    playNative = (J: Channel | Movie | Series, xe?: Episode | null, Ie = 1, Ke?: Channel[], Qe = false) => {
      const Je = 'currentShow' in J,
        ot = 'seasons' in J;
      let vt: PlayItem[] = [],
        Ht = 0;
      if (Je) {
        const It = account?.type === 'xtream' ? credsOf(account) : null;
        let St = Ke && Ke.length ? Ke : channels.filter((Nt) => Nt.category === J.category);
        ((St = St.filter((Nt) => Nt.id === J.id || !isHidden('live', Nt))), St.some((Nt) => Nt.id === J.id) || (St = [J, ...St]));
        let Ut = St.findIndex((Nt) => Nt.id === J.id);
        if (St.length > MAX_PLAYLIST_ITEMS) {
          const Nt = Math.max(0, Math.min(Ut - MAX_PLAYLIST_ITEMS / 2, St.length - MAX_PLAYLIST_ITEMS));
          ((St = St.slice(Nt, Nt + MAX_PLAYLIST_ITEMS)), (Ut -= Nt));
        }
        ((vt = St.map((Nt) => ({
          id: Nt.id,
          url: Nt.streamUrl,
          title: Nt.name,
          subtitle: Nt.category,
          kind: 'live',
          number: Nt.number,
          userAgent: Nt.userAgent,
          shortEpgUrl: It && Nt.streamId && settings.epgEnabled ? shortEpgUrl(It, Nt.streamId) : void 0,
          ...catchupFields(Nt),
        }))),
          (Ht = Ut));
      } else if (ot) {
        const It = J.seasons.filter((Ut) => Ut.episodes.length > 0),
          St = xe || It.find((Ut) => Ut.seasonNum === Ie)?.episodes[0] || It[0]?.episodes[0];
        for (const Ut of It)
          for (const Nt of Ut.episodes) {
            const Vs = episodeKey(J.id, Ut.seasonNum, Nt.episodeNum);
            ((Nt === St || (St && Ut.seasonNum === Ie && Nt.episodeNum === St.episodeNum)) && (Ht = vt.length),
              vt.push({
                id: Vs,
                url: Nt.streamUrl,
                title: `${J.title} · S${Ut.seasonNum} B${Nt.episodeNum}`,
                subtitle: Nt.title && !/^Bölüm \d+$/.test(Nt.title) ? Nt.title : `Sezon ${Ut.seasonNum} · Bölüm ${Nt.episodeNum}`,
                kind: 'series',
                startPositionMs: resumePositionOf(Vs),
              }));
          }
      } else
        vt = [
          {
            id: J.id,
            url: J.streamUrl,
            title: J.title,
            subtitle: [J.year, ...(J.genres || []).slice(0, 2)].filter(Boolean).join(' · '),
            kind: 'movie',
            startPositionMs: resumePositionOf(J.id),
          },
        ];
      const et = vt[Ht];
      if ((et && Qe && (et.startPositionMs = 0), !(et != null && et.url))) {
        setToast('Bu içerik için yayın adresi bulunamadı.');
        return;
      }
      addToHistory(J.id, Je ? 'live' : ot ? 'series' : 'movie');
      const ct = Je ? settings.changePlayerLive : settings.changePlayerVOD;
      if (ct && ct !== 'exo') {
        NativePlayer.openExternal({ url: et.url, title: et.title, player: ct }).catch((It) =>
          setToast(
            `${It?.message || 'Harici oynatıcı açılamadı.'} Ayarlar > Oynatıcı bölümünden başka bir oynatıcı seçebilirsiniz.`,
          ),
        );
        return;
      }
      (setIsNativePlaying(true),
        NativePlayer.play({ items: vt, index: Ht, config: playerConfig() })
          .then((It) => applyPlayerResult(It, vt, J))
          .catch(() => setToast('Oynatıcı açılamadı. Lütfen tekrar deneyin.'))
          .finally(() => setIsNativePlaying(false)));
    },
    openWebPlayer = (J: Movie | Series | Channel, xe: Episode | null, Ie: number) => {
      ((webSessionRef.current = { media: J, startedAt: Date.now() }),
        setWebPlayerMedia(J),
        setActiveEpisode(xe),
        setActiveSeasonNum(Ie));
    },
    closeWebPlayer = () => {
      const J = webSessionRef.current;
      if (((webSessionRef.current = null), J)) {
        const xe = 'currentShow' in J.media ? 'live' : 'seasons' in J.media ? 'series' : 'movie',
          Ie = 'title' in J.media ? J.media.title : J.media.name,
          Ke: WatchLogEntry = {
            id: J.media.id,
            kind: xe,
            title: Ie,
            category: J.media.category || '',
            at: J.startedAt,
            ms: Date.now() - J.startedAt,
          };
        setWatchLog((Qe) => appendWatchLog(Qe, [Ke]));
      }
      setWebPlayerMedia(null);
    },
    playMedia = (J: Movie | Series, xe?: Episode | null, Ie = 1, Ke = false) => {
      if (isNativeApp()) {
        playNative(J, xe, Ie, void 0, Ke);
        return;
      }
      (addToHistory(J.id, 'seasons' in J ? 'series' : 'movie'), openWebPlayer(J, xe || null, Ie));
    },
    openTrailerExternal = (J: { youtubeId?: string | null; url: string }) => {
      if (!isNativeApp()) {
        window.open(J.url, '_blank', 'noopener');
        return;
      }
      NativePlayer.openTrailer({ youtubeId: J.youtubeId || void 0, url: J.url }).catch((xe) =>
        setToast(xe?.message || 'Fragman açılamadı.'),
      );
    },
    playTrailer = (J: Movie | Series) => {
      const xe = trailerInfo(J.trailer);
      if (xe) {
        if (xe.youtubeId && settings.trailerInApp !== false) {
          setTrailer({ youtubeId: xe.youtubeId, url: xe.url, title: J.title });
          return;
        }
        if (xe.youtubeId || !isNativeApp()) {
          openTrailerExternal(xe);
          return;
        }
        (setIsNativePlaying(true),
          NativePlayer.play({
            items: [{ id: `trailer:${J.id}`, url: xe.url, title: `${J.title} · Fragman`, kind: 'movie' }],
            index: 0,
            config: playerConfig(),
          })
            .catch(() => setToast('Fragman açılamadı.'))
            .finally(() => setIsNativePlaying(false)));
      }
    },
    catchupFields = (J: Channel) => {
      const xe = catchupTemplate(J, account);
      return xe ? { catchup: xe, catchupTz: account?.serverTimezone || '', archiveDays: archiveDays(J) } : {};
    },
    playCatchup = (J: Channel, xe: EpgProgramme) => {
      const Ie = catchupTemplate(J, account);
      if (!Ie) {
        setToast('Bu kanalda geriye dönük izleme yok.');
        return;
      }
      const Ke = buildCatchupUrl(Ie, account?.serverTimezone || '', xe.start, xe.stop),
        Qe = new Date(xe.start).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
        Je = `${J.name} · ${xe.title}`,
        ot = `${Qe} ${formatClock(xe.start)}–${formatClock(xe.stop)} · Arşiv`;
      if ((setLastChannelId(J.id), addToHistory(J.id, 'live'), !isNativeApp())) {
        const et = {
          id: `catchup|${J.id}|${xe.start}`,
          title: Je,
          year: 0,
          rating: '',
          duration: '',
          poster: J.logo,
          backdrop: '',
          genres: [],
          synopsis: xe.desc || '',
          cast: [],
          director: '',
          streamUrl: Ke,
          category: J.category,
          isFavorite: false,
        };
        openWebPlayer(et, null, 1);
        return;
      }
      const vt = settings.changePlayerLive;
      if (vt && vt !== 'exo') {
        NativePlayer.openExternal({ url: Ke, title: Je, player: vt }).catch((et) =>
          setToast(et?.message || 'Harici oynatıcı açılamadı.'),
        );
        return;
      }
      const Ht: PlayItem[] = [
        {
          id: `catchup|${J.id}|${xe.start}`,
          url: Ke,
          title: Je,
          subtitle: ot,
          kind: 'catchup',
          number: J.number,
          userAgent: J.userAgent,
        },
      ];
      (setIsNativePlaying(true),
        NativePlayer.play({ items: Ht, index: 0, config: playerConfig() })
          .then((et) => applyPlayerResult(et, Ht, J))
          .catch(() => setToast('Arşiv yayını açılamadı.'))
          .finally(() => setIsNativePlaying(false)));
    },
    previewChannel = (J: Channel) => {
      (addToHistory(J.id, 'live'), loadChannelEpg(J));
    },
    playChannel = (J: Channel, xe?: Channel[]) => {
      if ((setLastChannelId(J.id), isNativeApp())) {
        playNative(J, null, 1, xe);
        return;
      }
      (addToHistory(J.id, 'live'), loadChannelEpg(J), openWebPlayer(J, null, 1));
    },
    loadChannelEpg = async (J: Channel) => {
      if (isNativeApp() || !account || account.type !== 'xtream' || !J.streamId || !settings.epgEnabled) return;
      const xe = await fetchShortEpg(credsOf(account), J.streamId);
      xe &&
        (setChannels((Ie) => Ie.map((Ke) => (Ke.id === J.id ? { ...Ke, ...xe } : Ke))),
        setWebPlayerMedia((Ie) => (Ie && 'streamId' in Ie && Ie.id === J.id ? { ...Ie, ...xe } : Ie)));
    },
    autoStartedRef = useRef(false);
  useEffect(() => {
    if (
      autoStartedRef.current ||
      channels.length === 0 ||
      ((autoStartedRef.current = true), settings.startupBehavior !== 'last_channel' || !lastChannelId)
    )
      return;
    const J = channels.find((xe) => xe.id === lastChannelId);
    J && !isHidden('live', J) && setTimeout(() => playChannel(J), 600);
  }, [channels.length]);
  const handleSaveAccount = (J: XtreamAccount, xe: { channels: Channel[]; movies: Movie[]; series: Series[] }) => {
      (setAccount({ ...J, lastRefreshAt: Date.now() }),
        setChannels(xe.channels),
        setMovies(xe.movies),
        setSeries(xe.series),
        setIsAccountOpen(false));
    },
    mergeLists = (J: { channels: Channel[]; movies: Movie[]; series: Series[] }) => {
      const xe = new Set(channels.filter((Qe) => Qe.isFavorite).map((Qe) => Qe.id)),
        Ie = new Map<string, Movie>(movies.map((Qe) => [Qe.id, Qe])),
        Ke = new Map<string, Series>(series.map((Qe) => [Qe.id, Qe]));
      (setChannels(J.channels.map((Qe) => (xe.has(Qe.id) ? { ...Qe, isFavorite: true } : Qe))),
        setMovies(
          J.movies.map((Qe) => {
            const Je = Ie.get(Qe.id);
            return Je ? { ...Qe, isFavorite: Je.isFavorite, progress: Je.progress, trailer: Qe.trailer || Je.trailer } : Qe;
          }),
        ),
        setSeries(
          J.series.map((Qe) => {
            const Je = Ke.get(Qe.id);
            return Je ? { ...Qe, isFavorite: Je.isFavorite, lastWatchedEpisode: Je.lastWatchedEpisode } : Qe;
          }),
        ));
    },
    refreshLists = async (J = false) => {
      if (!account) {
        J || (setIsRefreshing(true), setTimeout(() => setIsRefreshing(false), 500));
        return;
      }
      setIsRefreshing(true);
      try {
        if (account.type === 'xtream') {
          const xe = await loadXtreamAccount(credsOf(account), settings.liveStreamFormat);
          (mergeLists(xe),
            setAccount(
              (Ie) =>
                Ie && {
                  ...Ie,
                  channelsCount: xe.channels.length,
                  moviesCount: xe.movies.length,
                  seriesCount: xe.series.length,
                  expiryDate: xe.meta.expiryDate || Ie.expiryDate,
                  maxConnections: xe.meta.maxConnections,
                  isTrial: xe.meta.isTrial,
                  serverTimezone: xe.meta.serverTimezone,
                  status: 'active',
                  lastRefreshAt: Date.now(),
                },
            ),
            J || setToast('Listeler güncellendi.'));
        } else if (account.type === 'm3u_url') {
          const xe = await fetchM3UFromUrl(account.serverUrl),
            { channelEntries: Ie, vodEntries: Ke } = classifyM3UEntries(parseM3U(xe)),
            { movieEntries: Qe, seriesList: Je } = groupSeriesFromEntries(Ke),
            ot = { channels: Ie.map(m3uEntryToChannel), movies: Qe.map(m3uEntryToMovie), series: Je };
          (mergeLists(ot),
            setAccount(
              (vt) =>
                vt && {
                  ...vt,
                  epgUrl: playlistEpgUrl(xe) || vt.epgUrl,
                  channelsCount: ot.channels.length,
                  moviesCount: ot.movies.length,
                  seriesCount: ot.series.length,
                  lastRefreshAt: Date.now(),
                },
            ),
            J || setToast('Listeler güncellendi.'));
        } else J || setToast('M3U dosyası yeniden indirilemez. Güncel bir liste için dosyayı hesap ekranından tekrar seçin.');
      } catch (xe) {
        J || setToast(xe?.message || 'Yenileme başarısız oldu.');
      } finally {
        setIsRefreshing(false);
      }
    },
    autoRefreshRef = useRef(() => {});
  ((autoRefreshRef.current = () => {
    if (!account || !listsLoaded || isRefreshing || isPlayerOpen || (account.type !== 'xtream' && account.type !== 'm3u_url'))
      return;
    const J = account.type === 'xtream' && account.serverTimezone === void 0,
      xe =
        ((account.moviesCount || 0) > 0 && movies.length === 0) ||
        ((account.seriesCount || 0) > 0 && series.length === 0) ||
        ((account.channelsCount || 0) > 0 && channels.length === 0);
    (!J && !xe && (!settings.autoRefresh || Date.now() - (account.lastRefreshAt || 0) < REFRESH_INTERVAL_MS)) ||
      refreshLists(true);
  }),
    useEffect(() => {
      const J = setTimeout(() => autoRefreshRef.current(), 3e3),
        xe = () => document.visibilityState === 'visible' && autoRefreshRef.current();
      document.addEventListener('visibilitychange', xe);
      const Ie = setInterval(() => autoRefreshRef.current(), 36e5);
      return () => {
        (clearTimeout(J), clearInterval(Ie), document.removeEventListener('visibilitychange', xe));
      };
    }, []));
  const clearHistory = () => {
      (setHistory([]),
        setWatchLog([]),
        setPositions({}),
        setLastChannelId(null),
        setMovies((J) => J.map((xe) => (xe.progress ? { ...xe, progress: 0 } : xe))),
        setSeries((J) => J.map((xe) => (xe.lastWatchedEpisode ? { ...xe, lastWatchedEpisode: void 0 } : xe))));
    },
    clearCache = async () => {
      (await clearEpg(),
        isNativeApp() && (await NativePlayer.clearCache().catch(() => {})),
        refreshEpg({ account, channels, settings, force: true }));
    },
    clearAllData = async () => {
      (await clearEpg(),
        isNativeApp() && (await NativePlayer.clearCache().catch(() => {})),
        localStorage.clear(),
        LIST_KEYS.forEach((J) => window.clearTimeout(saveTimersRef.current[J])),
        await clearStoredLists(),
        (savedListsRef.current = {}),
        setAccount(null),
        setChannels([]),
        setMovies([]),
        setSeries([]),
        setSettings(defaultSettings),
        setHistory([]),
        setWatchLog([]),
        setPositions({}),
        setLastChannelId(null),
        setParentalUnlocked(false),
        navigate('home'));
    },
    guideReturnRef = useRef<'home' | 'live'>('home'),
    openGuide = () => {
      ((guideReturnRef.current = tab === 'live' ? 'live' : 'home'), navigate('guide'));
    },
    openGuideRef = useRef(openGuide);
  openGuideRef.current = openGuide;
  const recentIds = (J: WatchHistoryEntry['type']) => history.filter((xe) => xe.type === J).map((xe) => xe.id),
    continueLists = useContinueLists(channels, movies, series, history),
    clearContinue = (J: ContinueKind) => {
      if (J === 'live') {
        setHistory((Ie) => Ie.filter((Ke) => Ke.type !== 'live'));
        return;
      }
      if (J === 'series') {
        (setSeries((Ie) => Ie.map((Ke) => (Ke.lastWatchedEpisode ? { ...Ke, lastWatchedEpisode: void 0 } : Ke))),
          setPositions((Ie) => Object.fromEntries(Object.entries(Ie).filter(([Ke]) => !/:s\d+e\d+$/.test(Ke)))),
          setHistory((Ie) => Ie.filter((Ke) => Ke.type !== 'series')));
        return;
      }
      const xe = new Set(movies.map((Ie) => Ie.id));
      (setMovies((Ie) => Ie.map((Ke) => (Ke.progress ? { ...Ke, progress: 0 } : Ke))),
        setPositions((Ie) => Object.fromEntries(Object.entries(Ie).filter(([Ke]) => !xe.has(Ke)))),
        setHistory((Ie) => Ie.filter((Ke) => Ke.type !== 'movie')));
    },
    resumeMedia = (J: Movie | Series) => {
      if (!('seasons' in J)) {
        playMedia(J);
        return;
      }
      const xe = J.lastWatchedEpisode,
        Ie = J.seasons.filter((vt) => vt.episodes.length > 0),
        Ke = xe ? Ie.findIndex((vt) => vt.seasonNum === xe.seasonNum) : -1,
        Qe = Ke >= 0 ? Ie[Ke].episodes.findIndex((vt) => vt.episodeNum === xe.episodeNum) : -1;
      if (Ke < 0 || Qe < 0) {
        openMediaDetail(J);
        return;
      }
      let Je = Ie[Ke],
        ot = Je.episodes[Qe];
      (xe.progress >= 95 &&
        (Qe + 1 < Je.episodes.length
          ? (ot = Je.episodes[Qe + 1])
          : Ke + 1 < Ie.length && ((Je = Ie[Ke + 1]), (ot = Je.episodes[0]))),
        playMedia(J, ot, Je.seasonNum));
    },
    openMediaDetail = (J: Movie | Series) => {
      (navigate('seasons' in J ? 'series' : 'movies'), selectMedia(J));
    },
    handleBack = () => {
      if (crashReport) setCrashReport(null);
      else if (pinPrompt) closePin(null);
      else if (trailer) setTrailer(null);
      else if (isCategoryEditorOpen) setIsCategoryEditorOpen(false);
      else if (webPlayerMedia) closeWebPlayer();
      else if (isAccountOpen) setIsAccountOpen(false);
      else if (legalDoc) setLegalDoc(null);
      else if (isAnalyticsOpen) setIsAnalyticsOpen(false);
      else if (selectedMedia) setSelectedMedia(null);
      else if (isSearchOpen || searchQuery) (setSearchQuery(''), setIsSearchOpen(false));
      else if (tab === 'guide' && guideReturnRef.current === 'live') navigate('live');
      else if (tab !== 'home') navigate('home');
      else return false;
      return true;
    },
    backRef = useRef(handleBack);
  (useEffect(() => {
    backRef.current = handleBack;
  }),
    useEffect(() => {
      const J = (Ie) => {
        if (Ie.key === 'Guide' || Ie.keyCode === 172) {
          (Ie.preventDefault(), openGuideRef.current());
          return;
        }
        if (!['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(Ie.key)) return;
        const Ke = Ie.target;
        (Ie.key === 'Backspace' && Ke && (Ke.tagName === 'INPUT' || Ke.tagName === 'TEXTAREA')) ||
          (backRef.current() && Ie.preventDefault());
      };
      window.addEventListener('keydown', J);
      const xe = isNativeApp()
        ? CapApp.addListener('backButton', () => {
            if (backRef.current()) return;
            // Nothing left to close: a single stray Back press must not close the app.
            const now = Date.now();
            if (now - exitArmedAtRef.current < 2500) {
              CapApp.exitApp();
              return;
            }
            exitArmedAtRef.current = now;
            setToast("Çıkmak için tekrar Geri'ye basın");
          })
        : null;
      return () => {
        (window.removeEventListener('keydown', J), xe == null || xe.then((Ie) => Ie.remove()));
      };
    }, []));
  // Crash report from the previous run (native side), offered once.
  useEffect(() => {
    if (!isNativeApp()) return;
    NativePlayer.lastCrash()
      .then((r) => r?.text && setCrashReport(r.text))
      .catch(() => {});
  }, []);
  // Typing stays instant; the (possibly huge) lists re-filter when the UI has a free moment.
  const deferredQuery = useDeferredValue(searchQuery);
  const crashDialog = crashReport ? (
    <div data-nav-layer className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" className="glass bg-surface/95 w-full max-w-lg rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white">Uygulama beklenmedik şekilde kapandı</h2>
        <p className="text-sm text-white/70">
          Son kullanımda bir sorun oluştu. Raporu geliştiriciye gönderirseniz sorun daha hızlı düzeltilir. Rapor kişisel bilgi
          içermez; yalnızca hatanın teknik nedenini ve cihaz modelini içerir.
        </p>
        <pre className="max-h-40 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] leading-snug text-white/60 whitespace-pre-wrap">
          {crashReport.slice(0, 1500)}
        </pre>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => {
              NativePlayer.shareText({ text: crashReport, title: 'Zendit Player hata raporu' }).catch(() => {});
              setCrashReport(null);
            }}
            className="tv-focus-ring flex-1 rounded-full bg-brand px-4 py-3 text-sm font-bold text-white"
          >
            Raporu paylaş
          </button>
          <button
            type="button"
            onClick={() => setCrashReport(null)}
            className="tv-focus-ring flex-1 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  ) : null;
  const hasContent = channels.length > 0 || movies.length > 0 || series.length > 0;
  if (!listsLoaded && account)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 text-white">
        <ZenditLogo size="lg" showText />
        <span className="w-8 h-8 rounded-full border-[3px] border-white/20 border-t-brand animate-spin" />
      </div>
    );
  if (!hasContent)
    return (
      <>
        {crashDialog}
        <AccountLoginModal
          variant="fullscreen"
          currentAccount={null}
          liveStreamFormat={settings.liveStreamFormat}
          onSaveAccount={handleSaveAccount}
        />
      </>
    );
  const openCategoryEditor = async () => {
    (settings.parental.enabled &&
      !parentalUnlockedRef.current &&
      !(await askPin({ mode: 'verify', title: 'Kilitli kategoriler', message: 'Düzenlemek için ebeveyn şifresini girin.' }))) ||
      setIsCategoryEditorOpen(true);
  };
  return (
    <ParentalContext.Provider value={parentalApi}>
      <div className="h-screen overflow-hidden text-[#F5F5FA] antialiased selection:bg-brand selection:text-white">
        <div className="h-full flex flex-col" style={stage.style}>
          <Header
            currentTab={tab}
            activeAccount={account}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSearchOpen={isSearchOpen}
            onToggleSearch={() => {
              (isSearchOpen && setSearchQuery(''), setIsSearchOpen(!isSearchOpen));
            }}
            onGoHome={() => navigate('home')}
            onOpenSettings={() => navigate('settings')}
            onOpenFavorites={() => navigate(tab, CATEGORY_FAVORITES)}
            onOpenHistory={() => navigate('continue')}
            onOpenAccountModal={() => setIsAccountOpen(true)}
            onRefreshData={() => refreshLists()}
            onOpenGuide={() => openGuide()}
            isRefreshing={isRefreshing}
            compact={stage.compact}
          />
          <main key={screenKey} className="flex-1 min-h-0">
            {tab === 'home' && (
              <HomeScreen
                account={account}
                device={device}
                channels={channels}
                movies={movies}
                series={series}
                history={history}
                searchQuery={deferredQuery}
                onNavigate={navigate}
                onOpenAccountModal={() => setIsAccountOpen(true)}
                onSelectMedia={openMediaDetail}
                onPlayChannel={(J) => playChannel(J)}
                onOpenContinue={(J) => navigate('continue', J)}
                compact={stage.compact}
              />
            )}
            {tab === 'continue' && (
              <ContinueScreen
                lists={continueLists}
                initialKind={(['live', 'series', 'movie'] as ContinueKind[]).find((J) => J === initialCategory)}
                onPlayChannel={playChannel}
                onResume={resumeMedia}
                onClear={clearContinue}
                compact={stage.compact}
              />
            )}
            {tab === 'guide' && (
              <GuideScreen
                channels={channels}
                account={account}
                settings={settings}
                initialCategory={initialCategory}
                searchQuery={deferredQuery}
                isPlayerOpen={isPlayerOpen || isAccountOpen || !!pinPrompt}
                onPlayChannel={playChannel}
                onPlayCatchup={playCatchup}
                compact={stage.compact}
              />
            )}
            {tab === 'live' && (
              <LiveTvScreen
                channels={channels}
                recentIds={recentIds('live')}
                initialCategory={initialCategory}
                searchQuery={deferredQuery}
                isPlayerOpen={isPlayerOpen || isAccountOpen || !!pinPrompt}
                account={account}
                device={device}
                settings={settings}
                lastPlayedChannelId={lastChannelId}
                onPlayChannel={playChannel}
                onPreviewChannel={previewChannel}
                onToggleFavorite={toggleChannelFavorite}
                onPlayCatchup={playCatchup}
                onOpenGuide={openGuide}
                compact={stage.compact}
              />
            )}
            {(tab === 'movies' || tab === 'series') && (
              <VodScreen
                type={tab}
                movies={movies}
                series={series}
                recentIds={recentIds(tab === 'movies' ? 'movie' : 'series')}
                initialCategory={initialCategory}
                searchQuery={deferredQuery}
                selectedMedia={selectedMedia}
                isDetailLoading={isDetailLoading}
                account={account}
                device={device}
                onSelectMedia={selectMedia}
                onCloseDetail={() => setSelectedMedia(null)}
                onPlay={playMedia}
                onPlayTrailer={playTrailer}
                onToggleFavorite={toggleMediaFavorite}
                compact={stage.compact}
              />
            )}
          </main>
        </div>
        {tab === 'settings' && (
          <div data-nav-layer className="app-bg fixed inset-0 z-40 overflow-y-auto">
            <SettingsScreen
              settings={settings}
              account={account}
              deviceIds={device}
              isRefreshing={isRefreshing}
              onUpdateSettings={setSettings}
              onRefreshLists={() => refreshLists()}
              onRefreshEpg={refreshGuide}
              onClearHistory={clearHistory}
              onClearCache={clearCache}
              onClearData={clearAllData}
              onOpenAccount={() => setIsAccountOpen(true)}
              onOpenAnalytics={() => setIsAnalyticsOpen(true)}
              onBack={() => navigate('home')}
              parentalUnlocked={parentalUnlocked}
              parentalCategories={parentalCategories}
              onAskPin={askPin}
              onParentalUnlockedChange={setParentalUnlocked}
              onOpenParentalCategories={openCategoryEditor}
              onOpenLegal={setLegalDoc}
            />
          </div>
        )}
        {crashDialog}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] bg-surface border border-white/10 text-amber-300 text-xs tv:text-[1.1rem] font-medium px-4 py-2.5 rounded-xl shadow-lg">
            {toast}
          </div>
        )}
        {webPlayerMedia && (
          <div data-nav-layer>
            <Suspense fallback={null}>
              <VideoPlayerModal
                media={webPlayerMedia}
                activeEpisode={activeEpisode}
                activeSeasonNum={activeSeasonNum}
                settings={settings}
                onClose={closeWebPlayer}
                onSelectEpisode={(J, xe) => {
                  (setActiveSeasonNum(J), setActiveEpisode(xe));
                }}
              />
            </Suspense>
          </div>
        )}
        {isAccountOpen && (
          <div data-nav-layer>
            <AccountLoginModal
              currentAccount={account}
              liveStreamFormat={settings.liveStreamFormat}
              onSaveAccount={handleSaveAccount}
              onClose={() => setIsAccountOpen(false)}
            />
          </div>
        )}
        {isAnalyticsOpen && (
          <div data-nav-layer className="app-bg fixed inset-0 z-50 overflow-y-auto">
            <AnalyticsScreen
              log={watchLog}
              account={account}
              channels={channels}
              movies={movies}
              series={series}
              onResetHistory={clearHistory}
              onBack={() => setIsAnalyticsOpen(false)}
            />
          </div>
        )}
        {legalDoc && (
          <div data-nav-layer className="app-bg fixed inset-0 z-50 overflow-y-auto">
            <LegalScreen doc={legalDoc} onBack={() => setLegalDoc(null)} onOpen={setLegalDoc} />
          </div>
        )}
        {isCategoryEditorOpen && (
          <ParentalCategoryEditor
            config={settings.parental}
            categories={parentalCategories}
            onChange={(J) => setSettings((xe) => ({ ...xe, parental: { ...xe.parental, overrides: J } }))}
            onClose={() => setIsCategoryEditorOpen(false)}
          />
        )}
        {trailer && (
          <TrailerPlayer
            youtubeId={trailer.youtubeId}
            title={trailer.title}
            onClose={() => setTrailer(null)}
            onOpenExternal={(J) => {
              const xe = trailer;
              (setTrailer(null), J && setToast(J), openTrailerExternal(xe));
            }}
          />
        )}
        {pinPrompt && (
          <div key={pinPrompt.id}>
            <PinDialog
              mode={pinPrompt.mode}
              title={pinPrompt.title}
              message={pinPrompt.message}
              verify={(J) => checkPin(settings.parental, J)}
              onDone={(J) => closePin(J)}
              onCancel={() => closePin(null)}
            />
          </div>
        )}
      </div>
    </ParentalContext.Provider>
  );
}
