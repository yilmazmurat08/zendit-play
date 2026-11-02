import type { Channel, Movie, Series, Season, Episode } from '../types';
import { proxiedApiUrl } from './proxy';

export interface M3UEntry {
  name: string;
  url: string;
  logo?: string;
  groupTitle?: string;
  tvgId?: string;
  httpUserAgent?: string;
}

const ATTR_REGEX = /([a-zA-Z0-9-]+)="([^"]*)"/g;

/**
 * Strips a pipe-delimited parameter suffix some IPTV playlists attach to the
 * URL itself (e.g. `http://host/stream.ts|User-Agent=SomeClient/1.0`) -
 * real-world panels use this to pass a required User-Agent/Referer without a
 * separate #EXTVLCOPT line. Left unstripped, the pipe segment would be
 * treated as part of the URL and break playback outright.
 */
function splitPipeParams(rawUrl: string): { url: string; userAgent?: string } {
  const pipeIdx = rawUrl.indexOf('|');
  if (pipeIdx === -1) return { url: rawUrl };
  const url = rawUrl.slice(0, pipeIdx);
  const paramsPart = rawUrl.slice(pipeIdx + 1);
  const uaMatch = paramsPart.match(/(?:^|&)user-agent=([^&]+)/i);
  return { url, userAgent: uaMatch ? decodeURIComponent(uaMatch[1]) : undefined };
}

export function parseM3U(text: string): M3UEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3UEntry[] = [];
  let pending: Partial<M3UEntry> | null = null;
  let pendingGroupFromExtgrp: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXTM3U')) continue;

    if (line.startsWith('#EXTINF')) {
      const commaIdx = line.indexOf(',');
      const attrPart = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
      const namePart = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : '';

      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      ATTR_REGEX.lastIndex = 0;
      while ((m = ATTR_REGEX.exec(attrPart))) {
        attrs[m[1].toLowerCase()] = m[2];
      }

      pending = {
        name: namePart || attrs['tvg-name'] || 'İsimsiz',
        logo: attrs['tvg-logo'] || undefined,
        groupTitle: attrs['group-title'] || undefined,
        tvgId: attrs['tvg-id'] || undefined,
      };
      pendingGroupFromExtgrp = undefined;
      continue;
    }

    // #EXTGRP:Name - an older/alternate way some playlists specify the group,
    // as a separate line instead of (or alongside) the group-title attribute.
    if (line.startsWith('#EXTGRP:')) {
      pendingGroupFromExtgrp = line.slice('#EXTGRP:'.length).trim();
      continue;
    }

    if (line.startsWith('#EXTVLCOPT:')) {
      const opt = line.slice('#EXTVLCOPT:'.length);
      const eqIdx = opt.indexOf('=');
      if (eqIdx > -1 && pending) {
        const key = opt.slice(0, eqIdx).trim().toLowerCase();
        const value = opt.slice(eqIdx + 1).trim();
        if (key === 'http-user-agent') pending.httpUserAgent = value;
      }
      continue;
    }

    if (line.startsWith('#')) continue;

    if (pending) {
      const { url, userAgent } = splitPipeParams(line);
      entries.push({
        name: pending.name || line,
        url,
        logo: pending.logo,
        groupTitle: pending.groupTitle || pendingGroupFromExtgrp,
        tvgId: pending.tvgId,
        httpUserAgent: pending.httpUserAgent || userAgent,
      });
      pending = null;
      pendingGroupFromExtgrp = undefined;
    } else {
      const { url } = splitPipeParams(line);
      entries.push({ name: decodeURIComponent(url.split('/').pop() || 'İsimsiz'), url });
    }
  }

  return entries;
}

const VOD_GROUP_HINTS = ['film', 'movie', 'vod', 'sinema', 'dizi', 'series', 'show'];

export function classifyM3UEntries(entries: M3UEntry[]): { channelEntries: M3UEntry[]; vodEntries: M3UEntry[] } {
  const channelEntries: M3UEntry[] = [];
  const vodEntries: M3UEntry[] = [];
  for (const e of entries) {
    const group = (e.groupTitle || '').toLowerCase();
    const looksLikeVod = VOD_GROUP_HINTS.some((h) => group.includes(h)) || /\.(mp4|mkv|avi)(\?|$)/i.test(e.url);
    if (looksLikeVod) vodEntries.push(e);
    else channelEntries.push(e);
  }
  return { channelEntries, vodEntries };
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function m3uEntryToChannel(entry: M3UEntry, index: number): Channel {
  const format: Channel['format'] = /\.m3u8(\?|$)/i.test(entry.url) ? '.m3u8' : '.ts';
  return {
    id: `m3u_live_${index}_${hashString(entry.url)}`,
    name: entry.name,
    streamUrl: entry.url,
    category: entry.groupTitle || 'Genel',
    logo: entry.logo || '',
    number: index + 1,
    currentShow: '',
    nextShow: '',
    epgStart: '',
    epgEnd: '',
    progress: 0,
    resolution: 'HD',
    format,
    isFavorite: false,
  };
}

export function m3uEntryToMovie(entry: M3UEntry, index: number): Movie {
  const yearMatch = entry.name.match(/\((\d{4})\)\s*$/);
  const title = yearMatch ? entry.name.slice(0, yearMatch.index).trim() : entry.name;
  return {
    id: `m3u_vod_${index}_${hashString(entry.url)}`,
    title,
    year: yearMatch ? Number(yearMatch[1]) : new Date().getFullYear(),
    rating: '-',
    duration: '',
    poster: entry.logo || '',
    backdrop: entry.logo || '',
    genres: entry.groupTitle ? [entry.groupTitle] : [],
    synopsis: '',
    cast: [],
    director: '',
    streamUrl: entry.url,
    category: entry.groupTitle || 'Genel',
    isFavorite: false,
  };
}

export async function fetchM3UFromUrl(url: string): Promise<string> {
  const res = await fetch(proxiedApiUrl(url));
  if (!res.ok) {
    throw new Error(`M3U listesi indirilemedi (HTTP ${res.status}). Adresi kontrol edin.`);
  }
  const text = await res.text();
  if (!text.includes('#EXT')) {
    throw new Error('Bu adres geçerli bir M3U listesi döndürmedi.');
  }
  return text;
}

export function readM3UFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsText(file);
  });
}

// --- Series grouping ---------------------------------------------------------
//
// M3U/M3U8 sources (unlike Xtream's structured get_series endpoint) almost
// always list a TV series as one flat #EXTINF entry per episode - e.g.
// "Friends S01E01", "Friends S01E02", "Friends S01E03" ... each with its own
// (often generic) poster. Rendered as-is, a 24-episode series becomes 24
// separate poster cards instead of one "Friends" card you tap into - this is
// what groups entries that share a detected series name into a single
// Series object with real Season/Episode nesting, matching how Xtream
// accounts already present series.

export interface ParsedSeriesInfo {
  seriesName: string;
  seasonNum: number;
  episodeNum: number;
}

const EPISODE_PATTERNS: RegExp[] = [
  /^(.*?)[\s._-]*S(\d{1,2})[\s._-]*[EB](\d{1,3})\b/i,
  /^(.*?)[\s._-]*(?<![\d])(\d{1,2})x(\d{1,3})(?![\d])/i,
  /^(.*?)[\s._-]*(\d{1,2})\s*\.?\s*sezon[\s._-]*(\d{1,3})\s*\.?\s*b[öo]l[üu]m/i,
];

function cleanSeriesName(raw: string): string {
  return raw
    .replace(/[\[(][^\])]*[\])]/g, '')
    .replace(/[-_.:|\s]+$/, '')
    .trim();
}

export function parseSeriesInfoFromName(name: string): ParsedSeriesInfo | null {
  for (const pattern of EPISODE_PATTERNS) {
    const m = name.match(pattern);
    if (!m) continue;
    const seriesName = cleanSeriesName(m[1]);
    const seasonNum = Number(m[2]);
    const episodeNum = Number(m[3]);
    if (!seriesName || !Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) continue;
    if (seasonNum <= 0 || episodeNum <= 0) continue;
    return { seriesName, seasonNum, episodeNum };
  }
  return null;
}

export function groupSeriesFromEntries(
  entries: M3UEntry[]
): { movieEntries: M3UEntry[]; seriesList: Series[] } {
  const movieEntries: M3UEntry[] = [];
  const seriesBuckets = new Map<string, { displayName: string; category: string; logo: string; episodes: (Episode & { seasonNum: number })[] }>();

  entries.forEach((entry, index) => {
    const info = parseSeriesInfoFromName(entry.name);
    if (!info) {
      movieEntries.push(entry);
      return;
    }
    const key = info.seriesName.toLocaleLowerCase('tr');
    if (!seriesBuckets.has(key)) {
      seriesBuckets.set(key, { displayName: info.seriesName, category: entry.groupTitle || 'Genel', logo: entry.logo || '', episodes: [] });
    }
    const bucket = seriesBuckets.get(key)!;
    if (!bucket.logo && entry.logo) bucket.logo = entry.logo;
    bucket.episodes.push({
      episodeNum: info.episodeNum,
      title: `Bölüm ${info.episodeNum}`,
      duration: '',
      streamUrl: entry.url,
      plot: '',
      thumbnail: entry.logo || '',
      seasonNum: info.seasonNum,
    });
  });

  const seriesList: Series[] = Array.from(seriesBuckets.entries()).map(([key, bucket], seriesIndex) => {
    const seasonNums = Array.from(new Set(bucket.episodes.map((e) => e.seasonNum))).sort((a, b) => a - b);
    const seasons: Season[] = seasonNums.map((seasonNum) => ({
      seasonNum,
      title: `Sezon ${seasonNum}`,
      episodes: bucket.episodes
        .filter((e) => e.seasonNum === seasonNum)
        .sort((a, b) => a.episodeNum - b.episodeNum)
        .map(({ seasonNum: _drop, ...ep }) => ep),
    }));
    return {
      id: `m3u_series_${seriesIndex}_${hashString(key)}`,
      title: bucket.displayName,
      year: new Date().getFullYear(),
      rating: '-',
      seasonsCount: seasons.length,
      poster: bucket.logo,
      backdrop: bucket.logo,
      genres: bucket.category ? [bucket.category] : [],
      synopsis: '',
      cast: [],
      director: '',
      category: bucket.category,
      seasons,
      isFavorite: false,
    } satisfies Series;
  });

  return { movieEntries, seriesList };
}
