import type { Channel, XtreamAccount } from '../types';
import { normalizeServerUrl } from './xtreamApi';

/**
 * Catch-up ("Baştan izle"): playing past programmes from the provider's archive.
 * Xtream channels with tv_archive use the panel's /timeshift/ address; M3U channels bring their own
 * template (catchup / catchup-source attributes). Templates use these tokens:
 *   {utc} {utcend} {lutc} {offset} {dur_sec} {dur_min} {start_xc} {Y} {m} {d} {H} {M} {S}
 * The native player fills them with the same rules (CatchupUrl.java).
 */

/** The guide never shows more than a week of archive. */
export const MAX_ARCHIVE_DAYS = 7;

export function archiveDays(channel: Pick<Channel, 'archiveDays'> | null | undefined): number {
  return Math.min(MAX_ARCHIVE_DAYS, Math.max(0, Math.floor(channel?.archiveDays || 0)));
}

function xtreamTimeshiftTemplate(account: XtreamAccount, streamId: number): string {
  const base = normalizeServerUrl(account.serverUrl);
  const user = encodeURIComponent(account.username);
  const pass = encodeURIComponent(account.password || '');
  return `${base}/timeshift/${user}/${pass}/{dur_min}/{start_xc}/${streamId}.ts`;
}

/** Address template for this channel's archive, or null when it has none. */
export function catchupTemplate(channel: Channel, account: XtreamAccount | null): string | null {
  if (archiveDays(channel) <= 0) return null;
  if (channel.catchupSource) return channel.catchupSource;
  if (account?.type === 'xtream' && channel.streamId) return xtreamTimeshiftTemplate(account, channel.streamId);
  return null;
}

/** Is a programme that started at `start` still in this channel's archive? */
export function canCatchup(channel: Channel, account: XtreamAccount | null, start: number, now: number = Date.now()): boolean {
  const days = archiveDays(channel);
  if (days <= 0 || start >= now || !catchupTemplate(channel, account)) return false;
  return start >= now - days * 86_400_000;
}

type DateParts = { Y: string; m: string; d: string; H: string; M: string; S: string };

/** Date fields in the server's time zone (Xtream timeshift addresses use the panel's local time). */
function dateParts(ms: number, timeZone?: string): DateParts {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(ms));
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
      return { Y: get('year'), m: get('month'), d: get('day'), H: get('hour'), M: get('minute'), S: get('second') };
    } catch {
      // unknown time zone: fall back to the device's
    }
  }
  const d = new Date(ms);
  return {
    Y: String(d.getFullYear()),
    m: pad(d.getMonth() + 1),
    d: pad(d.getDate()),
    H: pad(d.getHours()),
    M: pad(d.getMinutes()),
    S: pad(d.getSeconds()),
  };
}

export function buildCatchupUrl(template: string, timeZone: string, start: number, stop: number, now: number = Date.now()): string {
  const startSec = Math.floor(start / 1000);
  const stopSec = Math.floor(stop / 1000);
  const duration = Math.max(60, stopSec - startSec);
  const parts = dateParts(start, timeZone);
  const values: Record<string, string> = {
    utc: String(startSec),
    utcend: String(stopSec),
    lutc: String(Math.floor(now / 1000)),
    offset: String(Math.max(0, Math.floor(now / 1000) - startSec)),
    dur_sec: String(duration),
    dur_min: String(Math.ceil(duration / 60)),
    start_xc: `${parts.Y}-${parts.m}-${parts.d}:${parts.H}-${parts.M}`,
    ...parts,
  };
  return template.replace(/\{(utcend|utc|lutc|offset|dur_sec|dur_min|start_xc|Y|m|d|H|M|S)\}/g, (_, token) => values[token]);
}

/** Other players' token spellings (${start}, {duration:60}...) to ours. */
function normalizeTokens(source: string): string {
  return source
    .replace(/\$\{start\}|\{start\}/g, '{utc}')
    .replace(/\$\{end\}|\{end\}/g, '{utcend}')
    .replace(/\$\{timestamp\}|\{timestamp\}|\{now\}/g, '{lutc}')
    .replace(/\$\{offset\}|\{offset(?::1)?\}/g, '{offset}')
    .replace(/\{duration:60\}/g, '{dur_min}')
    .replace(/\$\{duration\}|\{duration(?::1)?\}/g, '{dur_sec}');
}

/**
 * Catch-up template of an M3U entry from its attributes (catchup, catchup-source, catchup-days,
 * tvg-rec, timeshift). Supports default / append / xc / shift / flussonic.
 */
export function m3uCatchup(attrs: Record<string, string>, streamUrl: string): { source: string; days: number } | null {
  const type = (attrs.catchup || attrs['catchup-type'] || '').trim().toLowerCase();
  const source = (attrs['catchup-source'] || '').trim();
  const rawDays = Number(attrs['catchup-days'] || attrs['tvg-rec'] || attrs.timeshift || 0);
  if (!type && !source && !rawDays) return null;
  const days = Math.min(MAX_ARCHIVE_DAYS, rawDays > 0 ? Math.floor(rawDays) : 3);
  const withQuery = (url: string, query: string) => url + (url.includes('?') ? '&' : '?') + query;
  const xtream = streamUrl.match(/^(https?:\/\/[^/]+)\/(?:live\/)?([^/]+)\/([^/]+)\/(\d+)(?:\.\w+)?$/i);
  let template = '';
  if ((type === 'default' || !type) && /^https?:\/\//i.test(source)) {
    template = normalizeTokens(source);
  } else if (type === 'append' && source) {
    template = streamUrl + normalizeTokens(source);
  } else if (type === 'xc' || type === 'xtream' || (!type && !source && xtream)) {
    if (xtream) template = `${xtream[1]}/timeshift/${xtream[2]}/${xtream[3]}/{dur_min}/{start_xc}/${xtream[4]}.ts`;
  } else if (type === 'shift' || type === 'timeshift' || (!type && !source)) {
    template = withQuery(streamUrl, 'utc={utc}&lutc={lutc}');
  } else if (type === 'flussonic' || type === 'flussonic-hls' || type === 'fs') {
    if (/\/(index|video|mono)\.m3u8(\?|$)/i.test(streamUrl)) {
      template = streamUrl.replace(/\/(index|video|mono)\.m3u8/i, '/$1-{utc}-{dur_sec}.m3u8');
    } else if (/\/mpegts(\?|$)/i.test(streamUrl)) {
      template = streamUrl.replace(/\/mpegts/i, '/timeshift_abs-{utc}.ts');
    }
  }
  return template ? { source: template, days } : null;
}
