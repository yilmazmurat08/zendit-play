import { useMemo } from 'react';
import type { Channel, WatchHistoryEntry, Movie, Series } from '../types';
import { parseDurationMinutes } from './tv';

/** "İzlemeye Devam Et": recently watched channels, series in progress and half-watched movies. */

export type ContinueKind = 'live' | 'series' | 'movie';

export const CONTINUE_LABELS: Record<ContinueKind, string> = { live: 'Canlı TV', series: 'Diziler', movie: 'Filmler' };

const MAX_VOD = 60;
const MAX_LIVE = 5;

export interface ContinueLists {
  live: Channel[];
  series: Series[];
  movie: Movie[];
}

/** Most recent first (by the watch history); movies only while 0 % < progress < 95 %. */
export function useContinueLists(channels: Channel[], movies: Movie[], series: Series[], history: WatchHistoryEntry[]): ContinueLists {
  return useMemo(() => {
    const order = new Map<string, number>();
    history.forEach((h, i) => {
      const key = `${h.type}:${h.id}`;
      if (!order.has(key)) order.set(key, i);
    });
    const rank = (type: string, id: string) => order.get(`${type}:${id}`) ?? Number.MAX_SAFE_INTEGER;

    const byId = new Map(channels.map((c) => [c.id, c]));
    const live: Channel[] = [];
    const seen = new Set<string>();
    for (const h of history) {
      if (h.type !== 'live' || seen.has(h.id)) continue;
      const channel = byId.get(h.id);
      if (channel) {
        seen.add(h.id);
        live.push(channel);
        if (live.length >= MAX_LIVE) break;
      }
    }
    const inProgressSeries = series
      .filter((s) => s.lastWatchedEpisode)
      .sort((a, b) => rank('series', a.id) - rank('series', b.id))
      .slice(0, MAX_VOD);
    const inProgressMovies = movies
      .filter((m) => (m.progress || 0) > 0 && (m.progress || 0) < 95)
      .sort((a, b) => rank('movie', a.id) - rank('movie', b.id))
      .slice(0, MAX_VOD);
    return { live, series: inProgressSeries, movie: inProgressMovies };
  }, [channels, movies, series, history]);
}

/** "S1 B4" or "S1 B4 · bitti, sıradaki bölüm". */
export function seriesProgressLabel(s: Series): string {
  const ep = s.lastWatchedEpisode;
  if (!ep) return '';
  return ep.progress >= 95 ? `S${ep.seasonNum} B${ep.episodeNum} · bitti, sıradaki bölüm` : `S${ep.seasonNum} B${ep.episodeNum}`;
}

/** "42 dk kaldı" when the length is known, otherwise "%35 izlendi". */
export function movieRemainingLabel(m: Movie): string {
  const minutes = parseDurationMinutes(m.duration);
  if (minutes && m.progress) return `${Math.max(1, Math.round(minutes * (1 - m.progress / 100)))} dk kaldı`;
  return `%${Math.round(m.progress || 0)} izlendi`;
}

export function progressPercent(item: Movie | Series): number {
  const value = 'seasons' in item ? item.lastWatchedEpisode?.progress || 0 : item.progress || 0;
  return Math.min(100, Math.max(0, value));
}
