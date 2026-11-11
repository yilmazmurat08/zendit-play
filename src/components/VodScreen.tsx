import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Film, Heart, Star } from 'lucide-react';
import { Episode, Movie, Series, XtreamAccount } from '../types';
import { useVirtualList } from '../lib/useVirtualList';
import { CATEGORY_ADDED, CATEGORY_FAVORITES, CATEGORY_RECENT, DeviceInfo, useIsTv } from '../lib/tv';
import { foldQuery, matchesQuery } from '../lib/search';
import { useParental } from '../lib/parental';
import { CategoryItem, CategoryPanel, PosterImage } from './TvUi';
import { MediaDetailModal } from './MediaDetailModal';

interface VodScreenProps {
  type: 'movies' | 'series';
  movies: Movie[];
  series: Series[];
  recentIds: string[];
  initialCategory?: string;
  searchQuery?: string;
  selectedMedia: Movie | Series | null;
  isDetailLoading?: boolean;
  account: XtreamAccount | null;
  device: DeviceInfo;
  onSelectMedia: (item: Movie | Series) => void;
  onCloseDetail: () => void;
  onPlay: (media: Movie | Series, episode?: Episode, seasonNum?: number, fromStart?: boolean) => void;
  onPlayTrailer: (media: Movie | Series) => void;
  onToggleFavorite: (id: string, type: 'movie' | 'series') => void;
  /** Narrow landscape stage (phone held sideways): tighter margins, smaller detail poster. */
  compact?: boolean;
}

export function VodScreen({
  type,
  movies,
  series,
  recentIds,
  initialCategory,
  searchQuery = '',
  selectedMedia,
  isDetailLoading,
  onSelectMedia,
  onCloseDetail,
  onPlay,
  onPlayTrailer,
  onToggleFavorite,
  compact = false,
}: VodScreenProps) {
  const allLabel = type === 'movies' ? 'Tüm Filmler' : 'Tüm Diziler';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || allLabel);
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'newest' | 'title'>('default');
  const isTv = useIsTv();
  const parental = useParental();
  const kind = type === 'movies' ? 'movie' : 'series';
  /** Locked adult title: ask for the PIN before opening it. */
  const openItem = (item: Movie | Series) => {
    if (!parental.hidden(kind, item)) onSelectMedia(item);
    else parental.unlock().then((ok) => ok && onSelectMedia(item));
  };

  const items: (Movie | Series)[] = type === 'movies' ? movies : series;

  // Provider categories plus genres (from the detail info), alphabetically.
  const categories = useMemo<CategoryItem[]>(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
      item.genres?.forEach((g) => {
        const genre = g.trim();
        if (genre && !counts.has(genre)) counts.set(genre, 1);
      });
    });
    const names = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    return [
      { name: CATEGORY_RECENT },
      { name: CATEGORY_ADDED },
      { name: CATEGORY_FAVORITES },
      { name: allLabel, count: items.length },
      ...names.map((name) => ({ name, count: counts.get(name) || 0, locked: parental.categoryRestricted(kind, name) })),
    ];
  }, [items, allLabel, parental.config]);

  const selectCategory = (name: string) => {
    const open = () => {
      setSelectedCategory(name);
      // Picking a category shows its list: close an open detail panel instead of keeping it on top.
      if (selectedMedia) onCloseDetail();
    };
    const locked = categories.find((c) => c.name === name && c.locked);
    if (locked && parental.locked) parental.unlock().then((ok) => ok && open());
    else open();
  };

  const filtered = useMemo(() => {
    let list: (Movie | Series)[];
    if (selectedCategory === CATEGORY_RECENT) {
      const byId = new Map(items.map((i) => [i.id, i]));
      list = recentIds.map((id) => byId.get(id)).filter((i): i is Movie | Series => !!i);
    } else if (selectedCategory === CATEGORY_ADDED) {
      list = [...items].sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || '') || b.year - a.year).slice(0, 60);
    } else if (selectedCategory === CATEGORY_FAVORITES) {
      list = items.filter((i) => i.isFavorite);
    } else if (selectedCategory === allLabel) {
      list = items;
    } else {
      const cat = selectedCategory.toLowerCase();
      list = items.filter(
        (i) => i.category?.trim().toLowerCase() === cat || i.genres?.some((g) => g.trim().toLowerCase() === cat)
      );
    }
    const q = foldQuery(searchQuery);
    if (q) list = list.filter((i) => matchesQuery(q, i.title, i.category, i.director, ...(i.genres || [])));
    if (sortBy === 'default') return list;
    return [...list].sort((a, b) => {
      if (sortBy === 'rating') {
        const ra = parseFloat(a.rating);
        const rb = parseFloat(b.rating);
        if (Number.isNaN(ra) && Number.isNaN(rb)) return 0;
        if (Number.isNaN(ra)) return 1;
        if (Number.isNaN(rb)) return -1;
        return rb - ra;
      }
      if (sortBy === 'newest') return b.year - a.year;
      return a.title.localeCompare(b.title, 'tr');
    });
  }, [items, recentIds, selectedCategory, allLabel, searchQuery, sortBy]);

  // Poster grid: as many ~110 px (phone) / 200 px (TV) columns as fit; more columns if a row would
  // be taller than the visible area. Rows are virtualized.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const width = box.w;
  const gap = isTv ? 20 : 12;
  const captionHeight = isTv ? 58 : 44;
  const targetWidth = isTv ? 200 : 110;
  let columns = Math.max(2, Math.floor((width + gap) / (targetWidth + gap)) || 3);
  let posterWidth = width > 0 ? (width - gap * (columns - 1)) / columns : 0;
  while (box.h > 0 && posterWidth * 1.5 + captionHeight > box.h && columns < 12) {
    columns++;
    posterWidth = (width - gap * (columns - 1)) / columns;
  }
  const rowHeight = Math.max(1, Math.round(posterWidth * 1.5 + captionHeight + gap));
  const rowCount = Math.ceil(filtered.length / columns);
  const { containerRef, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(rowCount, rowHeight, 2);
  const rows = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // A new category, sort or search starts at the top. Otherwise the old scroll offset is kept and the
  // first visible row can be cut off (only its captions show above the posters).
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.scrollTop !== 0) el.scrollTop = 0;
  }, [selectedCategory, sortBy, searchQuery, containerRef]);

  const detail = selectedMedia && ('seasons' in selectedMedia) === (type === 'series') ? selectedMedia : null;
  const related = useMemo(
    () => (detail ? items.filter((i) => i.id !== detail.id && i.category === detail.category).slice(0, 20) : []),
    [detail, items]
  );
  const EmptyIcon = type === 'movies' ? Clapperboard : Film;

  return (
    <div id="zendit-vod-screen" className="h-full flex flex-col">
      <div
        className={`flex-1 min-h-0 flex flex-col gap-3 px-4 tv:grid tv:gap-[1.5rem] ${
          compact ? 'tv:grid-cols-[20fr_80fr] tv:px-[2.5rem] tv:pb-[1rem]' : 'tv:grid-cols-[19fr_81fr] tv:px-[5rem] tv:pb-[1.5rem]'
        }`}
      >
        <CategoryPanel items={categories} selected={selectedCategory} onSelect={selectCategory} unlocked={!parental.locked} />

        <div className="relative flex-1 tv:flex-none min-h-0">
          {detail && (
            <div className="absolute inset-0 z-10">
              <MediaDetailModal
                key={detail.id}
                media={detail}
                isDetailLoading={isDetailLoading}
                related={related}
                onClose={onCloseDetail}
                onPlay={onPlay}
                onPlayTrailer={onPlayTrailer}
                onToggleFavorite={onToggleFavorite}
                onSelectMedia={onSelectMedia}
                compact={compact}
              />
            </div>
          )}

          {/* The grid stays mounted (only hidden) under the detail panel so its scroll position survives. */}
          <div
            className={`glass h-full rounded-2xl tv:rounded-[2.25rem] p-3 tv:p-[1.75rem] flex flex-col ${detail ? 'invisible' : ''}`}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 mb-3 tv:mb-[1.25rem]">
              <h2 className="text-base tv:text-[1.6rem] font-bold truncate">
                {selectedCategory}
                <span className="ml-2 text-white/50 font-semibold text-[0.8em]">{filtered.length}</span>
              </h2>
              <select
                id="vod-sort-selector"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="tv-focus bg-lilac text-white text-xs tv:text-[1.05rem] font-semibold px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.55rem] rounded-full border-0 cursor-pointer"
              >
                <option value="default" className="text-black">
                  Varsayılan Sıra
                </option>
                <option value="rating" className="text-black">
                  IMDb Puanı
                </option>
                <option value="newest" className="text-black">
                  En Yeni
                </option>
                <option value="title" className="text-black">
                  A-Z
                </option>
              </select>
            </div>

            <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/55 px-6 py-10">
                  <EmptyIcon className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
                  <p className="text-sm tv:text-[1.15rem]">
                    {items.length === 0
                      ? type === 'movies'
                        ? 'Henüz film listesi yok.'
                        : 'Henüz dizi listesi yok.'
                      : 'Bu kategoride veya aramada içerik bulunamadı.'}
                  </p>
                </div>
              ) : (
                <div style={{ height: totalHeight, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
                    {rows.map((row) => (
                      <div
                        key={row}
                        style={{ height: rowHeight, gap, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                        className="grid content-start"
                      >
                        {filtered.slice(row * columns, row * columns + columns).map((item) => (
                          <button key={item.id} type="button" onClick={() => openItem(item)} className="group text-left outline-none">
                            <div
                              className="relative rounded-xl tv:rounded-[1.1rem] overflow-hidden bg-white/[0.07] border border-white/[0.07] transition-all duration-150 group-hover:border-brand group-focus-visible:border-brand group-focus-visible:shadow-[0_0_0_0.2rem_#FF5B3D] group-focus-visible:scale-[1.03]"
                              style={{ height: posterWidth * 1.5 }}
                            >
                              <PosterImage src={item.poster} locked={parental.hidden(kind, item)} />
                              {item.rating && item.rating !== 'N/A' && (
                                <div className="absolute top-1.5 left-1.5 tv:top-[0.5rem] tv:left-[0.5rem] px-1.5 py-0.5 tv:px-[0.45rem] tv:py-[0.15rem] rounded-md bg-black/60 text-[10px] tv:text-[0.85rem] font-semibold text-amber-400 flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 tv:w-[0.8rem] tv:h-[0.8rem] fill-amber-400" />
                                  <span>{item.rating}</span>
                                </div>
                              )}
                              {item.isFavorite && (
                                <div className="absolute top-1.5 right-1.5 tv:top-[0.5rem] tv:right-[0.5rem] p-1 tv:p-[0.35rem] rounded-md bg-black/60 text-brand">
                                  <Heart className="w-2.5 h-2.5 tv:w-[0.85rem] tv:h-[0.85rem]" fill="currentColor" />
                                </div>
                              )}
                            </div>
                            <h3 className="text-[11px] tv:text-[1.05rem] font-semibold text-white truncate mt-1.5 tv:mt-[0.55rem] group-focus-visible:text-brand">
                              {item.title}
                            </h3>
                            <p className="text-[10px] tv:text-[0.85rem] text-white/55">{item.year || ''}</p>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
