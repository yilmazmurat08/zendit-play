import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { XtreamAccount } from '../types';

// TV screens are designed for a 1920x1080 stage and scaled to the real screen.
const TV_DESIGN_WIDTH = 1920;
const TV_DESIGN_HEIGHT = 1080;
// Smallest stage the landscape layout still fits in, and the smallest scale that stays
// readable at arm's length on phones, tablets and foldables (touch screens).
const STAGE_MIN_WIDTH = 1280;
const STAGE_MIN_HEIGHT = 600;
const TOUCH_MIN_SCALE = 0.6;

// Vivid per-menu colors as "R G B" triples (used as rgb(var(--tile)) in index.css).
export const MENU_COLORS = {
  live: '60 200 255',
  movies: '255 159 46',
  series: '157 92 255',
  favorites: '255 61 127',
  playlists: '52 211 153',
};

export const CATEGORY_RECENT = 'Son İzlenenler';
export const CATEGORY_ADDED = 'Son Eklenenler';
export const CATEGORY_FAVORITES = 'Favoriler';

export interface DeviceInfo {
  id: string;
  pin: string;
}

function randomDigits(length: number): string {
  let out = String(1 + Math.floor(Math.random() * 9));
  while (out.length < length) out += Math.floor(Math.random() * 10);
  return out;
}

export function getDeviceInfo(): DeviceInfo {
  try {
    const saved = localStorage.getItem('zendit_device');
    if (saved) return JSON.parse(saved) as DeviceInfo;
    const info = { id: randomDigits(7), pin: randomDigits(7) };
    localStorage.setItem('zendit_device', JSON.stringify(info));
    return info;
  } catch {
    return { id: '-', pin: '-' };
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Süresiz';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface SubscriptionInfo {
  title: string;
  remaining: string;
  expiry: string;
}

export function getSubscription(account: XtreamAccount | null): SubscriptionInfo {
  if (!account?.expiryDate) {
    return { title: 'Abonelik', remaining: 'Süresiz', expiry: 'Süresiz' };
  }
  const expiry = formatDate(account.expiryDate);
  const end = new Date(`${account.expiryDate}T23:59:59`).getTime();
  if (Number.isNaN(end)) return { title: 'Abonelik', remaining: '', expiry };
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days < 0) return { title: 'Abonelik', remaining: 'Süresi Doldu', expiry };
  const title = days >= 365 ? `${Math.floor(days / 365)} Yıl` : days >= 30 ? `${Math.floor(days / 30)} Ay` : `${days} Gün`;
  return { title, remaining: `${days} Gün Kaldı`, expiry };
}

/** Parses durations like "2s 15dk", "1h 30m", "155 min", "02:35:00" into minutes. */
export function parseDurationMinutes(value?: string): number | null {
  if (!value) return null;
  const clock = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const h = value.match(/(\d+)\s*(?:h|sa|saat|s\b)/i);
  const m = value.match(/(\d+)\s*(?:m|dk|min|dakika)/i);
  if (!h && !m) return null;
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

interface Viewport {
  w: number;
  h: number;
}

let viewport: Viewport = { w: window.innerWidth, h: window.innerHeight };
const viewportListeners = new Set<() => void>();

/** Landscape screens (TV, or a tablet / foldable / phone held sideways) use the scaled stage layout. */
function isTvLayout(v: Viewport): boolean {
  return v.w > v.h && v.w >= 640;
}

function applyLayoutClass() {
  // Drives the `tv:` variant in index.css, so CSS and JS always agree on the layout.
  document.documentElement.classList.toggle('tv-layout', isTvLayout(viewport));
}

function onViewportResize() {
  const next = { w: window.innerWidth, h: window.innerHeight };
  if (next.w === viewport.w && next.h === viewport.h) return;
  // The on-screen keyboard only makes the window shorter: keep the current layout while typing,
  // otherwise an unfolded foldable would flip to the landscape layout as soon as the keyboard opens.
  const el = document.activeElement;
  const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  if (typing && next.w === viewport.w && next.h < viewport.h) return;
  viewport = next;
  applyLayoutClass();
  viewportListeners.forEach((listener) => listener());
}

applyLayoutClass();
window.addEventListener('resize', onViewportResize);

function subscribeViewport(listener: () => void) {
  viewportListeners.add(listener);
  return () => {
    viewportListeners.delete(listener);
  };
}

function useViewport(): Viewport {
  return useSyncExternalStore(subscribeViewport, () => viewport);
}

export function useIsTv(): boolean {
  return isTvLayout(useViewport());
}

export interface TvStage {
  /** Style for the stage element; undefined in the portrait (mobile) layout. */
  style?: CSSProperties;
  /** Narrow stage (phone held sideways): the header hides its secondary items. */
  compact: boolean;
}

/**
 * On landscape screens the main UI is laid out on a stage designed for
 * 1920x1080 and scaled with a transform, so it keeps its proportions on a
 * 960x540 Android TV, a tablet, a foldable or a phone held sideways. Touch
 * screens never go below TOUCH_MIN_SCALE; the stage then simply gets more
 * design px, but never fewer than STAGE_MIN_WIDTH x STAGE_MIN_HEIGHT.
 * Only the stage is scaled - modals (player, settings, dialogs) keep their normal size.
 */
export function useTvStage(): TvStage {
  const v = useViewport();
  const isTouch = useMediaQuery('(pointer: coarse)');
  if (!isTvLayout(v)) return { compact: false };
  const base = Math.min(v.w / TV_DESIGN_WIDTH, v.h / TV_DESIGN_HEIGHT);
  const fit = Math.min(v.w / STAGE_MIN_WIDTH, v.h / STAGE_MIN_HEIGHT);
  const scale = Math.min(Math.max(base, isTouch ? TOUCH_MIN_SCALE : 0), fit);
  const width = v.w / scale;
  return {
    compact: width < 1900,
    style: {
      position: 'fixed',
      left: 0,
      top: 0,
      width,
      height: v.h / scale,
      transform: `scale(${scale})`,
      transformOrigin: '0 0',
    },
  };
}

export function useNow(intervalMs: number = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function axisGap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));
}

function directionalScore(a: DOMRect, b: DOMRect, dir: Direction): number {
  const acx = a.left + a.width / 2;
  const acy = a.top + a.height / 2;
  const bcx = b.left + b.width / 2;
  const bcy = b.top + b.height / 2;
  let main: number;
  let cross: number;
  if (dir === 'right') {
    if (bcx <= acx + 1 || b.left < a.left + 1) return Infinity;
    main = Math.max(0, b.left - a.right);
    cross = axisGap(a.top, a.bottom, b.top, b.bottom);
  } else if (dir === 'left') {
    if (bcx >= acx - 1 || b.right > a.right - 1) return Infinity;
    main = Math.max(0, a.left - b.right);
    cross = axisGap(a.top, a.bottom, b.top, b.bottom);
  } else if (dir === 'down') {
    if (bcy <= acy + 1 || b.top < a.top + 1) return Infinity;
    main = Math.max(0, b.top - a.bottom);
    cross = axisGap(a.left, a.right, b.left, b.right);
  } else {
    if (bcy >= acy - 1 || b.bottom > a.bottom - 1) return Infinity;
    main = Math.max(0, a.top - b.bottom);
    cross = axisGap(a.left, a.right, b.left, b.right);
  }
  return main + cross * 3;
}

/**
 * TV remote (D-pad) support: arrow keys move focus to the nearest focusable
 * element in that direction. Only the top-most `[data-nav-layer]` (open
 * modals) is searched, so focus never escapes behind an overlay.
 */
export function useSpatialNavigation() {
  useEffect(() => {
    // Element focus came from: pressing the opposite arrow returns to it (e.g. preview -> the same channel row).
    let previous: HTMLElement | null = null;
    let lastDir: Direction | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRECTION[e.key];
      if (!dir || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (tag === 'INPUT' && (dir === 'left' || dir === 'right')) {
        // Left / right move the caret inside a text box; only at the edge of the text do they move
        // focus on (e.g. from "Kullanıcı adı" to "Şifre" on the TV remote).
        const input = active as HTMLInputElement;
        let start: number | null = null;
        let end: number | null = null;
        try {
          start = input.selectionStart;
          end = input.selectionEnd;
        } catch {
          // Input types without a caret (number, email on some WebViews): treat as at the edge.
        }
        const length = input.value.length;
        if (dir === 'left' && start !== null && start > 0) return;
        if (dir === 'right' && end !== null && end < length) return;
      }

      const layers = document.querySelectorAll('[data-nav-layer]');
      const scope: ParentNode = layers.length ? layers[layers.length - 1] : document;
      const candidates = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
        if (el === active) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      if (candidates.length === 0) return;

      let target: HTMLElement | null = null;
      if (!active || active === document.body || !(scope as Node).contains(active)) {
        target = candidates[0];
      } else if (
        previous &&
        lastDir === OPPOSITE[dir] &&
        previous.isConnected &&
        candidates.includes(previous) &&
        directionalScore(active.getBoundingClientRect(), previous.getBoundingClientRect(), dir) < Infinity
      ) {
        target = previous;
      } else {
        const from = active.getBoundingClientRect();
        let bestScore = Infinity;
        for (const el of candidates) {
          const score = directionalScore(from, el.getBoundingClientRect(), dir);
          if (score < bestScore) {
            bestScore = score;
            target = el;
          }
        }
      }
      if (!target) return;
      e.preventDefault();
      previous = active && active !== document.body ? active : null;
      lastDir = dir;
      target.focus();
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
