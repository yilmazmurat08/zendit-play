import React, { useEffect, useRef, useState } from 'react';
import { Movie, Series, Episode } from '../types';
import { Play, Heart, Star, Clock, CalendarDays, History, X, Loader2 } from 'lucide-react';
import { PosterImage } from './TvUi';

interface MediaDetailModalProps {
  media: Movie | Series | null;
  isDetailLoading?: boolean;
  related?: (Movie | Series)[];
  onClose: () => void;
  onPlay: (media: Movie | Series, episode?: Episode, seasonNum?: number) => void;
  onToggleFavorite: (id: string, type: 'movie' | 'series') => void;
  onSelectMedia?: (item: Movie | Series) => void;
}

function InfoRow({ label, value, tall = false }: { label: string; value: string; tall?: boolean }) {
  return (
    <div className={`grid grid-cols-[6.5rem_1fr] tv:grid-cols-[8.5rem_1fr] gap-3 py-2.5 tv:py-[0.85rem] ${tall ? 'tv:min-h-[7.5rem]' : ''}`}>
      <dt className="font-bold text-white">{label}:</dt>
      <dd className={`text-white/85 font-medium ${tall ? 'line-clamp-5' : 'line-clamp-2'}`}>{value}</dd>
    </div>
  );
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  isDetailLoading = false,
  related = [],
  onClose,
  onPlay,
  onToggleFavorite,
  onSelectMedia,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus "Hemen İzle" for the TV remote without scrolling the title out of view on short screens.
  useEffect(() => {
    playButtonRef.current?.focus({ preventScroll: true });
  }, []);

  if (!media) return null;

  const isSeries = 'seasons' in media;
  const seriesMedia = isSeries ? (media as Series) : null;
  const movieMedia = !isSeries ? (media as Movie) : null;
  const activeSeason =
    seriesMedia?.seasons.find((s) => s.seasonNum === selectedSeason) ||
    seriesMedia?.seasons.find((s) => s.seasonNum === seriesMedia.lastWatchedEpisode?.seasonNum) ||
    seriesMedia?.seasons[0];

  const lastEpisode = seriesMedia?.lastWatchedEpisode
    ? seriesMedia.seasons
        .find((s) => s.seasonNum === seriesMedia.lastWatchedEpisode!.seasonNum)
        ?.episodes.find((ep) => ep.episodeNum === seriesMedia.lastWatchedEpisode!.episodeNum)
    : undefined;
  const canContinue = Boolean((movieMedia?.progress && movieMedia.progress > 0) || lastEpisode);

  const playFromStart = () => {
    if (isSeries && activeSeason?.episodes[0]) onPlay(media, activeSeason.episodes[0], activeSeason.seasonNum);
    else onPlay(media);
  };

  const playContinue = () => {
    if (lastEpisode && seriesMedia?.lastWatchedEpisode) onPlay(media, lastEpisode, seriesMedia.lastWatchedEpisode.seasonNum);
    else onPlay(media);
  };

  const pill =
    'tv-focus flex items-center gap-2 tv:gap-[0.6rem] rounded-full px-4 py-2 tv:px-[1.4rem] tv:py-[0.75rem] text-sm tv:text-[1.2rem] font-semibold';
  const metaIcon = 'w-[1.15em] h-[1.15em]';

  return (
    <div id="zendit-media-detail" className="glass relative h-full min-h-0 rounded-2xl tv:rounded-[2.25rem] overflow-hidden">
      {/* Soft blurred backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {(media.backdrop || media.poster) && (
          <img src={media.backdrop || media.poster} alt="" className="w-full h-full object-cover opacity-[0.14] blur-2xl scale-110" />
        )}
      </div>

      <div className="relative h-full overflow-y-auto no-scrollbar p-4 tv:p-[2.25rem]">
        <button
          id="btn-detail-close"
          type="button"
          onClick={onClose}
          title="Kapat"
          className="tv-focus absolute top-3 right-3 tv:top-[1.75rem] tv:right-[1.75rem] z-10 w-10 h-10 tv:w-[4.25rem] tv:h-[4.25rem] rounded-full bg-lilac flex items-center justify-center"
        >
          <X className="w-5 h-5 tv:w-[2rem] tv:h-[2rem] stroke-[2.5]" />
        </button>

        <div className="flex flex-col sm:flex-row gap-5 tv:gap-[2.25rem]">
          <div className="w-32 sm:w-40 tv:w-[17.5rem] shrink-0 aspect-[2/3] rounded-xl tv:rounded-[1.1rem] overflow-hidden bg-white/10 shadow-2xl">
            <PosterImage src={media.poster} />
          </div>

          <div className="flex-1 min-w-0 tv:pr-[5rem]">
            <div className="flex flex-wrap items-center gap-x-4 tv:gap-x-[1.4rem] gap-y-1 text-xs tv:text-[1.05rem] font-semibold">
              <span className="flex items-center gap-1.5">
                <Star className={`${metaIcon} text-amber-400 fill-amber-400`} />
                {media.rating || 'N/A'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className={metaIcon} />
                {isSeries ? `${seriesMedia?.seasonsCount || seriesMedia?.seasons.length || 0} Sezon` : movieMedia?.duration || '-'}
              </span>
              {media.year ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className={metaIcon} />
                  {media.year}
                </span>
              ) : null}
              {isDetailLoading && <Loader2 className={`${metaIcon} animate-spin text-white/70`} />}
            </div>

            <h1 className="mt-2 tv:mt-[0.6rem] text-2xl tv:text-[2.6rem] font-bold leading-tight pr-12 tv:pr-0">{media.title}</h1>

            <dl className="mt-4 tv:mt-[1.5rem] border-t border-white/10 divide-y divide-white/10 text-sm tv:text-[1.05rem]">
              <InfoRow
                label="Açıklama"
                value={media.synopsis || (isDetailLoading ? 'Yükleniyor…' : 'Açıklama bulunmuyor.')}
                tall
              />
              <InfoRow label="Kategori" value={media.genres.length ? media.genres.join(', ') : media.category || 'Tür bilgisi yok'} />
              <InfoRow label="Oyuncular" value={media.cast.length ? media.cast.join(', ') : 'Oyuncu bilgisi yok'} />
              {media.director && <InfoRow label="Yönetmen" value={media.director} />}
            </dl>

            <div className="mt-4 tv:mt-[1.5rem] flex flex-wrap gap-2.5 tv:gap-[0.9rem]">
              <button
                id="btn-detail-play"
                ref={playButtonRef}
                type="button"
                onClick={playFromStart}
                className={`${pill} bg-brand text-white border-2 border-white/80`}
              >
                <Play className="w-4 h-4 tv:w-[1.3rem] tv:h-[1.3rem] fill-current" />
                Hemen İzle
              </button>
              <button
                id="btn-detail-fav"
                type="button"
                onClick={() => onToggleFavorite(media.id, isSeries ? 'series' : 'movie')}
                className={`${pill} bg-lilac text-white border-2 border-transparent`}
              >
                <Heart className="w-4 h-4 tv:w-[1.3rem] tv:h-[1.3rem]" fill={media.isFavorite ? 'currentColor' : 'none'} />
                {media.isFavorite ? 'Beğenildi' : 'Beğen'}
              </button>
              {canContinue && (
                <button type="button" onClick={playContinue} className={`${pill} bg-lilac text-white border-2 border-transparent`}>
                  <History className="w-4 h-4 tv:w-[1.3rem] tv:h-[1.3rem]" />
                  İzlemeye Devam Et
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Seasons & episodes */}
        {seriesMedia && seriesMedia.seasons.length > 0 && (
          <section className="mt-6 tv:mt-[2rem]">
            <div className="flex gap-2 tv:gap-[0.75rem] overflow-x-auto no-scrollbar pb-1 p-0.5">
              {seriesMedia.seasons.map((season) => (
                <button
                  key={season.seasonNum}
                  type="button"
                  onClick={() => setSelectedSeason(season.seasonNum)}
                  className={`tv-focus shrink-0 rounded-full px-4 py-1.5 tv:px-[1.3rem] tv:py-[0.6rem] text-xs tv:text-[1.1rem] font-semibold whitespace-nowrap ${
                    activeSeason?.seasonNum === season.seasonNum ? 'bg-white text-[#1B1938]' : 'bg-lilac text-white'
                  }`}
                >
                  {season.title} · {season.episodes.length} Bölüm
                </button>
              ))}
            </div>
            <div className="mt-3 tv:mt-[1rem] grid grid-cols-1 tv:grid-cols-2 gap-2.5 tv:gap-[0.9rem]">
              {activeSeason?.episodes.map((ep) => (
                <button
                  key={ep.episodeNum}
                  type="button"
                  onClick={() => onPlay(media, ep, activeSeason.seasonNum)}
                  className="tv-focus flex items-center gap-3 tv:gap-[1rem] rounded-xl tv:rounded-[1.1rem] bg-white/[0.07] p-2 tv:p-[0.7rem] text-left"
                >
                  <span className="relative w-24 tv:w-[9rem] aspect-video shrink-0 rounded-lg tv:rounded-[0.7rem] overflow-hidden bg-black/30">
                    <PosterImage src={ep.thumbnail} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play className="w-5 h-5 tv:w-[1.8rem] tv:h-[1.8rem] fill-white text-white" />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm tv:text-[1.15rem] font-bold truncate">
                      {ep.episodeNum}. Bölüm{ep.title ? `: ${ep.title}` : ''}
                    </span>
                    <span className="block text-xs tv:text-[0.95rem] text-white/70">{ep.duration}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Same category */}
        {related.length > 0 && (
          <section className="mt-6 tv:mt-[2rem]">
            <h2 className="text-base tv:text-[1.6rem] font-bold mb-3 tv:mb-[1rem]">Aynı Kategori</h2>
            <div className="flex gap-3 tv:gap-[1.1rem] overflow-x-auto no-scrollbar p-1 pb-2">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMedia?.(item)}
                  title={item.title}
                  className="tv-focus-ring glass shrink-0 w-24 tv:w-[10.5rem] aspect-[2/3] rounded-xl tv:rounded-[1.25rem] overflow-hidden"
                >
                  <PosterImage src={item.poster} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
