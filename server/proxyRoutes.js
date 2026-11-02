import dns from 'node:dns';
import { Readable } from 'node:stream';

const REQUEST_TIMEOUT_MS = 20_000;
const DNS_CACHE_TTL_MS = 5 * 60 * 1000;
const dnsSafetyCache = new Map();

function sendJsonError(res, status, message) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message }));
}

export function isPrivateIp(ip) {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  const low = ip.toLowerCase();
  if (low === '::1' || low === '::') return true;
  if (low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) return true;
  if (low.startsWith('::ffff:')) return isPrivateIp(low.slice('::ffff:'.length));
  return false;
}

async function assertPublicHttpUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Geçersiz adres.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Yalnızca http/https adresleri desteklenir.');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Yerel adreslere erişim engellendi.');
  }
  if (isPrivateIp(hostname)) {
    throw new Error('Özel ağ adreslerine erişim engellendi.');
  }

  const cached = dnsSafetyCache.get(hostname);
  if (cached && Date.now() - cached.checkedAt < DNS_CACHE_TTL_MS) {
    if (!cached.safe) throw new Error('Bu adres özel bir ağa yönlendiriliyor, erişim engellendi.');
    return url;
  }

  try {
    const records = await dns.promises.lookup(hostname, { all: true });
    const safe = !records.some((r) => isPrivateIp(r.address));
    dnsSafetyCache.set(hostname, { safe, checkedAt: Date.now() });
    if (!safe) throw new Error('Bu adres özel bir ağa yönlendiriliyor, erişim engellendi.');
  } catch (e) {
    if (e?.message?.includes('engellendi')) throw e;
    throw new Error('Sunucu adresi çözümlenemedi (DNS).');
  }
  return url;
}

async function fetchUpstream(url, extraHeaders) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ZenditPlay IPTV Client)', ...extraHeaders },
    });
  } finally {
    clearTimeout(timer);
  }
}

export function rewriteManifest(text, manifestUrl) {
  const base = new URL(manifestUrl);
  const lines = text.split('\n');
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = new URL(uri, base).toString();
        return `URI="/api/stream?url=${encodeURIComponent(abs)}"`;
      });
    }
    const abs = new URL(trimmed, base).toString();
    return `/api/stream?url=${encodeURIComponent(abs)}`;
  });
  return out.join('\n');
}

async function handleXtreamProxy(req, res) {
  try {
    const reqUrl = new URL(req.url || '', 'http://internal');
    const target = reqUrl.searchParams.get('target');
    if (!target) return sendJsonError(res, 400, 'target parametresi eksik.');
    const url = await assertPublicHttpUrl(target);
    const upstream = await fetchUpstream(url);
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(text);
  } catch (err) {
    sendJsonError(res, 502, err?.message || 'Sunucuya bağlanılamadı.');
  }
}

async function handleStreamProxy(req, res) {
  try {
    const reqUrl = new URL(req.url || '', 'http://internal');
    const target = reqUrl.searchParams.get('url');
    if (!target) return sendJsonError(res, 400, 'url parametresi eksik.');
    const url = await assertPublicHttpUrl(target);

    const rangeHeader = req.headers.range;
    const upstream = await fetchUpstream(url, rangeHeader ? { range: String(rangeHeader) } : undefined);

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = /mpegurl/i.test(contentType) || /\.m3u8?(\?|$)/i.test(url.pathname);

    if (isManifest) {
      const text = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader('content-type', 'application/vnd.apple.mpegurl');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('access-control-allow-origin', '*');
      res.end(rewriteManifest(text, url.toString()));
      return;
    }

    res.statusCode = upstream.status;
    if (contentType) res.setHeader('content-type', contentType);
    for (const h of ['content-length', 'accept-ranges', 'content-range']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('cache-control', 'no-store');

    if (!upstream.body) {
      res.end();
      return;
    }
    const nodeStream = Readable.fromWeb(upstream.body);
    req.on('close', () => nodeStream.destroy());
    nodeStream.pipe(res);
  } catch (err) {
    sendJsonError(res, 502, err?.message || 'Akışa bağlanılamadı.');
  }
}

export function registerRoutes(middlewareStack) {
  middlewareStack.use((req, res, next) => {
    const url = req.url || '';
    if (url.startsWith('/api/xtream')) {
      handleXtreamProxy(req, res);
      return;
    }
    if (url.startsWith('/api/stream')) {
      handleStreamProxy(req, res);
      return;
    }
    next();
  });
}
