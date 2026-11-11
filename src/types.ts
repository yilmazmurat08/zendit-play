export type TabType = 'home' | 'live' | 'guide' | 'continue' | 'movies' | 'series' | 'settings';

export interface WatchHistoryEntry {
  id: string;
  type: 'movie' | 'series' | 'live';
  at: number;
}

export interface XtreamAccount {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password?: string;
  type: 'xtream' | 'm3u_url' | 'm3u_file';
  isActive: boolean;
  expiryDate?: string;
  /** Concurrent connections allowed by the panel (Xtream `max_connections`). */
  maxConnections?: number | null;
  isTrial?: boolean;
  /** IANA time zone reported by the panel; used to build catch-up URLs. */
  serverTimezone?: string;
  /** XMLTV guide address advertised by the playlist (`url-tvg`). */
  epgUrl?: string;
  /** Last successful list refresh (ms). */
  lastRefreshAt?: number;
  status?: 'active' | 'expired' | 'connecting';
  channelsCount?: number;
  moviesCount?: number;
  seriesCount?: number;
}

export interface Channel {
  id: string;
  name: string;
  streamUrl: string;
  category: string;
  logo: string;
  number: number;
  currentShow: string;
  nextShow: string;
  epgStart: string;
  epgEnd: string;
  progress: number;
  resolution: '4K' | 'FHD' | 'HD' | 'SD';
  format: '.ts' | '.m3u8';
  isFavorite: boolean;
  streamId?: number;
  /** XMLTV channel id used to match guide data. */
  epgId?: string;
  isAdult?: boolean;
  /** Days of catch-up archive the provider keeps (0 = none). */
  archiveDays?: number;
  /** M3U catch-up template (`catchup-source`). */
  catchupSource?: string;
  /** Per-channel User-Agent from the playlist. */
  userAgent?: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  rating: string;
  duration: string;
  poster: string;
  backdrop: string;
  genres: string[];
  synopsis: string;
  cast: string[];
  director: string;
  streamUrl: string;
  category: string;
  progress?: number;
  isFavorite: boolean;
  addedDate?: string;
  /** YouTube id or URL of the trailer, when the panel provides one. */
  trailer?: string;
  isAdult?: boolean;
}

export interface Episode {
  episodeNum: number;
  title: string;
  duration: string;
  streamUrl: string;
  plot: string;
  thumbnail: string;
  rating?: string;
  progress?: number;
}

export interface Season {
  seasonNum: number;
  title: string;
  episodes: Episode[];
}

export interface Series {
  id: string;
  title: string;
  year: number;
  rating: string;
  seasonsCount: number;
  poster: string;
  backdrop: string;
  genres: string[];
  synopsis: string;
  cast: string[];
  director: string;
  category: string;
  seasons: Season[];
  isFavorite: boolean;
  addedDate?: string;
  trailer?: string;
  isAdult?: boolean;
  lastWatchedEpisode?: {
    seasonNum: number;
    episodeNum: number;
    title: string;
    progress: number;
  };
}

export type PlayerChoice = 'exo' | 'vlc' | 'mx' | 'system';

export interface ParentalConfig {
  enabled: boolean;
  /** SHA-256 of salt + PIN; empty when no PIN is set. */
  pinHash: string;
  salt: string;
  /** Per-category overrides: `kind:name` -> locked (true) or unlocked (false). */
  overrides: Record<string, boolean>;
}

export interface WatchLogEntry {
  id: string;
  kind: 'live' | 'movie' | 'series';
  title: string;
  category?: string;
  /** Start time (ms). */
  at: number;
  /** Watched duration (ms). */
  ms: number;
}

export interface AppSettings {
  playerEngine: 'exo' | 'intent'; // 'exo' = Sistem (Dahili ExoPlayer), 'intent' = Harici (Cihaz Oynatıcısı)
  language: string;
  startupBehavior: 'home' | 'live' | 'last_channel';
  autoRefresh: boolean;
  liveStreamFormat: '.ts' | '.m3u8' | '.mpd';
  changePlayerVOD: PlayerChoice;
  changePlayerLive: PlayerChoice;
  autoPlayNext: boolean;
  /** Play trailers inside the app instead of opening YouTube. */
  trailerInApp: boolean;
  /** Resume movies and episodes where they were left. */
  resumePlayback: boolean;
  epgEnabled: boolean;
  /** Custom XMLTV address; empty = use the provider's guide. */
  epgUrl: string;
  epgOffsetHours: number;
  hardwareAcceleration: boolean;
  bufferSize: 'low' | 'normal' | 'high';
  audioTrack: string;
  subtitleTrack: string;
  subtitleScale: number;
  aspectMode: 'fit' | 'fill' | 'zoom' | '16:9' | '4:3';
  parental: ParentalConfig;
}
