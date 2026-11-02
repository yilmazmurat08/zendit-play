import type { Channel, Movie, Series, Season, Episode } from '../types';
import type { EpgProgramme } from './epg';
import { proxiedApiUrl } from './proxy';

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export class XtreamApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'XtreamApiError';
    this.status = status;
  }
}

export interface XtreamAccountMeta {
  status: string;
  expiryDate: string | null;
  isTrial: boolean;
  maxConnections: number | null;
  /** server_info.timezone (e.g. "Europe/Istanbul"): catch-up addresses use the server's local time. */
  serverTimezone: string;
}

export interface XtreamLoadProgress {
  stage: 'auth' | 'live' | 'movies' | 'series' | 'done';
  channelsLoaded: number;
  moviesLoaded: number;
  seriesLoaded: number;
}

export interface XtreamLoadResult {
  channels: Channel[];
  movies: Movie[];
  series: Series[];
  meta: XtreamAccountMeta;
}

export function normalizeServerUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

function apiUrl(creds: XtreamCredentials, action?: string, extraParams?: Record<string, string | number>): string {
  const base = normalizeServerUrl(creds.serverUrl);
  const params = new URLSearchParams({ username: creds.username, password: creds.password });
  if (action) params.set('action', action);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) params.set(k, String(v));
  }
  return `${base}/player_api.php?${params.toString()}`;
}

async function xtreamFetch<T>(
  creds: XtreamCredentials,
  action?: string,
  extraParams?: Record<string, string | number>
): Promise<T> {
  const target = apiUrl(creds, action, extraParams);
  let res: Response;
  try {
    res = await fetch(proxiedApiUrl(target), { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new XtreamApiError('Sunucu zaman aşımına uğradı. Adresi ve bağlantınızı kontrol edin.');
    }
    throw new XtreamApiError('Sunucuya bağlanılamadı. Sunucu adresini ve internet bağlantınızı kontrol edin.');
  }
  if (!res.ok) {
    throw new XtreamApiError(`Sunucu ${res.status} koduyla yanıt verdi.`, res.status);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new XtreamApiError('Sunucudan geçerli bir yanıt alınamadı. Bu adres bir Xtream Codes paneli olmayabilir.');
  }
}

export async function xtreamLogin(creds: XtreamCredentials): Promise<XtreamAccountMeta> {
  const data = await xtreamFetch<any>(creds);
  const userInfo = data?.user_info;
  if (!userInfo) {
    throw new XtreamApiError('Sunucudan hesap bilgisi alınamadı. Sunucu adresini kontrol edin.');
  }
  if (String(userInfo.auth) === '0') {
    throw new XtreamApiError('Kullanıcı adı veya şifre hatalı.');
  }
  const status = String(userInfo.status || 'Active');
  if (status.toLowerCase() === 'expired') {
    throw new XtreamApiError('Bu hesabın süresi dolmuş.');
  }
  if (status.toLowerCase() === 'banned' || status.toLowerCase() === 'disabled') {
    throw new XtreamApiError('Bu hesap devre dışı bırakılmış.');
  }
  const expTimestamp = userInfo.exp_date ? Number(userInfo.exp_date) : null;
  return {
    status,
    expiryDate: expTimestamp ? new Date(expTimestamp * 1000).toISOString().slice(0, 10) : null,
    isTrial: String(userInfo.is_trial) === '1',
    maxConnections: userInfo.max_connections ? Number(userInfo.max_connections) : null,
    serverTimezone: typeof data?.server_info?.timezone === 'string' ? data.server_info.timezone.trim() : '',
  };
}

interface RawCategory {
  category_id: string;
  category_name: string;
}

async function fetchCategoryMap(creds: XtreamCredentials, action: string): Promise<Map<string, string>> {
  const raw = await xtreamFetch<RawCategory[]>(creds, action);
  const map = new Map<string, string>();
  if (Array.isArray(raw)) {
    for (const c of raw) map.set(String(c.category_id), c.category_name || 'Kategori');
  }
  return map;
}

function ratingToTenScale(raw: any): string {
  if (raw?.rating !== undefined && raw?.rating !== null && raw.rating !== '') return String(raw.rating);
  if (raw?.rating_5based !== undefined && raw?.rating_5based !== null && raw.rating_5based !== '') {
    return (Number(raw.rating_5based) * 2).toFixed(1).replace(/\.0$/, '');
  }
  return '-';
}

function formatDurationTr(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}dk`;
  return `${hours}s ${minutes}dk`;
}

function extractYear(dateStr: string | undefined): number {
  const match = (dateStr || '').match(/(\d{4})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

/** First non-empty string (panels send the trailer as youtube_trailer, some as trailer). */
function firstText(...values: unknown[]): string | undefined {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

/** Days of archive (catch-up) a channel offers; undefined when it has none. */
function archiveDaysOf(tvArchive: unknown, duration: unknown): number | undefined {
  if (!(tvArchive === 1 || tvArchive === '1' || tvArchive === true)) return undefined;
  const days = Math.floor(Number(duration) || 0);
  return days > 0 ? days : 1;
}

function adultFlag(value: unknown): true | undefined {
  return value === 1 || value === '1' || value === true ? true : undefined;
}

interface RawLiveStream {
  num: number;
  name: string;
  stream_id: number;
  stream_icon?: string;
  category_id?: string;
  epg_channel_id?: string | null;
  is_adult?: number | string;
  tv_archive?: number | string;
  tv_archive_duration?: number | string;
}

export function buildLiveStreamUrl(creds: XtreamCredentials, streamId: number, ext: 'm3u8' | 'ts'): string {
  const base = normalizeServerUrl(creds.serverUrl);
  return `${base}/live/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${streamId}.${ext}`;
}

async function fetchChannels(creds: XtreamCredentials, liveFormat: '.ts' | '.m3u8' | '.mpd'): Promise<Channel[]> {
  const categories = await fetchCategoryMap(creds, 'get_live_categories');
  const raw = await xtreamFetch<RawLiveStream[]>(creds, 'get_live_streams');
  const ext: 'm3u8' | 'ts' = liveFormat === '.ts' ? 'ts' : 'm3u8';
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    id: `live_${r.stream_id}`,
    name: r.name || `Kanal ${r.num}`,
    streamUrl: buildLiveStreamUrl(creds, r.stream_id, ext),
    category: categories.get(String(r.category_id)) || 'Diğer',
    logo: r.stream_icon || '',
    number: Number(r.num) || r.stream_id,
    currentShow: '',
    nextShow: '',
    epgStart: '',
    epgEnd: '',
    progress: 0,
    resolution: 'HD',
    format: ext === 'ts' ? '.ts' : '.m3u8',
    isFavorite: false,
    streamId: r.stream_id,
    epgId: r.epg_channel_id ? String(r.epg_channel_id) : undefined,
    isAdult: adultFlag(r.is_adult),
    archiveDays: archiveDaysOf(r.tv_archive, r.tv_archive_duration),
  }));
}

interface RawVodStream {
  num: number;
  name: string;
  stream_id: number;
  stream_icon?: string;
  category_id?: string;
  container_extension?: string;
  rating?: string | number;
  rating_5based?: string | number;
  is_adult?: number | string;
}

export function buildVodStreamUrl(creds: XtreamCredentials, streamId: number, ext: string): string {
  const base = normalizeServerUrl(creds.serverUrl);
  return `${base}/movie/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${streamId}.${ext}`;
}

async function fetchMovies(creds: XtreamCredentials): Promise<Movie[]> {
  const categories = await fetchCategoryMap(creds, 'get_vod_categories');
  const raw = await xtreamFetch<RawVodStream[]>(creds, 'get_vod_streams');
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const ext = r.container_extension || 'mp4';
    return {
      id: `vod_${r.stream_id}`,
      title: r.name || 'Film',
      year: extractYear(r.name),
      rating: ratingToTenScale(r),
      duration: '',
      poster: r.stream_icon || '',
      backdrop: r.stream_icon || '',
      genres: [],
      synopsis: '',
      cast: [],
      director: '',
      streamUrl: buildVodStreamUrl(creds, r.stream_id, ext),
      category: categories.get(String(r.category_id)) || 'Diğer',
      isFavorite: false,
      isAdult: adultFlag(r.is_adult),
    } satisfies Movie;
  });
}

export async function fetchVodDetail(creds: XtreamCredentials, movie: Movie): Promise<Partial<Movie>> {
  if (!movie.id.startsWith('vod_')) return {};
  const streamId = Number(movie.id.slice('vod_'.length));
  if (!Number.isFinite(streamId)) return {};
  const data = await xtreamFetch<any>(creds, 'get_vod_info', { vod_id: streamId });
  const info = data?.info || {};
  const movieData = data?.movie_data || {};
  const ext = movieData.container_extension || undefined;
  return {
    synopsis: info.plot || movie.synopsis,
    cast: info.cast ? String(info.cast).split(',').map((s: string) => s.trim()).filter(Boolean) : movie.cast,
    director: info.director || movie.director,
    genres: info.genre ? String(info.genre).split(',').map((s: string) => s.trim()).filter(Boolean) : movie.genres,
    duration: info.duration_secs ? formatDurationTr(Number(info.duration_secs)) : movie.duration,
    backdrop: info.backdrop_path?.[0] || info.movie_image || movie.backdrop,
    poster: info.movie_image || movie.poster,
    rating: info.rating ? String(info.rating) : movie.rating,
    streamUrl: ext ? buildVodStreamUrl(creds, streamId, ext) : movie.streamUrl,
    trailer: firstText(info.youtube_trailer, info.trailer) || movie.trailer,
  };
}

interface RawSeries {
  series_id: number;
  name: string;
  cover?: string;
  backdrop_path?: string[];
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string | number;
  rating_5based?: string | number;
  category_id?: string;
  youtube_trailer?: string;
  trailer?: string;
  is_adult?: number | string;
}

export function buildSeriesEpisodeUrl(creds: XtreamCredentials, episodeId: number, ext: string): string {
  const base = normalizeServerUrl(creds.serverUrl);
  return `${base}/series/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${episodeId}.${ext}`;
}

async function fetchSeriesList(creds: XtreamCredentials): Promise<Series[]> {
  const categories = await fetchCategoryMap(creds, 'get_series_categories');
  const raw = await xtreamFetch<RawSeries[]>(creds, 'get_series');
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    id: `series_${r.series_id}`,
    title: r.name || 'Dizi',
    year: extractYear(r.releaseDate),
    rating: ratingToTenScale(r),
    seasonsCount: 0,
    poster: r.cover || '',
    backdrop: r.backdrop_path?.[0] || r.cover || '',
    genres: r.genre ? r.genre.split(',').map((s) => s.trim()).filter(Boolean) : [],
    synopsis: r.plot || '',
    cast: r.cast ? r.cast.split(',').map((s) => s.trim()).filter(Boolean) : [],
    director: r.director || '',
    category: categories.get(String(r.category_id)) || 'Diğer',
    seasons: [],
    isFavorite: false,
    trailer: firstText(r.youtube_trailer, r.trailer),
    isAdult: adultFlag(r.is_adult),
  } satisfies Series));
}

export async function fetchSeriesDetail(creds: XtreamCredentials, series: Series): Promise<Partial<Series>> {
  if (!series.id.startsWith('series_')) return {};
  const seriesId = Number(series.id.slice('series_'.length));
  if (!Number.isFinite(seriesId)) return {};
  const data = await xtreamFetch<any>(creds, 'get_series_info', { series_id: seriesId });
  const info = data?.info || {};
  const episodesBySeason: Record<string, any[]> = data?.episodes || {};

  const seasons: Season[] = Object.keys(episodesBySeason)
    .map(Number)
    .sort((a, b) => a - b)
    .map((seasonNum) => {
      const rawEpisodes = episodesBySeason[String(seasonNum)] || [];
      const episodes: Episode[] = rawEpisodes
        .slice()
        .sort((a: any, b: any) => Number(a.episode_num) - Number(b.episode_num))
        .map((ep: any) => {
          const ext = ep.container_extension || 'mp4';
          return {
            episodeNum: Number(ep.episode_num),
            title: ep.title || `Bölüm ${ep.episode_num}`,
            duration: ep.info?.duration ? String(ep.info.duration) : formatDurationTr(Number(ep.info?.duration_secs || 0)),
            streamUrl: buildSeriesEpisodeUrl(creds, Number(ep.id), ext),
            plot: ep.info?.plot || '',
            thumbnail: ep.info?.movie_image || series.poster,
            rating: ep.info?.rating ? String(ep.info.rating) : undefined,
          } satisfies Episode;
        });
      return { seasonNum, title: `Sezon ${seasonNum}`, episodes } satisfies Season;
    });

  return {
    seasons,
    seasonsCount: seasons.length,
    synopsis: info.plot || series.synopsis,
    cast: info.cast ? String(info.cast).split(',').map((s: string) => s.trim()).filter(Boolean) : series.cast,
    director: info.director || series.director,
    genres: info.genre ? String(info.genre).split(',').map((s: string) => s.trim()).filter(Boolean) : series.genres,
    backdrop: info.backdrop_path?.[0] || series.backdrop,
    poster: info.cover || series.poster,
    trailer: firstText(info.youtube_trailer, info.trailer) || series.trailer,
  };
}

/** The panel's XMLTV guide (xmltv.php) for the EPG download. */
export function xmltvUrl(creds: XtreamCredentials): string {
  const base = normalizeServerUrl(creds.serverUrl);
  const params = new URLSearchParams({ username: creds.username, password: creds.password });
  return `${base}/xmltv.php?${params.toString()}`;
}

/** get_short_epg address; the native player uses it for channels the XMLTV guide does not cover. */
export function shortEpgUrl(creds: XtreamCredentials, streamId: number, limit: number = 6): string {
  return apiUrl(creds, 'get_short_epg', { stream_id: streamId, limit });
}

export interface ShortEpgResult {
  currentShow: string;
  nextShow: string;
  epgStart: string;
  epgEnd: string;
  progress: number;
}

function decodeEpgBase64(value: string | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(
      atob(value)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    ).trim();
  } catch {
    return value;
  }
}

/** "2026-10-05 21:00:00" (panel local time) to epoch ms; used when the *_timestamp fields are missing. */
function parseEpgTime(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
}

function formatHHmm(ms: number): string {
  if (!ms) return '--:--';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toProgramme(l: any): EpgProgramme {
  const start = Number(l.start_timestamp) * 1000 || parseEpgTime(l.start);
  const stop = Number(l.stop_timestamp ?? l.end_timestamp) * 1000 || parseEpgTime(l.end ?? l.stop);
  return { start, stop, title: decodeEpgBase64(l.title), desc: decodeEpgBase64(l.description) || undefined };
}

/** Upcoming programmes of one channel from get_short_epg (now, next, ...). */
export async function fetchShortEpgList(creds: XtreamCredentials, streamId: number, limit: number = 6): Promise<EpgProgramme[]> {
  try {
    const data = await xtreamFetch<any>(creds, 'get_short_epg', { stream_id: streamId, limit });
    const listings: any[] = Array.isArray(data?.epg_listings) ? data.epg_listings : [];
    return listings
      .map(toProgramme)
      .filter((p) => p.start > 0 && p.stop > p.start && p.title)
      .sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

/** Full schedule of one channel including past days (get_simple_data_table), for catch-up. */
export async function fetchArchiveEpg(creds: XtreamCredentials, streamId: number): Promise<EpgProgramme[]> {
  try {
    const data = await xtreamFetch<any>(creds, 'get_simple_data_table', { stream_id: streamId });
    const listings: any[] = Array.isArray(data?.epg_listings) ? data.epg_listings : [];
    const seen = new Set<number>();
    return listings
      .map(toProgramme)
      .filter((p) => {
        if (!(p.start > 0 && p.stop > p.start && p.title) || seen.has(p.start)) return false;
        seen.add(p.start);
        return true;
      })
      .sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

/** Now / next texts and progress for the channel lists. */
export function nowAndNext(programmes: EpgProgramme[], now: number = Date.now()): ShortEpgResult | null {
  const current = programmes.find((p) => p.start <= now && now < p.stop);
  if (!current) return null;
  const next = programmes.find((p) => p.start >= current.stop);
  return {
    currentShow: current.title,
    nextShow: next?.title || '',
    epgStart: formatHHmm(current.start),
    epgEnd: formatHHmm(current.stop),
    progress: Math.min(100, Math.max(0, Math.round(((now - current.start) / (current.stop - current.start)) * 100))),
  };
}

export async function fetchShortEpg(creds: XtreamCredentials, streamId: number): Promise<ShortEpgResult | null> {
  return nowAndNext(await fetchShortEpgList(creds, streamId));
}

export async function loadXtreamAccount(
  creds: XtreamCredentials,
  liveFormat: '.ts' | '.m3u8' | '.mpd' = '.m3u8',
  onProgress?: (p: XtreamLoadProgress) => void
): Promise<XtreamLoadResult> {
  onProgress?.({ stage: 'auth', channelsLoaded: 0, moviesLoaded: 0, seriesLoaded: 0 });
  const meta = await xtreamLogin(creds);

  onProgress?.({ stage: 'live', channelsLoaded: 0, moviesLoaded: 0, seriesLoaded: 0 });
  const channels = await fetchChannels(creds, liveFormat);

  onProgress?.({ stage: 'movies', channelsLoaded: channels.length, moviesLoaded: 0, seriesLoaded: 0 });
  const movies = await fetchMovies(creds);

  onProgress?.({ stage: 'series', channelsLoaded: channels.length, moviesLoaded: movies.length, seriesLoaded: 0 });
  const series = await fetchSeriesList(creds);

  onProgress?.({ stage: 'done', channelsLoaded: channels.length, moviesLoaded: movies.length, seriesLoaded: series.length });

  return { channels, movies, series, meta };
}

/**
 * Most real-world "M3U links" IPTV resellers hand out are actually an
 * Xtream Codes panel's M3U-generation endpoint with the login embedded in
 * the URL - not a genuinely static playlist. When that's the case, using
 * the real Xtream API instead of downloading/parsing the M3U text gives
 * accurate series/season/episode grouping, ratings, synopsis and EPG
 * straight from the panel, rather than guessing series groupings from
 * episode names. This mirrors what production IPTV apps do: detect the
 * shape, verify it against the API, and only fall back to plain M3U if
 * that fails.
 *
 * Recognizes the two standard shapes real panels use:
 *   - .../get.php?username=X&password=Y  (the universal Xtream spec)
 *   - .../playlist/USER/PASS/m3u...       (older panel exports)
 */
export function detectXtreamFromM3uUrl(m3uUrl: string): XtreamCredentials | null {
  let url: URL;
  try {
    url = new URL(m3uUrl.trim());
  } catch {
    return null;
  }

  if (/\/get\.php$/i.test(url.pathname)) {
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');
    if (username && password) {
      return { serverUrl: `${url.protocol}//${url.host}`, username, password };
    }
  }

  const pathMatch = url.pathname.match(/\/playlist\/([^/]+)\/([^/]+)\/m3u/i);
  if (pathMatch) {
    try {
      return {
        serverUrl: `${url.protocol}//${url.host}`,
        username: decodeURIComponent(pathMatch[1]),
        password: decodeURIComponent(pathMatch[2]),
      };
    } catch {
      return null;
    }
  }

  return null;
}
