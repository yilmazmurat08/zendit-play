import React, { useMemo } from 'react';
import { ChevronRight, ListVideo } from 'lucide-react';
import { Channel, Movie, Series, TabType, WatchHistoryEntry, XtreamAccount } from '../types';
import { CATEGORY_FAVORITES, DeviceInfo, MENU_COLORS } from '../lib/tv';
import { useParental } from '../lib/parental';
import { CONTINUE_LABELS, ContinueKind, useContinueLists } from '../lib/continueWatching';
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
  /** "İzlemeye Devam Et" screen, opened on the given list. */
  onOpenContinue: (kind: ContinueKind) => void;
  /** Narrow landscape stage (phone held sideways): smaller tiles and panel. */
  compact?: boolean;
}

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

const KIND_ICON: Record<ContinueKind, React.ElementType> = { live: LiveIcon, series: SeriesIcon, movie: MovieIcon };
const KIND_COLOR: Record<ContinueKind, string> = { live: MENU_COLORS.live, series: MENU_COLORS.series, movie: MENU_COLORS.movies };
const KIND_NOUN: Record<ContinueKind, string> = { live: 'kanal', series: 'dizi', movie: 'film' };
const KINDS: ContinueKind[] = ['live', 'series', 'movie'];

export function HomeScreen({
  account,
  channels,
  movies,
  series,
  history,
  searchQuery,
  onNavigate,
  onOpenAccountModal,
  onSelectMedia,
  onPlayChannel,
  onOpenContinue,
  compact = false,
}: HomeScreenProps) {
  const parental = useParental();
  /** Locked adult title: ask for the PIN first. */
  const openGuarded = (hidden: boolean, open: () => void) => {
    if (hidden) parental.unlock().then((ok) => ok && open());
    else open();
  };

  const continueLists = useContinueLists(channels, movies, series, history);

  const favoriteCounts = useMemo(
    () => ({
      live: channels.filter((c) => c.isFavorite).length,
      movies: movies.filter((m) => m.isFavorite).length,
      series: series.filter((s) => s.isFavorite).length,
    }),
    [channels, movies, series]
  );
  const favoritesTotal = favoriteCounts.live + favoriteCounts.movies + favoriteCounts.series;
  const openFavorites = () => {
    const tab: TabType = favoriteCounts.live ? 'live' : favoriteCounts.movies ? 'movies' : favoriteCounts.series ? 'series' : 'live';
    onNavigate(tab, CATEGORY_FAVORITES);
  };

  const q = searchQuery.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    return {
      channels: channels.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 24),
      vod: [...movies.filter((m) => m.title.toLowerCase().includes(q)), ...series.filter((s) => s.title.toLowerCase().includes(q))].slice(0, 36),
    };
  }, [q, channels, movies, series]);

  return (
    <div
      id="zendit-home-screen"
      className={`h-full flex flex-col tv:flex-row gap-4 tv:gap-[1.75rem] px-4 pb-4 overflow-y-auto tv:overflow-hidden ${
        compact ? 'tv:px-[2.5rem] tv:pb-[1rem]' : 'tv:px-[5rem] tv:pb-[1.75rem]'
      }`}
    >
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
                  {results.channels.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openGuarded(parental.hidden('live', c), () => onPlayChannel(c))}
                      className="tv-focus flex items-center gap-3 tv:gap-[0.9rem] rounded-xl tv:rounded-[1rem] bg-white/[0.06] px-3 py-2 tv:px-[1rem] tv:py-[0.75rem] text-left"
                    >
                      <span className="w-9 h-9 tv:w-[2.75rem] tv:h-[2.75rem] shrink-0 rounded-lg overflow-hidden bg-white/10">
                        <PosterImage src={c.logo} locked={parental.hidden('live', c)} small />
                      </span>
                      <span className="text-sm tv:text-[1.2rem] font-semibold truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {results.vod.length > 0 && (
              <>
                <h3 className="text-xs tv:text-[1rem] font-semibold uppercase tracking-wider text-white/60 mb-2">Filmler &amp; Diziler</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 tv:grid-cols-7 gap-3 tv:gap-[1.1rem]">
                  {results.vod.map((item) => {
                    const hidden = parental.hidden('seasons' in item ? 'series' : 'movie', item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openGuarded(hidden, () => onSelectMedia(item))}
                        className="tv-focus-ring rounded-xl tv:rounded-[1rem] text-left"
                      >
                        <span className="block aspect-[2/3] rounded-xl tv:rounded-[1rem] overflow-hidden bg-white/[0.07]">
                          <PosterImage src={item.poster} locked={hidden} />
                        </span>
                        <span className="block mt-1.5 text-xs tv:text-[1rem] font-semibold truncate">{item.title}</span>
                      </button>
                    );
                  })}
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
            <Tile
              icon={LiveIcon}
              color={MENU_COLORS.live}
              label="Canlı TV"
              onClick={() => onNavigate('live')}
              compact={compact}
              autoFocus
              className="col-span-2 tv:col-span-1 tv:row-span-2"
            />
            <Tile icon={MovieIcon} color={MENU_COLORS.movies} label="Filmler" onClick={() => onNavigate('movies')} compact={compact} />
            <Tile icon={SeriesIcon} color={MENU_COLORS.series} label="Diziler" onClick={() => onNavigate('series')} compact={compact} />
            <SmallTile
              icon={HeartIcon}
              color={MENU_COLORS.favorites}
              label="Favoriler"
              subtitle={`${favoritesTotal} Öğe`}
              onClick={openFavorites}
              compact={compact}
            />
            <SmallTile
              icon={ListVideo}
              color={MENU_COLORS.playlists}
              label="Playlistler"
              subtitle={account ? '1 Playlist' : 'Playlist ekle'}
              onClick={onOpenAccountModal}
              compact={compact}
            />
          </div>
        )}
        <Footer variant="home" />
      </section>

      <aside
        className={`glass shrink-0 rounded-3xl tv:rounded-[2.25rem] p-4 flex flex-col gap-3 min-w-0 ${
          compact ? 'tv:w-[27%] tv:p-[1.3rem] tv:gap-[0.9rem]' : 'tv:w-[31rem] tv:p-[1.75rem] tv:gap-[1.25rem]'
        }`}
      >
        <h2 className={`text-lg font-bold leading-tight whitespace-nowrap truncate ${compact ? 'tv:text-[1.3rem]' : 'tv:text-[1.9rem]'}`}>
          İzlemeye Devam Et
        </h2>
        <div className="flex flex-col gap-2.5 tv:flex-1 tv:min-h-0 tv:gap-[0.9rem]">
          {KINDS.map((kind) => {
            const Icon = KIND_ICON[kind];
            const list = continueLists[kind] as (Channel | Movie | Series)[];
            const first = list[0];
            const firstHidden = first ? parental.hidden(kind, first) : false;
            const firstName = first ? (firstHidden ? 'Kilitli içerik' : 'name' in first ? first.name : first.title) : 'Henüz yok';
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onOpenContinue(kind)}
                style={tileColor(KIND_COLOR[kind])}
                className="tv-focus w-full tv:flex-1 tv:min-h-0 flex items-center gap-3 tv:gap-[1rem] rounded-2xl tv:rounded-[1.4rem] bg-white/[0.06] border border-white/[0.06] px-3 py-2.5 tv:px-[1.1rem] tv:py-[0.6rem] text-left"
              >
                <span
                  className={`shrink-0 rounded-xl tv:rounded-[0.9rem] flex items-center justify-center w-11 h-11 ${
                    compact ? 'tv:w-[2.8rem] tv:h-[2.8rem]' : 'tv:w-[4rem] tv:h-[4rem]'
                  }`}
                  style={{ backgroundColor: `rgb(${KIND_COLOR[kind]} / 0.16)`, color: `rgb(${KIND_COLOR[kind]})` }}
                >
                  <Icon className={`w-6 h-6 ${compact ? 'tv:w-[1.6rem] tv:h-[1.6rem]' : 'tv:w-[2.2rem] tv:h-[2.2rem]'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-bold leading-tight truncate text-base ${compact ? 'tv:text-[1.1rem]' : 'tv:text-[1.45rem]'}`}>
                    {CONTINUE_LABELS[kind]}
                    <span className="ml-1.5 text-white/55 font-semibold text-[0.8em]">{list.length}</span>
                  </span>
                  <span className={`block text-xs text-white/60 truncate ${compact ? 'tv:text-[0.8rem]' : 'tv:text-[1rem]'}`}>
                    {list.length ? `Son: ${firstName}` : kind === 'live' ? 'Henüz kanal izlenmedi' : `Yarım kalan ${KIND_NOUN[kind]} yok`}
                  </span>
                </span>
                {list.length > 0 && (
                  <span className={`shrink-0 flex -space-x-3 tv:-space-x-[0.9rem] ${compact ? 'tv:hidden' : ''}`}>
                    {list.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className={`block rounded-md tv:rounded-[0.5rem] overflow-hidden bg-[#2a2750] ring-2 ring-[#1d1a3a] ${
                          kind === 'live' ? 'w-8 h-8' : 'w-7 h-10'
                        } ${
                          compact
                            ? kind === 'live'
                              ? 'tv:w-[2rem] tv:h-[2rem]'
                              : 'tv:w-[1.7rem] tv:h-[2.5rem]'
                            : kind === 'live'
                              ? 'tv:w-[2.8rem] tv:h-[2.8rem]'
                              : 'tv:w-[2.3rem] tv:h-[3.4rem]'
                        }`}
                      >
                        <PosterImage src={'logo' in item ? item.logo : item.poster} locked={parental.hidden(kind, item)} small />
                      </span>
                    ))}
                  </span>
                )}
                <ChevronRight className="shrink-0 w-4 h-4 tv:w-[1.3rem] tv:h-[1.3rem] text-white/45" />
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
