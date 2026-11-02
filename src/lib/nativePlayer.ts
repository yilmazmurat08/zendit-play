import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/** Rectangle in device pixels, relative to the top-left corner of the WebView. */
export interface NativeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One entry of the native player's playlist (see PlayerItem.java). */
export interface NativePlayerItem {
  id?: string;
  url: string;
  title?: string;
  subtitle?: string;
  /** 'catchup' = archive playback of a live channel. */
  kind?: 'live' | 'movie' | 'series' | 'catchup';
  /** Channel number shown in the overlay (live only). */
  number?: number;
  userAgent?: string;
  /** Xtream short-EPG address for the now/next overlay (live only). */
  shortEpgUrl?: string;
  startPositionMs?: number;
  /** Catch-up template and server time zone, so the player can rewind live channels. */
  catchup?: string;
  catchupTz?: string;
  archiveDays?: number;
}

/** Playback preferences passed to the native player (see PlayerConfig.java). */
export interface NativePlayerConfig {
  bufferSize?: 'low' | 'normal' | 'high';
  hardwareAcceleration?: boolean;
  audioLanguage?: string;
  subtitleLanguage?: string;
  subtitleScale?: number;
  aspectMode?: string;
  autoPlayNext?: boolean;
}

/** Per-item watch report returned when the native player closes. */
export interface NativePlayerSession {
  id: string;
  watchedMs: number;
  positionMs: number;
  durationMs: number;
  completed: boolean;
}

export interface NativePlayerResult {
  lastIndex?: number;
  lastId?: string;
  /** Aspect mode / subtitle size the viewer picked inside the player. */
  aspectMode?: string;
  subtitleScale?: number;
  sessions?: NativePlayerSession[];
}

export interface InstalledPlayers {
  vlc: boolean;
  mx: boolean;
}

export interface NativeDeviceInfo {
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdk: number;
  isTv: boolean;
  appVersion: string;
  webCacheBytes: number;
}

/**
 * Bridge to the Android `NativePlayer` plugin (Media3 ExoPlayer), see
 * android/app/src/main/java/com/zendit/play/NativePlayerPlugin.java.
 */
export interface NativePlayerPlugin {
  /** Opens the fullscreen player; resolves with a watch report when the viewer closes it again. */
  play(options: {
    items?: NativePlayerItem[];
    index?: number;
    config?: NativePlayerConfig;
    /** Single-stream shorthand, used when `items` is empty. */
    url?: string;
    title?: string;
    live?: boolean;
  }): Promise<NativePlayerResult>;
  /** Hands the stream to an installed player app (VLC, MX Player or the system chooser). */
  openExternal(options: { url: string; title?: string; player?: 'vlc' | 'mx' | 'system' }): Promise<void>;
  /** Opens a trailer in the YouTube app (or the browser). */
  openTrailer(options: { youtubeId?: string; url?: string }): Promise<void>;
  /** Which external player apps are installed. */
  players(): Promise<InstalledPlayers>;
  deviceInfo(): Promise<NativeDeviceInfo>;
  /** Clears the WebView and app cache folders. */
  clearCache(): Promise<void>;
  /** Live TV preview: a native video view drawn over the WebView at `rect`. */
  startPreview(options: NativeRect & { url: string }): Promise<void>;
  updatePreview(options: NativeRect): Promise<void>;
  stopPreview(): Promise<void>;
  addListener(eventName: 'previewPlaying', listener: () => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'previewError', listener: (event: { message: string }) => void): Promise<PluginListenerHandle>;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>('NativePlayer');

/** True inside the Android app, false in the browser / AI Studio preview. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** The element's on-screen rectangle in device pixels, as the native preview expects it. */
export function toNativeRect(el: Element): NativeRect {
  const r = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: Math.round(r.left * dpr),
    y: Math.round(r.top * dpr),
    width: Math.round(r.width * dpr),
    height: Math.round(r.height * dpr),
  };
}
