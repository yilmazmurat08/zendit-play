import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/** Rectangle in device pixels, relative to the top-left corner of the WebView. */
export interface NativeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bridge to the Android `NativePlayer` plugin (Media3 ExoPlayer), see
 * android/app/src/main/java/com/zendit/play/NativePlayerPlugin.java.
 */
export interface NativePlayerPlugin {
  /** Opens the fullscreen player; resolves when the viewer closes it again. */
  play(options: { url: string; title?: string; live?: boolean }): Promise<void>;
  /** Hands the stream to an installed player app (VLC, MX Player...) with an Android VIEW intent. */
  openExternal(options: { url: string; title?: string }): Promise<void>;
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
