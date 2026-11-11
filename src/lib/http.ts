import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { proxiedApiUrl } from './stream';

/**
 * One place for the app's list / API downloads.
 *
 * In the Android app requests go straight through the native HTTP stack (CapacitorHttp): real
 * connect / read timeouts, no CORS, and the body crosses the bridge once instead of being
 * re-serialised by the fetch() shim, which matters for playlists of tens of MB on a 1 GB TV stick.
 * In the browser (development) they go through the local proxy with an AbortController timeout.
 */

export type HttpFailure = 'timeout' | 'network' | 'status';

export class HttpError extends Error {
  kind: HttpFailure;
  status?: number;
  constructor(kind: HttpFailure, message: string, status?: number) {
    super(message);
    this.name = 'HttpError';
    this.kind = kind;
    this.status = status;
  }
}

export interface HttpOptions {
  /** Whole-request budget in the browser; read timeout in the app. Default 30 s. */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const CONNECT_TIMEOUT_MS = 15000;

/** GET that resolves with the body: a string, or already-parsed JSON when the server labels it as JSON. */
async function get(url: string, options: HttpOptions = {}): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 30000;

  if (Capacitor.isNativePlatform()) {
    let res;
    try {
      res = await CapacitorHttp.get({
        url,
        headers: options.headers,
        connectTimeout: CONNECT_TIMEOUT_MS,
        readTimeout: timeoutMs,
      });
    } catch (err: any) {
      const text = String(err?.message || err || '').toLowerCase();
      throw new HttpError(text.includes('timeout') || text.includes('timed out') ? 'timeout' : 'network', text);
    }
    if (res.status < 200 || res.status >= 300) throw new HttpError('status', `HTTP ${res.status}`, res.status);
    return res.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(proxiedApiUrl(url), { signal: controller.signal, headers: options.headers });
    if (!res.ok) throw new HttpError('status', `HTTP ${res.status}`, res.status);
    return await res.text();
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(err?.name === 'AbortError' ? 'timeout' : 'network', String(err?.message || err));
  } finally {
    clearTimeout(timer);
  }
}

/** Downloads text (M3U playlists). */
export async function httpGetText(url: string, options?: HttpOptions): Promise<string> {
  const data = await get(url, options);
  return typeof data === 'string' ? data : JSON.stringify(data);
}

/** Downloads JSON. Throws SyntaxError when the body is not JSON (many panels send JSON as text/html). */
export async function httpGetJson<T>(url: string, options?: HttpOptions): Promise<T> {
  const data = await get(url, options);
  if (typeof data !== 'string') return data as T;
  return JSON.parse(data) as T;
}
