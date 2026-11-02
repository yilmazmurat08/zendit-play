export * from './stream';
import { proxiedApiUrl } from './stream';

/**
 * Safe IPTV & Xtream Stream Proxy Helper
 * Routes requests exclusively through the local /api/proxy server
 * to prevent CORS and mixed-content issues securely.
 *
 * IMPORTANT SECURITY NOTICE:
 * Public CORS proxies (such as corsproxy.io, allorigins.win) MUST NEVER BE USED
 * because Xtream Codes URLs contain plaintext usernames and passwords in the query/path.
 */

/**
 * Detects if the application is running inside a native Capacitor shell (Android / iOS).
 * When running natively, CapacitorHttp handles network calls natively without browser CORS or mixed-content restrictions.
 */
export function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }
  const platform = cap.getPlatform ? cap.getPlatform() : cap.platform;
  return platform === 'android' || platform === 'ios';
}

export function getProxiedUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  const clean = rawUrl.trim();

  // In native Capacitor environment, proxy is completely bypassed
  if (isNativeCapacitor()) {
    return clean;
  }

  // If local asset, blob, data URL, or already proxied through our API, return as-is
  if (
    clean.startsWith('/') ||
    clean.startsWith('data:') ||
    clean.startsWith('blob:') ||
    clean.startsWith('local://') ||
    clean.includes('/api/proxy') ||
    clean.includes('/api/xtream') ||
    clean.includes('/api/stream')
  ) {
    return clean;
  }

  // Open sample video bucket / CDNs that already have permissive CORS
  if (
    clean.includes('commondatastorage.googleapis.com') ||
    clean.includes('images.unsplash.com') ||
    clean.includes('raw.githubusercontent.com')
  ) {
    return clean;
  }

  // Route through our local proxy
  return proxiedApiUrl(clean);
}

/**
 * Robust fetch that uses the local backend proxy first.
 * Never forwards credentials to unknown third-party proxy services.
 */
export async function fetchWithFallback(url: string, options?: RequestInit): Promise<Response> {
  const cleanUrl = url.trim();

  // If in native Capacitor shell, use direct native network stack
  if (isNativeCapacitor()) {
    return fetch(cleanUrl, {
      ...options,
      signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
    });
  }

  // 1. Try local backend proxy
  try {
    const proxyUrl = proxiedApiUrl(cleanUrl);
    const res = await fetch(proxyUrl, {
      ...options,
      signal: AbortSignal.timeout ? AbortSignal.timeout(18000) : undefined,
    });

    if (res.ok) {
      return res;
    }

    // Try to parse error message from proxy safely (read as text first so stream is consumed only once)
    let errorDetail = '';
    try {
      const rawText = await res.text();
      if (rawText) {
        try {
          const errJson = JSON.parse(rawText);
          if (errJson && errJson.detail) {
            errorDetail = errJson.detail;
          } else if (errJson && errJson.error) {
            errorDetail = errJson.error;
          }
        } catch {
          // Not JSON - check if HTML error page or short plain text
          const lower = rawText.toLowerCase();
          if (
            lower.includes('cloudflare') ||
            lower.includes('attention required') ||
            lower.includes('cf-ray') ||
            lower.includes('you have been blocked')
          ) {
            errorDetail =
              'IPTV sağlayıcınız (Cloudflare WAF) bulut/veri merkezi IP adreslerini engelledi (HTTP 403). M3U dosyasını tarayıcınızda indirip "M3U Dosyası" sekmesinden yükleyin.';
          } else if (rawText.length < 200 && !rawText.includes('<html') && !rawText.includes('<!DOCTYPE')) {
            errorDetail = rawText.trim();
          }
        }
      }
    } catch {
      // ignore
    }

    if (!errorDetail || errorDetail === `HTTP ${res.status}`) {
      if (res.status === 403) {
        errorDetail =
          'Erişim Engellendi (HTTP 403): IPTV sağlayıcınız (Cloudflare WAF) veri merkezi IP adreslerini engelledi. M3U dosyasını tarayıcınızda indirip "M3U Dosyası" sekmesinden yükleyin veya Android uygulamamızda kullanın.';
      } else if (res.status === 520) {
        errorDetail = 'IPTV sunucusu yanıt vermedi (HTTP 520). Sunucu geçici olarak kapalı olabilir veya Cloudflare erişimi kısıtlıyor.';
      } else {
        errorDetail = `Sunucu Hatası (HTTP ${res.status})`;
      }
    }

    throw new Error(errorDetail);
  } catch (proxyErr: any) {
    // 2. Direct fetch attempt (only viable for https or same-origin to avoid mixed-content blocks)
    const canAttemptDirect =
      typeof window === 'undefined' ||
      window.location.protocol !== 'https:' ||
      cleanUrl.startsWith('https://');

    if (canAttemptDirect) {
      try {
        const directRes = await fetch(cleanUrl, {
          ...options,
          signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
        });
        if (directRes.ok) {
          return directRes;
        }
      } catch {
        // Keep original proxy error for clarity
      }
    }

    const msg = proxyErr?.message || 'Bağlantı hatası';
    throw new Error(msg);
  }
}
