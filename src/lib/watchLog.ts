import type { WatchLogEntry } from '../types';

/**
 * Watch log for the statistics screen: one entry per playback session the native player reports
 * (channel, movie or episode, start time, watched milliseconds). Kept on the device only.
 */

/** Shorter sessions (zapping through channels) are not recorded. */
const MIN_SESSION_MS = 15_000;
/** Entries older than ~13 months are dropped. */
const MAX_AGE_MS = 400 * 86_400_000;

export function appendWatchLog(log: WatchLogEntry[], sessions: WatchLogEntry[]): WatchLogEntry[] {
  const valid = sessions.filter((s) => s.ms >= MIN_SESSION_MS);
  if (valid.length === 0) return log;
  const oldest = Date.now() - MAX_AGE_MS;
  return [...log, ...valid].filter((e) => e.at >= oldest).slice(-4000);
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysBefore(ms: number, days: number): number {
  const d = new Date(startOfDay(ms));
  d.setDate(d.getDate() - days);
  return d.getTime();
}

export interface TopItem {
  id: string;
  title: string;
  kind: WatchLogEntry['kind'];
  ms: number;
  count: number;
}

function topItems(entries: WatchLogEntry[], limit: number): TopItem[] {
  const byKey = new Map<string, TopItem>();
  for (const e of entries) {
    const key = `${e.kind}:${e.id}`;
    const item = byKey.get(key) || { id: e.id, title: e.title, kind: e.kind, ms: 0, count: 0 };
    item.ms += e.ms;
    item.count += 1;
    item.title = e.title || item.title;
    byKey.set(key, item);
  }
  return [...byKey.values()].sort((a, b) => b.ms - a.ms).slice(0, limit);
}

export interface DayTotals {
  day: number;
  /** Minutes per kind. */
  live: number;
  movie: number;
  series: number;
}

export interface WatchStatsSummary {
  totalMs: number;
  byKind: Record<WatchLogEntry['kind'], number>;
  sessions: number;
  activeDays: number;
  dailyAverageMs: number;
  /** Consecutive days with viewing, ending today (or yesterday). */
  streak: number;
  longestMs: number;
  /** One entry per day for the daily chart (period length, or the last 30 days for "Tümü"). */
  days: DayTotals[];
  /** Minutes per hour of the day. */
  hours: number[];
  topChannels: TopItem[];
  topVod: TopItem[];
  topCategories: { name: string; ms: number }[];
}

/** Statistics for the last `periodDays` days (null: all time). */
export function computeWatchStats(log: WatchLogEntry[], periodDays: number | null, now: number = Date.now()): WatchStatsSummary {
  const today = startOfDay(now);
  const from = periodDays ? daysBefore(today, periodDays - 1) : 0;
  const entries = log.filter((e) => e.at >= from);
  const byKind = { live: 0, movie: 0, series: 0 };
  const hours = new Array(24).fill(0);
  const activeDays = new Set<number>();
  const categories = new Map<string, number>();
  let longestMs = 0;
  for (const e of entries) {
    byKind[e.kind] += e.ms;
    hours[new Date(e.at).getHours()] += e.ms / 60_000;
    activeDays.add(startOfDay(e.at));
    longestMs = Math.max(longestMs, e.ms);
    const cat = e.category?.trim();
    if (cat) categories.set(cat, (categories.get(cat) || 0) + e.ms);
  }
  const totalMs = byKind.live + byKind.movie + byKind.series;

  const chartDays = periodDays ?? 30;
  const days: DayTotals[] = [];
  const byDay = new Map<number, DayTotals>();
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = { day: daysBefore(today, i), live: 0, movie: 0, series: 0 };
    days.push(d);
    byDay.set(d.day, d);
  }
  for (const e of log) {
    const d = byDay.get(startOfDay(e.at));
    if (d) d[e.kind] += e.ms / 60_000;
  }

  const watchedDays = new Set(log.map((e) => startOfDay(e.at)));
  let streak = 0;
  let day = watchedDays.has(today) ? today : daysBefore(today, 1);
  while (watchedDays.has(day)) {
    streak++;
    day = daysBefore(day, 1);
  }

  const divisor = periodDays ?? Math.max(1, activeDays.size);
  return {
    totalMs,
    byKind,
    sessions: entries.length,
    activeDays: activeDays.size,
    dailyAverageMs: totalMs / divisor,
    streak,
    longestMs,
    days,
    hours,
    topChannels: topItems(entries.filter((e) => e.kind === 'live'), 5),
    topVod: topItems(entries.filter((e) => e.kind !== 'live'), 5),
    topCategories: [...categories.entries()].map(([name, ms]) => ({ name, ms })).sort((a, b) => b.ms - a.ms).slice(0, 5),
  };
}

/** "1 sa 25 dk", "40 dk", "< 1 dk". */
export function formatWatchTime(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (ms > 0 && minutes === 0) return '< 1 dk';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}
