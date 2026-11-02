import { useEffect, useMemo, useState } from 'react';
import { Episode, Movie, Series, XtreamAccount } from '../types';
import { Star, Heart, Film, Clapperboard } from 'lucide-react';
import { useVirtualList } from '../lib/useVirtualList';
import { CATEGORY_ADDED, CATEGORY_FAVORITES, CATEGORY_RECENT, DeviceInfo, useIsTv } from '../lib/tv';
import { CategoryPanel, Footer, PosterImage } from './TvUi';
import { MediaDetailModal } from './MediaDetailModal';

interface VodScreenProps {
  type: 'movies' | 'series';
  movies: Movie[];
  series: Series[];
  recentIds: string[];
  initialCategory?: string;
  searchQuery?: string;
  selectedMedia: Movie | Series | null;
  isDetailLoading: boolean;
  account: XtreamAccount | null;
  device: DeviceInfo;
  onSelectMedia: (item: Movie | Series) => void;
  onCloseDetail: () => void;
  onPlay: (media: Movie | Series, episode?: Episode, seasonNum?: number) => void;
  onToggleFavorite: (id: string, type: 'movie' | 'series') => void;
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
  account,
  device,
  onSelectMedia,
  onCloseDetail,
  onPlay,
  onToggleFavorite,
}: VodScreenProps) {
  const allLabel = type === 'movies' ? 'Tüm Filmler' : 'Tüm Diziler';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || allLabel);
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'newest' | 'title'>('default');
  const isTv = useIsTv();

  const rawList: (Movie | Series)[] = type === 'movies' ? movies : series;

  const categories = useMemo(() => {
    const catCounts = new Map<string, number>();
    rawList.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      item.genres?.forEach((genre) => {
        const g = genre.trim();
        if (g && !catCounts.has(g)) catCounts.set(g, 1);
      });
    });
    const sortedCats = Array.from(catCounts.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    return [
      { name: CATEGORY_RECENT },
      { name: CATEGORY_ADDED },
      { name: CATEGORY_FAVORITES },
      { name: allLabel, count: rawList.length },
      ...sortedCats.map((cat) => ({ name: cat, count: catCounts.get(cat) || 0 })),
    ];
  }, [rawList, allLabel]);

  const filteredItems = useMemo(() => {
    let list: (Movie | Series)[];
    if (selectedCategory === CATEGORY_RECENT) {
      const map = new Map(rawList.map((item) => [item.id, item]));
      list = recentIds.map((id) => map.get(id)).filter((item): item is Movie | Series => Boolean(item));
    } else if (selectedCategory === CATEGORY_ADDED) {
      list = [...rawList]
        .sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || '') || b.year - a.year)
        .slice(0, 60);
    } else if (selectedCategory === CATEGORY_FAVORITES) {
      list = rawList.filter((item) => item.isFavorite);
    } else if (selectedCategory === allLabel) {
      list = rawList;
    } else {
      const sel = selectedCategory.toLowerCase();
      list = rawList.filter(
        (item) => item.category?.trim().toLowerCase() === sel || item.genres?.some((g) => g.trim().toLowerCase() === sel)
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.genres.some((g) => g.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.director && item.director.toLowerCase().includes(q))
      );
    }

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
  }, [rawList, recentIds, selectedCategory, allLabel, searchQuery, sortBy]);

  // Grid geometry depends on the panel width: poster (2:3) + title lines + gap.
  const [gridWidth, setGridWidth] = useState(0);
  const gap = isTv ? 20 : 12;
  const minCard = isTv ? 168 : 96;
  const columns = Math.max(2, Math.floor((gridWidth + gap) / (minCard + gap)) || 3);
  const cardWidth = gridWidth > 0 ? (gridWidth - gap * (columns - 1)) / columns : 0;
  const rowHeight = Math.max(1, Math.round(cardWidth * 1.5 + 54 + gap));

  const rowCount = Math.ceil(filteredItems.length / columns);
  const { containerRef, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(rowCount, rowHeight, 2);
  const visibleRows = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setGridWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const detail = selectedMedia && ('seasons' in selectedMedia) === (type === 'series') ? selectedMedia : null;
  const related = useMemo(() => {
    if (!detail) return [];
    return rawList.filter((item) => item.id !== detail.id && item.category === detail.category).slice(0, 20);
  }, [detail, rawList]);

  const EmptyIcon = type === 'movies' ? Clapperboard : Film;

  return (
    <div id="zendit-vod-screen" className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 tv:grid tv:grid-cols-[24fr_76fr] tv:gap-[1.5rem] tv:px-[5rem]">
        <CategoryPanel items={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

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
                onToggleFavorite={onToggleFavorite}
                onSelectMedia={onSelectMedia}
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
                <span className="ml-2 text-white/50 font-semibold text-[0.8em]">{filteredItems.length}</span>
              </h2>
              <select
                id="vod-sort-selector"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="tv-focus bg-lilac text-white text-xs tv:text-[1.05rem] font-semibold px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.55rem] rounded-full border-0 cursor-pointer"
              >
                <option value="default" className="text-black">Varsayılan Sıra</option>
                <option value="rating" className="text-black">IMDb Puanı</option>
                <option value="newest" className="text-black">En Yeni</option>
                <option value="title" className="text-black">A-Z</option>
              </select>
            </div>

            <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/55 px-6 py-10">
                  <EmptyIcon className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
                  <p className="text-sm tv:text-[1.15rem]">
                    {rawList.length === 0
                      ? type === 'movies'
                        ? 'Henüz film listesi yok.'
                        : 'Henüz dizi listesi yok.'
                      : 'Bu kategoride veya aramada içerik bulunamadı.'}
                  </p>
                </div>
              ) : (
                <div style={{ height: totalHeight, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
                    {visibleRows.map((rowIndex) => (
                      <div key={rowIndex} style={{ height: rowHeight, gap, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} className="grid content-start">
                        {filteredItems.slice(rowIndex * columns, rowIndex * columns + columns).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelectMedia(item)}
                            className="group text-left outline-none"
                          >
                            <div
                              className="relative rounded-xl tv:rounded-[1.1rem] overflow-hidden bg-white/[0.07] border border-white/[0.07] transition-all duration-150 group-hover:border-brand group-focus-visible:border-brand group-focus-visible:shadow-[0_0_0_0.2rem_#FF5B3D] group-focus-visible:scale-[1.03]"
                              style={{ height: cardWidth * 1.5 }}
                            >
                              <PosterImage src={item.poster} />
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

      <Footer account={account} device={device} />
    </div>
  );
}
