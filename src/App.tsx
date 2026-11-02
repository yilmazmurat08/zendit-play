import { useState, useEffect, useRef } from 'react';
import { TabType, Movie, Series, Channel, Episode, XtreamAccount, WatchStats, AppSettings, WatchHistoryEntry } from './types';
import { demoChannels, demoMovies, demoSeries, initialWatchStats, defaultSettings } from './data/mockData';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LiveTvScreen } from './components/LiveTvScreen';
import { VodScreen } from './components/VodScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { CATEGORY_FAVORITES, CATEGORY_RECENT, getDeviceInfo, useSpatialNavigation, useTvStage } from './lib/tv';
import { AccountLoginModal } from './components/AccountLoginModal';
import { App as CapacitorApp } from '@capacitor/app';
import { isNativeApp, NativePlayer } from './lib/nativePlayer';
import { fetchSeriesDetail, fetchShortEpg, fetchVodDetail, loadXtreamAccount, type XtreamCredentials } from './lib/xtreamApi';
import { classifyM3UEntries, fetchM3UFromUrl, groupSeriesFromEntries, m3uEntryToChannel, m3uEntryToMovie, parseM3U } from './lib/m3uParser';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full (very large playlists): keep working with the data in memory instead of crashing.
  }
}

function accountCreds(account: XtreamAccount): XtreamCredentials {
  return { serverUrl: account.serverUrl, username: account.username, password: account.password || '' };
}

export default function App() {
  const [activeAccount, setActiveAccount] = useState<XtreamAccount | null>(() => readLocal('zendit_active_account', null));
  const [channels, setChannels] = useState<Channel[]>(() => readLocal('zendit_channels', []));
  const [movies, setMovies] = useState<Movie[]>(() => readLocal('zendit_movies', []));
  const [series, setSeries] = useState<Series[]>(() => readLocal('zendit_series', []));
  const [stats, setStats] = useState<WatchStats>(() => readLocal('zendit_watch_stats', initialWatchStats));
  const [settings, setSettings] = useState<AppSettings>(() => readLocal('zendit_settings', defaultSettings));

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const savedSettings = readLocal<AppSettings | null>('zendit_settings', null);
    return savedSettings?.startupBehavior === 'last_channel' ? 'live' : 'home';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<Movie | Series | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activePlayingMedia, setActivePlayingMedia] = useState<Movie | Series | Channel | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(1);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isNativePlayerOpen, setIsNativePlayerOpen] = useState(false);
  const [history, setHistory] = useState<WatchHistoryEntry[]>(() => readLocal('zendit_history', []));
  const [navKey, setNavKey] = useState(0);
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);
  const [device] = useState(getDeviceInfo);
  const focusBeforePlayerRef = useRef<HTMLElement | null>(null);
  const isPlayerOpen = Boolean(activePlayingMedia) || isNativePlayerOpen;
  const tvStage = useTvStage();

  useSpatialNavigation();

  // Return D-pad focus to where it was (channel row, "Hemen İzle" ...) when the fullscreen player closes.
  useEffect(() => {
    if (isPlayerOpen) {
      focusBeforePlayerRef.current = document.activeElement as HTMLElement | null;
    } else if (focusBeforePlayerRef.current?.isConnected) {
      focusBeforePlayerRef.current.focus();
      focusBeforePlayerRef.current = null;
    }
  }, [isPlayerOpen]);

  useEffect(() => {
    writeLocal('zendit_history', history);
  }, [history]);

  const recordHistory = (id: string, type: WatchHistoryEntry['type']) => {
    setHistory((prev) => [{ id, type, at: Date.now() }, ...prev.filter((h) => !(h.id === id && h.type === type))].slice(0, 40));
  };

  const navigate = (tab: TabType, category?: string) => {
    setCurrentTab(tab);
    setInitialCategory(category);
    setNavKey((k) => k + 1);
    setSelectedMedia(null);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  useEffect(() => {
    writeLocal('zendit_active_account', activeAccount);
  }, [activeAccount]);
  useEffect(() => {
    writeLocal('zendit_channels', channels);
  }, [channels]);
  useEffect(() => {
    writeLocal('zendit_movies', movies);
  }, [movies]);
  useEffect(() => {
    writeLocal('zendit_series', series);
  }, [series]);
  useEffect(() => {
    writeLocal('zendit_watch_stats', stats);
  }, [stats]);
  useEffect(() => {
    writeLocal('zendit_settings', settings);
  }, [settings]);

  useEffect(() => {
    if (!refreshNotice) return;
    const t = setTimeout(() => setRefreshNotice(null), 5000);
    return () => clearTimeout(t);
  }, [refreshNotice]);

  const handleToggleFavoriteChannel = (id: string) => {
    setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, isFavorite: !ch.isFavorite } : ch)));
  };

  const handleToggleFavoriteMedia = (id: string, type: 'movie' | 'series') => {
    if (type === 'movie') {
      setMovies((prev) => prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)));
    } else {
      setSeries((prev) => prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)));
    }
    setSelectedMedia((prev) => (prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev));
  };

  const handleSelectMedia = async (item: Movie | Series) => {
    setSelectedMedia(item);
    if (!activeAccount || activeAccount.type !== 'xtream') return;

    const isSeriesItem = 'seasons' in item;
    const needsDetail = isSeriesItem ? (item as Series).seasons.length === 0 : !(item as Movie).synopsis;
    if (!needsDetail) return;

    setIsDetailLoading(true);
    try {
      const creds = accountCreds(activeAccount);
      if (isSeriesItem) {
        const detail = await fetchSeriesDetail(creds, item as Series);
        setSeries((prev) => prev.map((s) => (s.id === item.id ? { ...s, ...detail } : s)));
        setSelectedMedia((prev) => (prev && prev.id === item.id ? ({ ...prev, ...detail } as Series) : prev));
      } else {
        const detail = await fetchVodDetail(creds, item as Movie);
        setMovies((prev) => prev.map((m) => (m.id === item.id ? { ...m, ...detail } : m)));
        setSelectedMedia((prev) => (prev && prev.id === item.id ? ({ ...prev, ...detail } as Movie) : prev));
      }
    } catch {
      // best-effort enrichment - list-level data already shown stays as-is
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Android app: play with the native ExoPlayer screen, or hand the stream to the chosen external player app.
  const playNatively = (media: Movie | Series | Channel, episode?: Episode | null, seasonNum: number = 1) => {
    const isChannel = 'currentShow' in media;
    const isSeriesItem = 'seasons' in media;
    const ep = isSeriesItem ? episode || media.seasons[0]?.episodes[0] : null;
    const url = isSeriesItem ? ep?.streamUrl : media.streamUrl;
    if (!url) {
      setRefreshNotice('Bu içerik için yayın adresi bulunamadı.');
      return;
    }
    const title = isChannel ? media.name : isSeriesItem && ep ? `${media.title} - S${seasonNum}E${ep.episodeNum}` : media.title;
    handleMediaWatched(media.id, isChannel ? 'live' : isSeriesItem ? 'series' : 'movie');

    if (settings.playerEngine === 'intent') {
      NativePlayer.openExternal({ url, title }).catch(() =>
        setRefreshNotice('Harici oynatıcı açılamadı. Cihazda VLC veya MX Player gibi bir video oynatıcı yüklü olmalı.')
      );
      return;
    }
    setIsNativePlayerOpen(true);
    NativePlayer.play({ url, title, live: isChannel })
      .catch(() => setRefreshNotice('Oynatıcı açılamadı. Lütfen tekrar deneyin.'))
      .finally(() => setIsNativePlayerOpen(false));
  };

  const handlePlayFromDetail = (media: Movie | Series, episode?: Episode, seasonNum: number = 1) => {
    recordHistory(media.id, 'seasons' in media ? 'series' : 'movie');
    if (isNativeApp()) {
      playNatively(media, episode, seasonNum);
      return;
    }
    setActivePlayingMedia(media);
    setActiveEpisode(episode || null);
    setActiveSeasonNum(seasonNum);
  };

  const handlePreviewChannel = (channel: Channel) => {
    recordHistory(channel.id, 'live');
    loadChannelEpg(channel);
  };

  const handlePlayChannel = (channel: Channel) => {
    recordHistory(channel.id, 'live');
    loadChannelEpg(channel);
    if (isNativeApp()) {
      playNatively(channel);
      return;
    }
    setActivePlayingMedia(channel);
    setActiveEpisode(null);
  };

  const loadChannelEpg = async (channel: Channel) => {
    if (!activeAccount || activeAccount.type !== 'xtream' || !channel.streamId || !settings.epgEnabled) return;
    const epg = await fetchShortEpg(accountCreds(activeAccount), channel.streamId);
    if (!epg) return;
    setChannels((prev) => prev.map((c) => (c.id === channel.id ? { ...c, ...epg } : c)));
    setActivePlayingMedia((prev) => (prev && 'streamId' in prev && prev.id === channel.id ? { ...prev, ...epg } : prev));
  };

  const handleMediaWatched = (id: string, type: 'movie' | 'series' | 'live') => {
    setStats((prev) => {
      const nextTotal = prev.total + 1;
      const nextMovies = type === 'movie' ? prev.movies + 1 : prev.movies;
      const nextSeries = type === 'series' ? prev.series + 1 : prev.series;
      const nextLive = type === 'live' ? prev.liveTv + 1 : prev.liveTv;
      const mPct = Math.round((nextMovies / nextTotal) * 100);
      const sPct = Math.round((nextSeries / nextTotal) * 100);
      const lPct = 100 - mPct - sPct;
      return { ...prev, total: nextTotal, movies: nextMovies, series: nextSeries, liveTv: nextLive, moviesPercentage: mPct, seriesPercentage: sPct, livePercentage: lPct };
    });
  };

  const handleSaveAccount = (account: XtreamAccount, data: { channels: Channel[]; movies: Movie[]; series: Series[] }) => {
    setActiveAccount(account);
    setChannels(data.channels);
    setMovies(data.movies);
    setSeries(data.series);
    setIsAccountModalOpen(false);
  };

  const handleUseDemo = () => {
    setActiveAccount({
      id: 'demo',
      name: 'Demo İçerik',
      serverUrl: '',
      username: '',
      type: 'demo',
      isActive: true,
      status: 'active',
      channelsCount: demoChannels.length,
      moviesCount: demoMovies.length,
      seriesCount: demoSeries.length,
    });
    setChannels(demoChannels);
    setMovies(demoMovies);
    setSeries(demoSeries);
    setIsAccountModalOpen(false);
  };

  const handleRefreshData = async () => {
    if (!activeAccount || activeAccount.type === 'demo') {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
      return;
    }
    setIsRefreshing(true);
    try {
      if (activeAccount.type === 'xtream') {
        const result = await loadXtreamAccount(accountCreds(activeAccount), settings.liveStreamFormat);
        setChannels(result.channels);
        setMovies(result.movies);
        setSeries(result.series);
        setActiveAccount((prev) =>
          prev ? { ...prev, channelsCount: result.channels.length, moviesCount: result.movies.length, seriesCount: result.series.length, status: 'active' } : prev
        );
      } else if (activeAccount.type === 'm3u_url') {
        const text = await fetchM3UFromUrl(activeAccount.serverUrl);
        const { channelEntries, vodEntries } = classifyM3UEntries(parseM3U(text));
        const { movieEntries, seriesList } = groupSeriesFromEntries(vodEntries);
        setChannels(channelEntries.map(m3uEntryToChannel));
        setMovies(movieEntries.map(m3uEntryToMovie));
        setSeries(seriesList);
      } else {
        setRefreshNotice('M3U dosyası yeniden indirilemez. Güncel bir liste için dosyayı hesap ekranından tekrar seçin.');
      }
    } catch (err: any) {
      setRefreshNotice(err?.message || 'Yenileme başarısız oldu.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!settings.autoRefresh || !activeAccount || activeAccount.type !== 'xtream') return;
    const id = setInterval(() => handleRefreshData(), 30 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoRefresh, activeAccount?.id, activeAccount?.type]);

  const handleResetHistory = () => setStats(initialWatchStats);

  useEffect(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('zendit_')) continue;
        totalBytes += new Blob([key + (localStorage.getItem(key) || '')]).size;
      }
      const mb = totalBytes / (1024 * 1024);
      setStats((prev) => (Math.abs(prev.cacheSizeMB - mb) > 0.005 ? { ...prev, cacheSizeMB: mb } : prev));
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }, [channels, movies, series, activeAccount]);

  const handleClearAllData = () => {
    localStorage.clear();
    setActiveAccount(null);
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setStats(initialWatchStats);
    setSettings(defaultSettings);
    setHistory([]);
  };

  const recentIdsFor = (type: WatchHistoryEntry['type']) => history.filter((h) => h.type === type).map((h) => h.id);

  const openHistory = () => {
    const last = history[0];
    navigate(last?.type === 'series' ? 'series' : last?.type === 'movie' ? 'movies' : 'live', CATEGORY_RECENT);
  };

  const handleSelectFromHome = (item: Movie | Series) => {
    navigate('seasons' in item ? 'series' : 'movies');
    handleSelectMedia(item);
  };

  // TV remote "Back", Android back button and keyboard Escape: close the top-most layer,
  // otherwise go back to the home screen. Returns false when there is nothing left to close.
  const handleBack = (): boolean => {
    if (activePlayingMedia) setActivePlayingMedia(null);
    else if (isAccountModalOpen) setIsAccountModalOpen(false);
    else if (isAnalyticsOpen) setIsAnalyticsOpen(false);
    else if (selectedMedia) setSelectedMedia(null);
    else if (isSearchOpen || searchQuery) {
      setSearchQuery('');
      setIsSearchOpen(false);
    } else if (currentTab !== 'home') navigate('home');
    else return false;
    return true;
  };
  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(e.key)) return;
      const target = e.target as HTMLElement | null;
      if (e.key === 'Backspace' && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (handleBackRef.current()) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    // Android: without this listener Capacitor would close the app on every Back press.
    // On the home screen (nothing left to close) Back still exits, as TV users expect.
    const backButton = isNativeApp()
      ? CapacitorApp.addListener('backButton', () => {
          if (!handleBackRef.current()) CapacitorApp.exitApp();
        })
      : null;
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      backButton?.then((handle) => handle.remove());
    };
  }, []);

  const hasContent = channels.length > 0 || movies.length > 0 || series.length > 0;

  if (!hasContent) {
    return (
      <AccountLoginModal
        variant="fullscreen"
        currentAccount={null}
        liveStreamFormat={settings.liveStreamFormat}
        onSaveAccount={handleSaveAccount}
        onUseDemoContent={handleUseDemo}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden text-[#F5F5FA] antialiased selection:bg-brand selection:text-white">
      <div className="h-full flex flex-col" style={tvStage.style}>
        <Header
          currentTab={currentTab}
          activeAccount={activeAccount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => {
            if (isSearchOpen) setSearchQuery('');
            setIsSearchOpen(!isSearchOpen);
          }}
          onGoHome={() => navigate('home')}
          onOpenSettings={() => navigate('settings')}
          onOpenFavorites={() => navigate(currentTab, CATEGORY_FAVORITES)}
          onOpenHistory={openHistory}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          onRefreshData={handleRefreshData}
          isRefreshing={isRefreshing}
          compact={tvStage.compact}
        />

        <main key={navKey} className="flex-1 min-h-0">
          {currentTab === 'home' && (
            <HomeScreen
              account={activeAccount}
              device={device}
              channels={channels}
              movies={movies}
              series={series}
              history={history}
              searchQuery={searchQuery}
              onNavigate={navigate}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onSelectMedia={handleSelectFromHome}
              onPlayChannel={handlePlayChannel}
              compact={tvStage.compact}
            />
          )}
          {currentTab === 'live' && (
            <LiveTvScreen
              channels={channels}
              recentIds={recentIdsFor('live')}
              initialCategory={initialCategory}
              searchQuery={searchQuery}
              isPlayerOpen={isPlayerOpen || isAccountModalOpen}
              account={activeAccount}
              device={device}
              onPlayChannel={handlePlayChannel}
              onPreviewChannel={handlePreviewChannel}
              onToggleFavorite={handleToggleFavoriteChannel}
              compact={tvStage.compact}
            />
          )}
          {(currentTab === 'movies' || currentTab === 'series') && (
            <VodScreen
              type={currentTab}
              movies={movies}
              series={series}
              recentIds={recentIdsFor(currentTab === 'movies' ? 'movie' : 'series')}
              initialCategory={initialCategory}
              searchQuery={searchQuery}
              selectedMedia={selectedMedia}
              isDetailLoading={isDetailLoading}
              account={activeAccount}
              device={device}
              onSelectMedia={handleSelectMedia}
              onCloseDetail={() => setSelectedMedia(null)}
              onPlay={handlePlayFromDetail}
              onToggleFavorite={handleToggleFavoriteMedia}
            />
          )}
        </main>
      </div>

      {/* Settings / dialogs live outside the scaled TV stage so they keep their normal size. */}
      {currentTab === 'settings' && (
        <div data-nav-layer className="app-bg fixed inset-0 z-40 overflow-y-auto">
          <SettingsScreen
            settings={settings}
            onUpdateSettings={setSettings}
            onClearData={handleClearAllData}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onBack={() => navigate('home')}
          />
        </div>
      )}

      {refreshNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] bg-surface border border-white/10 text-amber-300 text-xs tv:text-[1.1rem] font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {refreshNotice}
        </div>
      )}

      {activePlayingMedia && (
        <div data-nav-layer>
          <VideoPlayerModal
            media={activePlayingMedia}
            activeEpisode={activeEpisode}
            activeSeasonNum={activeSeasonNum}
            settings={settings}
            onClose={() => setActivePlayingMedia(null)}
            onSelectEpisode={(sNum, ep) => {
              setActiveSeasonNum(sNum);
              setActiveEpisode(ep);
            }}
            onMediaWatched={handleMediaWatched}
          />
        </div>
      )}

      {isAccountModalOpen && (
        <div data-nav-layer>
          <AccountLoginModal
            currentAccount={activeAccount}
            liveStreamFormat={settings.liveStreamFormat}
            onSaveAccount={handleSaveAccount}
            onUseDemoContent={handleUseDemo}
            onClose={() => setIsAccountModalOpen(false)}
          />
        </div>
      )}

      {isAnalyticsOpen && (
        <div data-nav-layer className="app-bg fixed inset-0 z-50 overflow-y-auto">
          <AnalyticsScreen stats={stats} account={activeAccount} onResetHistory={handleResetHistory} onBack={() => setIsAnalyticsOpen(false)} />
        </div>
      )}
    </div>
  );
}
