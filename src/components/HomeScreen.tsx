import React, { useMemo } from 'react';
import { ListVideo, ChevronRight, Tv } from 'lucide-react';
import { Channel, Movie, Series, TabType, WatchHistoryEntry, XtreamAccount } from '../types';
import { CATEGORY_FAVORITES, CATEGORY_RECENT, DeviceInfo, MENU_COLORS, parseDurationMinutes } from '../lib/tv';
import { Footer, HeartIcon, LiveIcon, MovieIcon, PosterImage, SeriesIcon } from './TvUi';

interface HomeScreenProps {
  account: XtreamAccount | null;
  device: DeviceInfo;
  channels: Channel[];
  movies: Movie[];
  series: Series[];
  history: WatchHistoryEntry[];
  searchQuery: string;
  onNavigate: (tab: TabType, category?: string) => void;
  onOpenAccountModal: () => void;
  onSelectMedia: (item: Movie | Series) => void;
  onPlayChannel: (channel: Channel) => void;
  /** Narrow landscape stage (phone held sideways): smaller tiles and panel. */
  compact?: boolean;
}

type ContinueItem =
  | { kind: 'movie'; item: Movie }
  | { kind: 'series'; item: Series }
  | { kind: 'live'; item: Channel };

const KIND_LABEL = { movie: 'Film', series: 'Dizi', live: 'Canlı TV' };
const KIND_COLOR = { movie: MENU_COLORS.movies, series: MENU_COLORS.series, live: MENU_COLORS.live };

const tileColor = (rgb: string) => ({ '--tile': rgb } as React.CSSProperties);

function Tile({
  icon: Icon,
  color,
  label,
  onClick,
  compact,
  className = '',
  autoFocus,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  onClick: () => void;
  compact?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus={autoFocus}
      style={tileColor(color)}
      className={`menu-tile min-w-0 rounded-3xl tv:rounded-[2.25rem] min-h-[8.5rem] tv:min-h-0 p-5 flex flex-col justify-center gap-3 text-left text-white ${
        compact ? 'tv:p-[1.75rem] tv:gap-[1.25rem]' : 'tv:p-[2.75rem] tv:gap-[2.25rem]'
      } ${className}`}
    >
      <Icon className={`menu-icon w-10 h-10 ${compact ? 'tv:w-[4rem] tv:h-[4rem]' : 'tv:w-[5.75rem] tv:h-[5.75rem]'}`} />
      <span className={`text-2xl font-semibold tracking-tight leading-none ${compact ? 'tv:text-[2.4rem]' : 'tv:text-[3.4rem]'}`}>
        {label}
      </span>
    </button>
  );
}

function SmallTile({
  icon: Icon,
  color,
  label,
  subtitle,
  onClick,
  compact,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  subtitle: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={tileColor(color)}
      className={`menu-tile min-w-0 rounded-3xl tv:rounded-[2rem] px-5 py-4 tv:py-0 flex items-center gap-3 text-left text-white ${
        compact ? 'tv:px-[1.4rem] tv:gap-[1rem]' : 'tv:px-[2.75rem] tv:gap-[1.5rem]'
      }`}
    >
      <Icon className={`menu-icon w-7 h-7 shrink-0 ${compact ? 'tv:w-[2.4rem] tv:h-[2.4rem]' : 'tv:w-[3rem] tv:h-[3rem]'}`} />
      <span className="min-w-0">
        <span className={`block text-lg font-semibold leading-tight truncate ${compact ? 'tv:text-[1.6rem]' : 'tv:text-[2.3rem]'}`}>
          {label}
        </span>
        <span className="block text-xs tv:text-[1.05rem] font-semibold text-white/85">{subtitle}</span>
      </span>
    </button>
  );
}

function continueSubtitle(entry: ContinueItem): string {
  if (entry.kind === 'live') return entry.item.currentShow || entry.item.category || '';
  if (entry.kind === 'series') {
    const ep = entry.item.lastWatchedEpisode;
    return ep ? `S${ep.seasonNum} B${ep.episodeNum}` : entry.item.year ? String(entry.item.year) : '';
  }
  const total = parseDurationMinutes(entry.item.duration);
  if (total && entry.item.progress) return `${Math.max(1, Math.round(total * (1 - entry.item.progress / 100)))} dk kaldı`;
  return entry.item.year ? String(entry.item.year) : '';
}

function continueProgress(entry: ContinueItem): number {
  if (entry.kind === 'live') return entry.item.progress || 0;
  if (entry.kind === 'series') return entry.item.lastWatchedEpisode?.progress || 0;
  return entry.item.progress || 0;
}

export function HomeScreen({
  account,
  device,
  channels,
  movies,
  series,
  history,
  searchQuery,
  onNavigate,
  onOpenAccountModal,
  onSelectMedia,
  onPlayChannel,
  compact = false,
}: HomeScreenProps) {
  const continueItems = useMemo(() => {
    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const movieMap = new Map(movies.map((m) => [m.id, m]));
    const seriesMap = new Map(series.map((s) => [s.id, s]));
    const seen = new Set<string>();
    const out: ContinueItem[] = [];
    const push = (entry: ContinueItem) => {
      const key = entry.kind + entry.item.id;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(entry);
    };
    history.forEach((h) => {
      if (h.type === 'live' && channelMap.has(h.id)) push({ kind: 'live', item: channelMap.get(h.id)! });
      if (h.type === 'movie' && movieMap.has(h.id)) push({ kind: 'movie', item: movieMap.get(h.id)! });
      if (h.type === 'series' && seriesMap.has(h.id)) push({ kind: 'series', item: seriesMap.get(h.id)! });
    });
    movies.filter((m) => m.progress && m.progress > 0).forEach((m) => push({ kind: 'movie', item: m }));
    series.filter((s) => s.lastWatchedEpisode).forEach((s) => push({ kind: 'series', item: s }));
    return out.slice(0, 10);
  }, [channels, movies, series, history]);

  const favoriteCounts = useMemo(
    () => ({
      live: channels.filter((c) => c.isFavorite).length,
      movies: movies.filter((m) => m.isFavorite).length,
      series: series.filter((s) => s.isFavorite).length,
    }),
    [channels, movies, series]
  );
  const totalFavorites = favoriteCounts.live + favoriteCounts.movies + favoriteCounts.series;

  const openFavorites = () => {
    const tab: TabType = favoriteCounts.live ? 'live' : favoriteCounts.movies ? 'movies' : favoriteCounts.series ? 'series' : 'live';
    onNavigate(tab, CATEGORY_FAVORITES);
  };

  const openHistory = () => {
    const first = continueItems[0];
    onNavigate(first?.kind === 'series' ? 'series' : first?.kind === 'movie' ? 'movies' : 'live', CATEGORY_RECENT);
  };

  const openContinue = (entry: ContinueItem) => {
    if (entry.kind === 'live') onPlayChannel(entry.item);
    else onSelectMedia(entry.item);
  };

  const q = searchQuery.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    return {
      channels: channels.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 24),
      vod: [
        ...movies.filter((m) => m.title.toLowerCase().includes(q)),
        ...series.filter((s) => s.title.toLowerCase().includes(q)),
      ].slice(0, 36),
    };
  }, [q, channels, movies, series]);

  return (
    <div id="zendit-home-screen" className="h-full flex flex-col tv:flex-row gap-4 tv:gap-[1.75rem] px-4 tv:px-[5rem] pb-4 tv:pb-[2rem] overflow-y-auto tv:overflow-hidden">
      <section className="shrink-0 tv:shrink tv:flex-1 min-w-0 tv:min-h-0 flex flex-col">
        {results ? (
          <div className="glass flex-1 min-h-0 rounded-3xl tv:rounded-[2.25rem] p-4 tv:p-[2rem] overflow-y-auto">
            <h2 className="text-lg tv:text-[1.9rem] font-bold mb-4 tv:mb-[1.25rem]">“{searchQuery}” için sonuçlar</h2>
            {results.channels.length === 0 && results.vod.length === 0 && (
              <p className="text-sm tv:text-[1.2rem] text-white/60">Eşleşen kanal, film veya dizi bulunamadı.</p>
            )}
            {results.channels.length > 0 && (
              <>
                <h3 className="text-xs tv:text-[1rem] font-semibold uppercase tracking-wider text-white/60 mb-2">Kanallar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 tv:grid-cols-3 gap-2 tv:gap-[0.75rem] mb-6 tv:mb-[1.75rem]">
                  {results.channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onPlayChannel(ch)}
                      className="tv-focus flex items-center gap-3 tv:gap-[0.9rem] rounded-xl tv:rounded-[1rem] bg-white/[0.06] px-3 py-2 tv:px-[1rem] tv:py-[0.75rem] text-left"
                    >
                      <span className="w-9 h-9 tv:w-[2.75rem] tv:h-[2.75rem] shrink-0 rounded-lg overflow-hidden bg-white/10">
                        <PosterImage src={ch.logo} />
                      </span>
                      <span className="text-sm tv:text-[1.2rem] font-semibold truncate">{ch.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {results.vod.length > 0 && (
              <>
                <h3 className="text-xs tv:text-[1rem] font-semibold uppercase tracking-wider text-white/60 mb-2">Filmler & Diziler</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 tv:grid-cols-7 gap-3 tv:gap-[1.1rem]">
                  {results.vod.map((item) => (
                    <button key={item.id} type="button" onClick={() => onSelectMedia(item)} className="tv-focus-ring rounded-xl tv:rounded-[1rem] text-left">
                      <span className="block aspect-[2/3] rounded-xl tv:rounded-[1rem] overflow-hidden bg-white/[0.07]">
                        <PosterImage src={item.poster} />
                      </span>
                      <span className="block mt-1.5 text-xs tv:text-[1rem] font-semibold truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 tv:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 tv:flex-1 tv:min-h-0 ${
              compact ? 'tv:grid-rows-[1fr_6.5rem] tv:gap-[1.25rem]' : 'tv:grid-rows-[1fr_8rem] tv:gap-[1.6rem]'
            }`}
          >
            <Tile icon={LiveIcon} color={MENU_COLORS.live} label="Canlı TV" onClick={() => onNavigate('live')} compact={compact} autoFocus className="col-span-2 tv:col-span-1 tv:row-span-2" />
            <Tile icon={MovieIcon} color={MENU_COLORS.movies} label="Filmler" onClick={() => onNavigate('movies')} compact={compact} />
            <Tile icon={SeriesIcon} color={MENU_COLORS.series} label="Diziler" onClick={() => onNavigate('series')} compact={compact} />
            <SmallTile icon={HeartIcon} color={MENU_COLORS.favorites} label="Favoriler" subtitle={`${totalFavorites} Öğe`} onClick={openFavorites} compact={compact} />
            <SmallTile icon={ListVideo} color={MENU_COLORS.playlists} label="Playlistler" subtitle={account ? '1 Playlist' : 'Playlist ekle'} onClick={onOpenAccountModal} compact={compact} />
          </div>
        )}

        <Footer variant="home" account={account} device={device} />
      </section>

      <aside
        className={`glass shrink-0 min-h-[18rem] tv:min-h-0 rounded-3xl tv:rounded-[2.25rem] p-4 flex flex-col ${
          compact ? 'tv:w-[25%] tv:p-[1.4rem]' : 'tv:w-[31rem] tv:p-[1.9rem]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3 tv:mb-[1.5rem]">
          <h2 className="text-lg tv:text-[1.9rem] font-bold leading-tight tv:max-w-[12rem]">İzlemeye Devam Et</h2>
          {continueItems.length > 0 && (
            <button
              type="button"
              onClick={openHistory}
              className="tv-focus shrink-0 flex items-center gap-1 rounded-full bg-white/[0.1] border border-white/[0.1] px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.55rem] text-xs tv:text-[1.2rem] font-bold"
            >
              Tümünü Gör <ChevronRight className="w-3.5 h-3.5 tv:w-[1.3rem] tv:h-[1.3rem]" />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 tv:space-y-[1rem] p-0.5">
          {continueItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-white/55 py-8">
              <Tv className="w-8 h-8 tv:w-[3rem] tv:h-[3rem]" />
              <p className="text-sm tv:text-[1.15rem]">İzlediğiniz içerikler burada görünür.</p>
            </div>
          )}
          {continueItems.map((entry) => {
            const progress = continueProgress(entry);
            const title = entry.kind === 'live' ? entry.item.name : entry.item.title;
            const image = entry.kind === 'live' ? entry.item.logo : entry.item.poster;
            return (
              <button
                key={entry.kind + entry.item.id}
                type="button"
                onClick={() => openContinue(entry)}
                className="glass tv-focus w-full flex items-center gap-3 tv:gap-[1rem] rounded-2xl tv:rounded-[1.4rem] p-2.5 tv:p-[0.8rem] text-left"
              >
                <span className="w-14 h-14 tv:w-[5.5rem] tv:h-[5.5rem] shrink-0 rounded-xl tv:rounded-[0.9rem] overflow-hidden bg-white/10">
                  <PosterImage src={image} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] tv:text-[0.9rem] font-bold" style={{ color: `rgb(${KIND_COLOR[entry.kind]})` }}>
                    {KIND_LABEL[entry.kind]}
                  </span>
                  <span className="block text-sm tv:text-[1.4rem] font-bold truncate">{title}</span>
                  <span className="block text-[10px] tv:text-[0.9rem] font-medium text-white/80 truncate">{continueSubtitle(entry)}</span>
                  <span className="block mt-1.5 tv:mt-[0.5rem] h-1 tv:h-[0.3rem] rounded-full bg-white/20 overflow-hidden">
                    <span className="block h-full bg-white" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
