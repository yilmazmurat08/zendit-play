/**
 * Android Intent & External Video Player Helper for Zendit Play
 *
 * Launches installed Android video players (VLC, MX Player, Just Player, system player)
 * using standard Android intent:// URIs or protocol handlers.
 */

export interface ExternalPlayerApp {
  id: 'system' | 'vlc' | 'mx' | 'just';
  name: string;
  packageName?: string;
  badge: string;
  description: string;
}

export const AVAILABLE_EXTERNAL_PLAYERS: ExternalPlayerApp[] = [
  {
    id: 'system',
    name: 'Cihazın Oynatıcısı (Varsayılan)',
    badge: 'Android',
    description: 'Cihazınızda yüklü varsayılan video oynatıcıyı veya uygulama seçim menüsünü açar.',
  },
  {
    id: 'vlc',
    name: 'VLC for Android',
    packageName: 'org.videolan.vlc',
    badge: 'Tavsiye Edilen',
    description: 'MPEG-TS ve HLS akışlarında en yüksek kodek ve altyazı uyumluluğu.',
  },
  {
    id: 'mx',
    name: 'MX Player',
    packageName: 'com.mxtech.videoplayer.ad',
    badge: 'HW+ Hızlandırma',
    description: 'Donanım hızlandırmalı video ve çok kanallı ses desteği.',
  },
  {
    id: 'just',
    name: 'Just (Player)',
    packageName: 'com.brouken.player',
    badge: 'Hafif & Açık Kaynak',
    description: 'ExoPlayer tabanlı, reklamsız minimalist video oynatıcı.',
  },
];

export function isAndroidEnvironment(): boolean {
  try {
    return /android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * Checks if the current client is Android (Browser or native Capacitor).
 */
export function isAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitorAndroid = (window as any).Capacitor?.getPlatform?.() === 'android';
  return isAndroidEnvironment() || isCapacitorAndroid;
}

/**
 * Builds an Android intent:// URI for the specified stream and optional target package.
 */
export function buildAndroidIntentUrl(streamUrl: string, title?: string, packageName?: string): string {
  try {
    const url = new URL(streamUrl);
    const scheme = url.protocol.replace(':', '');
    const rest = streamUrl.slice(scheme.length + 3);
    let intent = `intent://${rest}#Intent;scheme=${scheme};action=android.intent.action.VIEW;type=video/*`;
    if (packageName) {
      intent += `;package=${packageName}`;
    }
    if (title) {
      intent += `;S.title=${encodeURIComponent(title)}`;
    }
    intent += `;S.browser_fallback_url=${encodeURIComponent(streamUrl)};end`;
    return intent;
  } catch {
    return streamUrl;
  }
}

/**
 * Builds VLC desktop/mobile deep link URI.
 */
export function buildVlcDeepLink(streamUrl: string): string {
  return `vlc://${streamUrl.trim()}`;
}

/**
 * Launches an external player via intent or deep link.
 */
export function launchExternalPlayer(
  streamUrl: string,
  playerType: 'system' | 'vlc' | 'mx' | 'just' = 'system',
  title?: string
): { success: boolean; intentUrl: string } {
  if (!streamUrl) {
    return { success: false, intentUrl: '' };
  }

  const selectedApp = AVAILABLE_EXTERNAL_PLAYERS.find((p) => p.id === playerType);
  const intentUrl = buildAndroidIntentUrl(streamUrl, title, selectedApp?.packageName);

  try {
    // Attempt window.location navigation for intent URIs
    window.location.href = intentUrl;
    return { success: true, intentUrl };
  } catch (err) {
    console.warn('[ExternalPlayer] Intent launch failed, trying fallback', err);
    try {
      window.open(intentUrl, '_blank');
      return { success: true, intentUrl };
    } catch {
      return { success: false, intentUrl };
    }
  }
}
