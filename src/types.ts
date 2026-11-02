export type TabType = 'home' | 'live' | 'movies' | 'series' | 'settings';

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
  type: 'xtream' | 'm3u_url' | 'm3u_file' | 'demo';
  isActive: boolean;
  expiryDate?: string;
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
  lastWatchedEpisode?: {
    seasonNum: number;
    episodeNum: number;
    title: string;
    progress: number;
  };
}

export interface CategoryStat {
  name: string;
  views: number;
  percentage: number;
}

export interface WatchStats {
  total: number;
  movies: number;
  series: number;
  liveTv: number;
  moviesPercentage: number;
  seriesPercentage: number;
  livePercentage: number;
  topCategories: CategoryStat[];
  dailyStreak: number;
  totalHoursWatched: number;
  scannedPhotosCount: number;
  scannedVideosCount: number;
  cacheSizeMB: number;
}

export interface AppSettings {
  playerEngine: 'exo' | 'intent'; // 'exo' = Sistem (Dahili ExoPlayer), 'intent' = Harici (Cihaz Oynatıcısı)
  language: 'tr' | 'en' | 'de';
  startupBehavior: 'home' | 'last_channel';
  autoRefresh: boolean;
  liveStreamFormat: '.ts' | '.m3u8' | '.mpd';
  changePlayerVOD: 'exo' | 'vlc' | 'mx';
  changePlayerLive: 'exo' | 'vlc' | 'mx';
  autoPlayNext: boolean;
  epgEnabled: boolean;
  hardwareAcceleration: boolean;
  bufferSize: 'low' | 'normal' | 'high';
  audioTrack: string;
  subtitleTrack: string;
}

