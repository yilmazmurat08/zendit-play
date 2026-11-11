import { useEffect, useMemo, useState } from 'react';
import { AppSettings, Channel, XtreamAccount } from '../types';
import { CalendarClock, CalendarDays, Heart, History, Loader2, Lock, RotateCcw, Tv } from 'lucide-react';
import { useVirtualList } from '../lib/useVirtualList';
import { CATEGORY_ADDED, CATEGORY_FAVORITES, CATEGORY_RECENT, DeviceInfo, useIsTv } from '../lib/tv';
import { foldQuery, matchesQuery } from '../lib/search';
import { useParental } from '../lib/parental';
import { archiveDays, canCatchup } from '../lib/catchup';
import {
  currentProgramme,
  EpgProgramme,
  formatClock,
  programmeProgress,
  useChannelProgrammes,
  useEpgStatus,
  useGuideProgrammes,
  useProgrammes,
} from '../lib/epg';
import { CategoryItem, CategoryPanel, Footer, LegendKey, PosterImage } from './TvUi';
import { LivePreview } from './LivePreview';

interface LiveTvScreenProps {
  channels: Channel[];
  recentIds: string[];
  initialCategory?: string;
  searchQuery?: string;
  isPlayerOpen: boolean;
  account: XtreamAccount | null;
  device: DeviceInfo;
  settings: AppSettings;
  /** Channel watched last: preselected (preview) when the screen opens. */
  lastPlayedChannelId?: string | null;
  /** Fullscreen; `list` is the list the player zaps through (the current category). */
  onPlayChannel: (channel: Channel, list: Channel[]) => void;
  onPreviewChannel: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
  onPlayCatchup: (channel: Channel, programme: EpgProgramme) => void;
  onOpenGuide: () => void;
  /** Narrow landscape stage (phone held sideways): wider channel column. */
  compact?: boolean;
}

const ALL_CHANNELS = 'Tüm Kanallar';

// TV remote color keys (Android TV / HbbTV key names and key codes).
const COLOR_KEYS: Record<string, 'red' | 'green' | 'yellow' | 'blue'> = {
  ColorF0Red: 'red',
  ColorF1Green: 'green',
  ColorF2Yellow: 'yellow',
  ColorF3Blue: 'blue',
  '403': 'red',
  '404': 'green',
  '405': 'yellow',
  '406': 'blue',
};

/** Channel name with the current programme and its progress bar. */
function ChannelText({ name, programme, active }: { name: string; programme: EpgProgramme | null; active: boolean }) {
  return (
    <span className="flex-1 min-w-0 flex flex-col justify-center">
      <span className="text-sm tv:text-[1.3rem] font-semibold truncate leading-tight">{name}</span>
      {programme && (
        <>
          <span
            className={`text-[11px] tv:text-[0.95rem] truncate leading-tight mt-0.5 tv:mt-[0.15rem] group-hover:text-white/90 group-focus-visible:text-white/90 ${
              active ? 'text-white/85' : 'text-white/55'
            }`}
          >
            {programme.title}
          </span>
          <span className="mt-1 tv:mt-[0.3rem] h-[2px] tv:h-[0.2rem] rounded-full bg-white/15 group-hover:bg-white/30 group-focus-visible:bg-white/30 overflow-hidden">
            <span
              className="block h-full bg-brand group-hover:bg-white group-focus-visible:bg-white"
              style={{ width: `${programmeProgress(programme)}%` }}
            />
          </span>
        </>
      )}
    </span>
  );
}

export function LiveTvScreen({
  channels,
  recentIds,
  initialCategory,
  searchQuery = '',
  isPlayerOpen,
  account,
  settings,
  lastPlayedChannelId,
  onPlayChannel,
  onPreviewChannel,
  onToggleFavorite,
  onPlayCatchup,
  onOpenGuide,
  compact = false,
}: LiveTvScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || ALL_CHANNELS);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'number' | 'name'>('number');
  const [showCategories, setShowCategories] = useState(true);
  const isTv = useIsTv();
  const parental = useParental();

  /** Locked adult channel: ask for the PIN first. */
  const guarded = (channel: Channel, action: () => void) => {
    if (parental.hidden('live', channel)) parental.unlock().then((ok) => ok && action());
    else action();
  };

  const categories = useMemo<CategoryItem[]>(() => {
    const counts = new Map<string, number>();
    channels.forEach((ch) => {
      const cat = ch.category?.trim();
      if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    const names = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    return [
      { name: CATEGORY_RECENT },
      { name: CATEGORY_ADDED },
      { name: CATEGORY_FAVORITES },
      { name: ALL_CHANNELS, count: channels.length },
      ...names.map((name) => ({ name, count: counts.get(name) || 0, locked: parental.categoryRestricted('live', name) })),
    ];
  }, [channels, parental.config]);

  const selectCategory = (name: string) => {
    const locked = categories.find((c) => c.name === name && c.locked);
    if (locked && parental.locked) parental.unlock().then((ok) => ok && setSelectedCategory(name));
    else setSelectedCategory(name);
  };

  const filtered = useMemo(() => {
    let list: Channel[];
    if (selectedCategory === CATEGORY_RECENT) {
      const byId = new Map(channels.map((ch) => [ch.id, ch]));
      list = recentIds.map((id) => byId.get(id)).filter((ch): ch is Channel => !!ch);
    } else if (selectedCategory === CATEGORY_ADDED) {
      list = channels.slice(-60).reverse();
    } else if (selectedCategory === CATEGORY_FAVORITES) {
      list = channels.filter((ch) => ch.isFavorite);
    } else if (selectedCategory === ALL_CHANNELS) {
      list = channels;
    } else {
      list = channels.filter((ch) => ch.category?.trim() === selectedCategory);
    }
    const q = foldQuery(searchQuery);
    if (q) list = list.filter((ch) => matchesQuery(q, ch.name, ch.currentShow, ch.category));
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return list;
  }, [channels, recentIds, selectedCategory, searchQuery, sortMode]);

  const preview = useMemo(() => {
    const ch = channels.find((c) => c.id === previewId) || null;
    return ch && !parental.hidden('live', ch) ? ch : null;
  }, [channels, previewId, parental.locked, parental.config]);

  const programmes = useChannelProgrammes(preview, account, settings, 8);
  const epg = useEpgStatus();

  // Coming back from the player: keep the channel that was watched selected.
  useEffect(() => {
    const last = lastPlayedChannelId ? channels.find((c) => c.id === lastPlayedChannelId) : undefined;
    if (last && !parental.hidden('live', last)) setPreviewId(last.id);
  }, [lastPlayedChannelId]);

  const rowHeight = isTv ? 73 : 64;
  const { containerRef, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(filtered.length, rowHeight, 6);
  const visible = filtered.slice(startIndex, endIndex);
  const { items: rowProgrammes } = useProgrammes(settings.epgEnabled ? visible.map((c) => c.id) : [], 2);

  const openFullscreen = (ch: Channel) => onPlayChannel(ch, filtered.some((c) => c.id === ch.id) ? filtered : channels);

  /** First tap previews, a second tap on the same channel opens fullscreen. */
  const handleChannelClick = (ch: Channel) =>
    guarded(ch, () => {
      if (ch.id === previewId) {
        openFullscreen(ch);
        return;
      }
      setPreviewId(ch.id);
      onPreviewChannel(ch);
    });

  /** Color keys act on the focused row (TV remote), otherwise on the previewed channel. */
  const targetChannel = () => {
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.channelId;
    return (focusedId && channels.find((c) => c.id === focusedId)) || preview;
  };

  const handleColorKey = (color: 'red' | 'green' | 'yellow' | 'blue') => {
    if (color === 'red') {
      const ch = targetChannel();
      if (ch) guarded(ch, () => openFullscreen(ch));
    } else if (color === 'green') {
      const ch = targetChannel();
      if (ch) onToggleFavorite(ch.id);
    } else if (color === 'yellow') {
      setShowCategories((v) => !v);
    } else {
      setSortMode((m) => (m === 'number' ? 'name' : 'number'));
    }
  };

  useEffect(() => {
    if (isPlayerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const color = COLOR_KEYS[e.key] || COLOR_KEYS[String(e.keyCode)];
      if (color) {
        e.preventDefault();
        handleColorKey(color);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const now = Date.now();
  const current = currentProgramme(programmes, now);
  const hasArchive = preview ? archiveDays(preview) > 0 : false;
  // Past programmes of the last 8 hours (in 10-minute steps, so the query stays stable).
  const step = 600_000;
  const archiveFrom = Math.floor((now - 8 * 3_600_000) / step) * step;
  const archiveTo = Math.floor(now / step) * step + step;
  const archiveItems = useGuideProgrammes(hasArchive && preview ? [preview] : [], archiveFrom, archiveTo, account, settings);
  const missed = preview
    ? (archiveItems[preview.id] || [])
        .filter((p) => p.stop <= now && canCatchup(preview, account, p.start, now))
        .slice(-5)
        .reverse()
    : [];
  const canRestart = !!(preview && current && canCatchup(preview, account, current.start, now));
  const restartButton = (size: 'tv' | 'sm') =>
    canRestart && preview && current ? (
      <button
        type="button"
        onClick={() => onPlayCatchup(preview, current)}
        className={`tv-focus inline-flex items-center gap-1.5 rounded-full bg-white/[0.1] font-bold ${
          size === 'tv' ? 'mt-[0.8rem] px-[1rem] py-[0.45rem] text-[0.95rem] gap-[0.45rem]' : 'mt-2 px-3 py-1 text-[11px]'
        }`}
      >
        <RotateCcw className={size === 'tv' ? 'w-[1rem] h-[1rem]' : 'w-3 h-3'} /> Baştan izle
      </button>
    ) : null;
  const upcoming = programmes.filter((p) => p !== current).slice(0, 6);
  const emptyText = preview
    ? settings.epgEnabled
      ? epg.state === 'loading'
        ? 'Yayın akışı indiriliyor…'
        : 'Bu kanal için yayın akışı bilgisi yok.'
      : 'EPG kapalı. Ayarlar > Canlı TV ve EPG bölümünden açabilirsiniz.'
    : 'Kanal seçildiğinde yayın akışı burada görünür.';

  return (
    <div id="zendit-live-tv-screen" className="h-full flex flex-col">
      <div
        className={`flex-1 min-h-0 flex flex-col gap-3 px-4 tv:grid tv:gap-[1.5rem] ${compact ? 'tv:px-[2.5rem]' : 'tv:px-[5rem]'} ${
          showCategories
            ? compact
              ? 'tv:grid-cols-[22fr_38fr_40fr]'
              : 'tv:grid-cols-[24fr_28fr_48fr]'
            : compact
              ? 'tv:grid-cols-[45fr_55fr]'
              : 'tv:grid-cols-[34fr_66fr]'
        }`}
      >
        {showCategories && (
          <CategoryPanel items={categories} selected={selectedCategory} onSelect={selectCategory} unlocked={!parental.locked} />
        )}

        {/* Channel list (virtualized) */}
        <div className="glass flex-1 tv:flex-none min-h-[16rem] tv:min-h-0 rounded-2xl tv:rounded-[2rem] p-2 tv:p-[0.9rem] flex flex-col">
          <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/55 px-6 py-10">
                <Tv className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
                <p className="text-sm tv:text-[1.15rem]">
                  {channels.length === 0 ? 'Henüz kanal listesi yok.' : 'Bu kategoride veya aramada kanal bulunamadı.'}
                </p>
              </div>
            ) : (
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
                  {visible.map((ch, i) => {
                    const isActive = ch.id === previewId;
                    const locked = parental.hidden('live', ch);
                    return (
                      <div key={ch.id} style={{ height: rowHeight }} className="py-[3px] tv:py-[0.3rem]">
                        <button
                          type="button"
                          data-channel-id={ch.id}
                          onClick={() => handleChannelClick(ch)}
                          className={`tv-focus group w-full h-full flex items-center gap-3 tv:gap-[1rem] rounded-xl tv:rounded-[1rem] px-3 tv:px-[1rem] text-left ${
                            isActive ? 'bg-brand/35 text-white' : 'text-white'
                          }`}
                        >
                          <span className="w-7 tv:w-[2.4rem] shrink-0 text-sm tv:text-[1.25rem] font-bold tabular-nums">
                            {String(ch.number || startIndex + i + 1).padStart(2, '0')}
                          </span>
                          <span className="w-9 h-9 tv:w-[2.8rem] tv:h-[2.8rem] shrink-0 rounded-lg tv:rounded-[0.6rem] overflow-hidden bg-white/10">
                            <PosterImage src={ch.logo} locked={locked} small />
                          </span>
                          <ChannelText name={ch.name} programme={locked ? null : currentProgramme(rowProgrammes[ch.id], now)} active={isActive} />
                          {archiveDays(ch) > 0 && !locked && (
                            <History aria-label="Geriye dönük izlenebilir" className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem] shrink-0 text-[#3CC8FF]" />
                          )}
                          {locked && <Lock aria-label="Kilitli" className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem] shrink-0 text-brand" />}
                          {ch.isFavorite && <Heart className="w-3.5 h-3.5 tv:w-[1.2rem] tv:h-[1.2rem] shrink-0" fill="currentColor" />}
                          {isActive && <span className="w-1.5 h-1.5 tv:w-[0.5rem] tv:h-[0.5rem] shrink-0 rounded-full bg-white" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview + programme guide */}
        <div className="order-first tv:order-none min-h-0 flex flex-col gap-3 tv:gap-[1.5rem]">
          <LivePreview channel={preview} active={!isPlayerOpen} onOpenFullscreen={() => preview && openFullscreen(preview)} />

          {preview && (
            <div className="glass tv:hidden rounded-2xl px-4 py-3">
              {current ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-bold truncate">{current.title}</span>
                    <span className="text-xs font-semibold text-white/65 tabular-nums shrink-0">
                      {formatClock(current.start)} - {formatClock(current.stop)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${programmeProgress(current, now)}%` }} />
                  </div>
                  {upcoming[0] && (
                    <div className="mt-2 text-xs text-white/65 truncate">
                      Sonra · <span className="tabular-nums">{formatClock(upcoming[0].start)}</span> {upcoming[0].title}
                    </div>
                  )}
                  {restartButton('sm')}
                </>
              ) : (
                <p className="text-xs font-semibold text-white/70">{emptyText}</p>
              )}
            </div>
          )}

          <div className="glass hidden tv:flex tv:flex-col flex-1 min-h-0 rounded-[1.75rem] p-[1.6rem] overflow-y-auto no-scrollbar">
            {preview && (
              <div className="flex items-center gap-[1rem] mb-[1.25rem]">
                <span className="w-[3.25rem] h-[3.25rem] rounded-[0.8rem] overflow-hidden bg-white/10 shrink-0">
                  <PosterImage src={preview.logo} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[1.35rem] font-bold truncate">{preview.name}</div>
                  <div className="text-[0.95rem] text-white/60 truncate">
                    {preview.category}
                    {hasArchive && <span className="text-[#3CC8FF] font-semibold"> · {archiveDays(preview)} gün arşiv</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenGuide}
                  title="TV Rehberi"
                  className="tv-focus shrink-0 flex items-center gap-[0.45rem] rounded-full bg-white/[0.08] px-[0.9rem] py-[0.45rem] text-[0.95rem] font-bold"
                >
                  <CalendarDays className="w-[1.05rem] h-[1.05rem]" /> Rehber
                </button>
              </div>
            )}
            {!current && upcoming.length === 0 ? (
              <p className="text-[1.15rem] font-semibold text-white/85 flex items-center gap-[0.6rem]">
                {epg.state === 'loading' && preview && <Loader2 className="w-[1.2rem] h-[1.2rem] animate-spin shrink-0" />}
                {emptyText}
              </p>
            ) : (
              <div className="space-y-[1.1rem]">
                {current && (
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[0.9rem] font-bold uppercase tracking-wider text-brand">Şimdi</span>
                      <span className="text-[0.95rem] font-semibold text-white/70 tabular-nums">
                        {formatClock(current.start)} - {formatClock(current.stop)}
                      </span>
                    </div>
                    <div className="text-[1.3rem] font-semibold mt-[0.3rem]">{current.title}</div>
                    <div className="mt-[0.7rem] h-[0.35rem] rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${programmeProgress(current, now)}%` }} />
                    </div>
                    {current.desc && <p className="mt-[0.7rem] text-[0.98rem] leading-snug text-white/65 line-clamp-3">{current.desc}</p>}
                    {restartButton('tv')}
                  </div>
                )}
                {upcoming.length > 0 && (
                  <div>
                    <span className="text-[0.9rem] font-bold uppercase tracking-wider text-white/55 flex items-center gap-[0.4rem]">
                      <CalendarClock className="w-[1rem] h-[1rem]" /> Sonra
                    </span>
                    <ul className="mt-[0.5rem] divide-y divide-white/[0.07]">
                      {upcoming.map((p) => (
                        <li key={p.start} className="flex gap-[1rem] py-[0.55rem] text-[1.08rem]">
                          <span className="w-[3.4rem] shrink-0 font-semibold text-white/60 tabular-nums">{formatClock(p.start)}</span>
                          <span className="min-w-0 truncate font-semibold text-white/85">{p.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {missed.length > 0 && preview && (
                  <div>
                    <span className="text-[0.9rem] font-bold uppercase tracking-wider text-[#3CC8FF] flex items-center gap-[0.4rem]">
                      <History className="w-[1rem] h-[1rem]" /> Kaçırdıklarınız · baştan izle
                    </span>
                    <div className="mt-[0.5rem] flex flex-col gap-[0.35rem]">
                      {missed.map((p) => (
                        <button
                          key={p.start}
                          type="button"
                          onClick={() => onPlayCatchup(preview, p)}
                          className="tv-focus flex items-center gap-[1rem] rounded-[0.7rem] px-[0.6rem] py-[0.45rem] text-left text-[1.05rem]"
                        >
                          <span className="w-[3.4rem] shrink-0 font-semibold text-white/60 tabular-nums">{formatClock(p.start)}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-white/85">{p.title}</span>
                          <RotateCcw className="w-[1rem] h-[1rem] shrink-0 text-white/60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer>
        <LegendKey color="red" label="Tam Ekran" onClick={() => handleColorKey('red')} />
        <LegendKey color="blue" label={sortMode === 'number' ? 'A-Z Sırala' : 'Numaraya Göre'} onClick={() => handleColorKey('blue')} />
        <LegendKey color="yellow" label="Görünüm" onClick={() => handleColorKey('yellow')} />
        <LegendKey color="green" label="Favori" onClick={() => handleColorKey('green')} />
      </Footer>
    </div>
  );
}
