/** Trailers from the provider: a YouTube id ("dQw4w9WgXcQ"), a YouTube link, or a direct video URL. */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (YOUTUBE_ID.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return YOUTUBE_ID.test(url.pathname.slice(1)) ? url.pathname.slice(1) : null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && YOUTUBE_ID.test(v)) return v;
      const m = url.pathname.match(/\/(?:embed|shorts|v|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

export interface TrailerInfo {
  youtubeId: string | null;
  /** Watch page for YouTube trailers, otherwise the video address itself. */
  url: string;
}

export function trailerInfo(raw?: string): TrailerInfo | null {
  const id = youtubeId(raw);
  if (id) return { youtubeId: id, url: `https://www.youtube.com/watch?v=${id}` };
  const value = raw?.trim();
  if (value && /^https?:\/\//i.test(value)) return { youtubeId: null, url: value };
  return null;
}
