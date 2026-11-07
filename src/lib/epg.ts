import { useEffect, useState, useSyncExternalStore } from 'react';
import { registerPlugin } from '@capacitor/core';
import type { AppSettings, Channel, XtreamAccount } from '../types';
import { isNativeApp } from './nativePlayer';
import { archiveDays } from './catchup';
import { fetchArchiveEpg, fetchShortEpgList, xmltvUrl, type XtreamCredentials } from './xtreamApi';

/**
 * Programme guide (EPG). The XMLTV download and parsing run natively (EpgPlugin / EpgStore.java), so a
 * guide of tens of megabytes never touches the WebView. The UI queries programmes per channel; Xtream
 * channels the guide does not cover fall back to the panel's short EPG.
 */

export interface EpgProgramme {
  start: number;
  stop: number;
  title: string;
  desc?: string;
}

interface EpgChannelRef {
  id: string;
  epgId: string;
  name: string;
  archiveHours?: number;
}

interface EpgPluginApi {
  load(options: {
    sources: string[];
    channels: EpgChannelRef[];
    force: boolean;
    maxAgeHours: number;
    offsetMinutes: number;
    pastHours: number;
    futureHours: number;
  }): Promise<{ programmes: number; channels: number; updatedAt: number; fromCache: boolean; error?: string }>;
  query(options: { ids: string[]; from: number; to: number; limit: number }): Promise<{ items: Record<string, EpgProgramme[]> }>;
  status(): Promise<{ loading: boolean; programmes: number; channels: number; error: string; cacheBytes: number }>;
  clear(): Promise<void>;
}

const Epg = registerPlugin<EpgPluginApi>('Epg');

export type EpgState = 'idle' | 'off' | 'loading' | 'ready' | 'error';

export interface EpgStatus {
  state: EpgState;
  programmes: number;
  channels: number;
  updatedAt: number;
  error: string;
  sources: string[];
  cacheBytes: number;
}

let status: EpgStatus = { state: 'idle', programmes: 0, channels: 0, updatedAt: 0, error: '', sources: [], cacheBytes: 0 };
const listeners = new Set<() => void>();
let generation = 0;
const shortEpgCache = new Map<string, { at: number; list: EpgProgramme[] }>();

function setStatus(patch: Partial<EpgStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEpgStatus(): EpgStatus {
  return useSyncExternalStore(subscribe, () => status);
}

function credentials(account: XtreamAccount): XtreamCredentials {
  return { serverUrl: account.serverUrl, username: account.username, password: account.password || '' };
}

/** The user's extra XMLTV addresses (comma separated) plus the playlist's own guide. */
function epgSources(account: XtreamAccount | null, settings: AppSettings): string[] {
  const out: string[] = [];
  const add = (value?: string) =>
    (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s))
      .forEach((s) => !out.includes(s) && out.push(s));
  add(settings.epgUrl);
  if (account?.type === 'xtream') add(xmltvUrl(credentials(account)));
  else add(account?.epgUrl);
  return out;
}

export async function refreshEpg(options: {
  account: XtreamAccount | null;
  channels: Channel[];
  settings: AppSettings;
  force?: boolean;
}) {
  const { account, channels, settings, force = false } = options;
  if (!settings.epgEnabled || !account || channels.length === 0) {
    generation++;
    setStatus({ state: 'off', error: '' });
    return;
  }
  const sources = epgSources(account, settings);
  if (!isNativeApp()) {
    setStatus({ state: 'idle', sources, error: '' });
    return;
  }
  if (sources.length === 0) {
    setStatus({
      state: 'error',
      sources,
      error: 'Bu listede EPG adresi yok. Ayarlar > EPG kaynağı bölümüne bir XMLTV adresi ekleyebilirsiniz.',
    });
    return;
  }
  const gen = ++generation;
  setStatus({ state: 'loading', sources, error: '' });
  try {
    const result = await Epg.load({
      sources,
      channels: channels.map((c) => {
        const days = archiveDays(c);
        return days > 0
          ? { id: c.id, epgId: c.epgId || '', name: c.name, archiveHours: days * 24 }
          : { id: c.id, epgId: c.epgId || '', name: c.name };
      }),
      force,
      maxAgeHours: 12,
      offsetMinutes: Math.round((settings.epgOffsetHours || 0) * 60),
      pastHours: 3,
      futureHours: 30,
    });
    if (gen !== generation) return;
    const info = await Epg.status().catch(() => null);
    setStatus({
      state: result.programmes > 0 ? 'ready' : 'error',
      programmes: result.programmes,
      channels: result.channels,
      updatedAt: result.updatedAt,
      error: result.error || (result.programmes > 0 ? '' : 'Rehberde bu listedeki kanallarla eşleşen program bulunamadı.'),
      cacheBytes: info?.cacheBytes ?? 0,
    });
  } catch (err: any) {
    if (gen === generation) setStatus({ state: 'error', error: err?.message || 'EPG yüklenemedi.' });
  }
}

export async function clearEpg() {
  generation++;
  shortEpgCache.clear();
  if (isNativeApp()) await Epg.clear().catch(() => {});
  setStatus({ state: 'idle', programmes: 0, channels: 0, updatedAt: 0, cacheBytes: 0, error: '' });
}

/** Re-renders once a minute, so "now" moves on in the lists. */
function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

/** Current and upcoming programmes (up to `limit`) for the given channel ids. */
export function useProgrammes(ids: string[], limit: number = 2): { items: Record<string, EpgProgramme[]>; ready: boolean } {
  const epg = useEpgStatus();
  const tick = useMinuteTick();
  const [state, setState] = useState<{ key: string; items: Record<string, EpgProgramme[]> }>({ key: '', items: {} });
  const key = `${limit}|${ids.join('|')}`;
  const enabled = isNativeApp() && epg.state !== 'off' && ids.length > 0;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // Debounced: fast scrolling through the list does not fire a query per row.
    const timer = window.setTimeout(async () => {
      try {
        const now = Date.now();
        const result = await Epg.query({ ids, from: now, to: now + 30 * 3_600_000, limit });
        if (!cancelled) setState({ key, items: result.items || {} });
      } catch {
        if (!cancelled) setState({ key, items: {} });
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, enabled, epg.updatedAt, epg.state, tick]);
  if (!enabled) return { items: {}, ready: true };
  return { items: state.items, ready: state.key === key };
}

/**
 * Programmes of one channel for the Live TV panel. Uses the guide; Xtream channels it does not cover
 * get the panel's short EPG (cached for 10 minutes).
 */
export function useChannelProgrammes(
  channel: Channel | null,
  account: XtreamAccount | null,
  settings: AppSettings,
  limit: number = 8
): EpgProgramme[] {
  const { items, ready } = useProgrammes(channel ? [channel.id] : [], limit);
  const fromGuide = channel ? items[channel.id] || [] : [];
  const [fallback, setFallback] = useState<{ id: string; list: EpgProgramme[] }>({ id: '', list: [] });
  const offsetMs = (settings.epgOffsetHours || 0) * 3_600_000;
  const canFallback = !!(settings.epgEnabled && channel?.streamId && account?.type === 'xtream');
  useEffect(() => {
    if (!channel || !canFallback || !ready || fromGuide.length > 0 || !account) return;
    const cached = shortEpgCache.get(channel.id);
    if (cached && Date.now() - cached.at < 10 * 60_000) {
      setFallback({ id: channel.id, list: cached.list });
      return;
    }
    let cancelled = false;
    fetchShortEpgList(credentials(account), channel.streamId!, limit).then((list) => {
      const shifted = list.map((p) => ({ ...p, start: p.start + offsetMs, stop: p.stop + offsetMs }));
      shortEpgCache.set(channel.id, { at: Date.now(), list: shifted });
      if (!cancelled) setFallback({ id: channel.id, list: shifted });
    });
    return () => {
      cancelled = true;
    };
  }, [channel?.id, canFallback, ready, fromGuide.length, account?.id, offsetMs]);
  if (!channel || !settings.epgEnabled) return [];
  const now = Date.now();
  const list = fromGuide.length > 0 ? fromGuide : fallback.id === channel.id ? fallback.list : [];
  return list.filter((p) => p.stop > now).slice(0, limit);
}

const archiveCache = new Map<string, { at: number; list: EpgProgramme[] }>();
const archivePending = new Map<string, Promise<EpgProgramme[]>>();

/** Past days of one Xtream channel (get_simple_data_table), cached for 10 minutes. */
function loadArchive(channel: Channel, account: XtreamAccount, offsetHours: number = 0): Promise<EpgProgramme[]> {
  if (account.type !== 'xtream' || !channel.streamId) return Promise.resolve([]);
  const key = `${account.id}|${channel.id}|${offsetHours}`;
  const cached = archiveCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60_000) return Promise.resolve(cached.list);
  const pending = archivePending.get(key);
  if (pending) return pending;
  const offsetMs = offsetHours * 3_600_000;
  const promise = fetchArchiveEpg(credentials(account), channel.streamId)
    .then((list) => list.map((p) => ({ ...p, start: p.start + offsetMs, stop: p.stop + offsetMs })))
    .then((list) => {
      archiveCache.set(key, { at: Date.now(), list });
      if (archiveCache.size > 400) archiveCache.delete(archiveCache.keys().next().value as string);
      return list;
    })
    .finally(() => archivePending.delete(key));
  archivePending.set(key, promise);
  return promise;
}

async function queryGuide(ids: string[], from: number, to: number): Promise<Record<string, EpgProgramme[]>> {
  if (!isNativeApp() || ids.length === 0) return {};
  try {
    return (await Epg.query({ ids, from, to, limit: 400 })).items || {};
  } catch {
    return {};
  }
}

/**
 * Programmes between `from` and `to` for the TV guide grid (visible rows only). Channels without
 * guide data are filled from the Xtream archive, four at a time.
 */
export function useGuideProgrammes(
  channels: Channel[],
  from: number,
  to: number,
  account: XtreamAccount | null,
  settings: AppSettings
): Record<string, EpgProgramme[]> {
  const epg = useEpgStatus();
  const tick = useMinuteTick();
  const windowKey = `${from}|${to}`;
  const [state, setState] = useState<{ window: string; items: Record<string, EpgProgramme[]> }>({ window: '', items: {} });
  const key = `${windowKey}|${channels.map((c) => c.id).join('|')}`;
  const merge = (items: Record<string, EpgProgramme[]>) =>
    setState((prev) => (prev.window === windowKey ? { window: windowKey, items: { ...prev.items, ...items } } : { window: windowKey, items }));
  useEffect(() => {
    if (!settings.epgEnabled || channels.length === 0) {
      setState({ window: windowKey, items: {} });
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const guide = await queryGuide(
        channels.map((c) => c.id),
        from,
        to
      );
      if (cancelled) return;
      const first: Record<string, EpgProgramme[]> = {};
      for (const c of channels) first[c.id] = guide[c.id] || [];
      merge(first);
      if (!account || account.type !== 'xtream') return;
      const missing = channels.filter((c) => c.streamId && !guide[c.id]?.length);
      for (let i = 0; i < missing.length && !cancelled; i += 4) {
        const batch = missing.slice(i, i + 4);
        const lists = await Promise.all(batch.map((c) => loadArchive(c, account, settings.epgOffsetHours || 0)));
        if (cancelled) return;
        const patch: Record<string, EpgProgramme[]> = {};
        batch.forEach((c, j) => {
          patch[c.id] = lists[j].filter((p) => p.stop > from && p.start < to);
        });
        merge(patch);
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, epg.updatedAt, epg.state, settings.epgEnabled, settings.epgOffsetHours, account?.id, Math.floor(tick / 5)]);
  return state.window === windowKey ? state.items : {};
}

export function currentProgramme(list: EpgProgramme[] | undefined, now: number = Date.now()): EpgProgramme | null {
  return list?.find((p) => p.start <= now && now < p.stop) || null;
}

export function programmeProgress(p: EpgProgramme, now: number = Date.now()): number {
  return Math.min(100, Math.max(0, ((now - p.start) / Math.max(1, p.stop - p.start)) * 100));
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
