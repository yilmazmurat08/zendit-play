import { createContext, useContext } from 'react';
import type { Channel, Movie, ParentalConfig, Series } from '../types';

/**
 * Parental control: adult (+18) channels, movies and series are locked with a 4-digit PIN.
 * Categories are detected by name (and the Xtream `is_adult` flag); the parent can lock or unlock any
 * category by hand in Settings (`overrides`). One PIN entry unlocks everything until the app is closed
 * or "Şimdi kilitle" is pressed.
 */

export type ParentalKind = 'live' | 'movie' | 'series';

export const DEFAULT_PARENTAL: ParentalConfig = { enabled: false, pinHash: '', salt: '', overrides: {} };

// Words that mark adult categories (and channel names), matched as whole words.
const ADULT_PATTERN =
  /(^|[^\p{L}\p{N}])(adults?|xxx+|x-rated|porn\w*|sexy?|seksi?|erotik\w*|erotic\w*|yetişkin\w*|yetiskin\w*|playboy|hustler|brazzers|dorcel|penthouse|redlight|red light|private tv|18 ?\+|\+ ?18|18 yaş\w*)(?=$|[^\p{L}\p{N}])/u;

const adultCache = new Map<string, boolean>();

/** True for "XXX", "ADULT", "+18", "Yetişkin", "Erotik", "Playboy TV"... */
export function isAdultText(text?: string): boolean {
  if (!text) return false;
  let hit = adultCache.get(text);
  if (hit === undefined) {
    // Both lowercasings: "EROTIC" needs the plain one, "YETİŞKİN" the Turkish one.
    hit = ADULT_PATTERN.test(text.toLowerCase()) || ADULT_PATTERN.test(text.toLocaleLowerCase('tr-TR'));
    if (adultCache.size > 5000) adultCache.clear();
    adultCache.set(text, hit);
  }
  return hit;
}

export function categoryKey(kind: ParentalKind, name: string): string {
  return `${kind}|${name.trim()}`;
}

/** Locked category? The parent's choice first, otherwise detected from the name. */
export function isCategoryRestricted(config: ParentalConfig, kind: ParentalKind, name?: string): boolean {
  if (!config.enabled || !name) return false;
  const override = config.overrides[categoryKey(kind, name)];
  return override === undefined ? isAdultText(name) : override;
}

type Item = Channel | Movie | Series;

/** Is this channel / movie / series under parental control (whether or not it is unlocked right now)? */
export function isItemRestricted(config: ParentalConfig, kind: ParentalKind, item: Item): boolean {
  if (!config.enabled) return false;
  const category = item.category?.trim();
  const override = category ? config.overrides[categoryKey(kind, category)] : undefined;
  if (override !== undefined) return override;
  if (item.isAdult || isAdultText(category)) return true;
  // Channel names like "XXX Brazzers TV"; film / series titles are not checked ("Sex Education").
  if (kind === 'live') return isAdultText((item as Channel).name);
  return (item as Movie | Series).genres?.some((g) => isCategoryRestricted(config, kind, g)) || false;
}

// ---------------------------------------------------------------- PIN

/** cyrb53: a small string hash, so the PIN is not stored as plain text. */
function cyrb53(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Salted and stretched, so a copied settings file does not reveal the 4 digits at a glance. */
export function hashPin(pin: string, salt: string): string {
  let h = pin;
  for (let i = 0; i < 1000; i++) h = cyrb53(`${salt}:${h}:${pin}`, i);
  return h;
}

export function newPinConfig(config: ParentalConfig, pin: string): ParentalConfig {
  const salt = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return { ...config, enabled: true, salt, pinHash: hashPin(pin, salt) };
}

export function checkPin(config: ParentalConfig, pin: string): boolean {
  return !!config.pinHash && hashPin(pin, config.salt) === config.pinHash;
}

// Wrong PINs: after 5 tries the pad waits 30 s, doubling up to 10 minutes.
const LOCKOUT_KEY = 'zendit_pin_lockout';
const FREE_TRIES = 5;

interface Lockout {
  fails: number;
  until: number;
}

function readLockout(): Lockout {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || 'null');
    if (saved && typeof saved.fails === 'number') return saved;
  } catch {
    // ignore
  }
  return { fails: 0, until: 0 };
}

function writeLockout(lock: Lockout) {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lock));
  } catch {
    // ignore
  }
}

/** Milliseconds until the PIN pad accepts input again (0 = now). */
export function pinWaitMs(): number {
  return Math.max(0, readLockout().until - Date.now());
}

export function recordPinResult(ok: boolean) {
  if (ok) {
    writeLockout({ fails: 0, until: 0 });
    return;
  }
  const lock = readLockout();
  const fails = lock.fails + 1;
  const until = fails >= FREE_TRIES ? Date.now() + Math.min(600_000, 30_000 * 2 ** (fails - FREE_TRIES)) : 0;
  writeLockout({ fails, until });
}

// ---------------------------------------------------------------- React context

export interface ParentalApi {
  config: ParentalConfig;
  /** Enabled and not unlocked in this session: restricted content is blurred / asks for the PIN. */
  locked: boolean;
  /** Under parental control (regardless of the session unlock): lock icon on categories. */
  restricted: (kind: ParentalKind, item: Item) => boolean;
  categoryRestricted: (kind: ParentalKind, name: string) => boolean;
  /** Restricted and still locked: blur the poster, ask for the PIN before opening. */
  hidden: (kind: ParentalKind, item: Item) => boolean;
  /** Asks for the PIN when locked; resolves true once content may be shown. */
  unlock: () => Promise<boolean>;
}

const noop: ParentalApi = {
  config: DEFAULT_PARENTAL,
  locked: false,
  restricted: () => false,
  categoryRestricted: () => false,
  hidden: () => false,
  unlock: () => Promise.resolve(true),
};

export const ParentalContext = createContext<ParentalApi>(noop);

export function useParental(): ParentalApi {
  return useContext(ParentalContext);
}

export function makeParentalApi(config: ParentalConfig, unlocked: boolean, unlock: () => Promise<boolean>): ParentalApi {
  const locked = config.enabled && !unlocked;
  const restricted = (kind: ParentalKind, item: Item) => isItemRestricted(config, kind, item);
  return {
    config,
    locked,
    restricted,
    categoryRestricted: (kind, name) => isCategoryRestricted(config, kind, name),
    hidden: (kind, item) => locked && restricted(kind, item),
    unlock: () => (locked ? unlock() : Promise.resolve(true)),
  };
}
