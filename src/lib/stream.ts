const SAFE_DIRECT_HOSTS = new Set(['commondatastorage.googleapis.com']);

function isSafeDirectUrl(raw: string): boolean {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const u = new URL(raw, currentOrigin);
    if (u.origin === currentOrigin) return true;
    return SAFE_DIRECT_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function isDemoSampleUrl(raw: string): boolean {
  try {
    return ['commondatastorage.googleapis.com', 'download.blender.org'].includes(new URL(raw, 'http://localhost').hostname);
  } catch {
    return false;
  }
}

export type StreamKind = 'hls' | 'mpegts' | 'native';

export function detectStreamKind(rawUrl: string, media?: { format?: '.ts' | '.m3u8' } | any | null): StreamKind {
  if (media?.format) {
    return media.format === '.m3u8' ? 'hls' : 'mpegts';
  }
  try {
    const path = new URL(rawUrl, 'http://localhost').pathname;
    if (/\.m3u8?$/i.test(path)) return 'hls';
    if (/\.ts$/i.test(path)) return 'mpegts';
  } catch {
    // fall through to 'native' below
  }
  return 'native';
}

function isRunningNatively(): boolean {
  try {
    return Boolean((window as any)?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function proxiedApiUrl(targetUrl: string): string {
  if (isRunningNatively()) return targetUrl;
  return `/api/xtream?target=${encodeURIComponent(targetUrl)}`;
}

export function proxiedStreamUrl(targetUrl: string): string {
  if (isRunningNatively()) return targetUrl;
  if (isSafeDirectUrl(targetUrl)) return targetUrl;
  return `/api/stream?url=${encodeURIComponent(targetUrl)}`;
}
