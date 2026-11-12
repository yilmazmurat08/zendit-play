/**
 * Channel / movie / series lists live in IndexedDB: big playlists do not fit in localStorage
 * (5 MB limit on Android WebView). Everything degrades gracefully: when IndexedDB is missing or
 * fails, callers fall back to localStorage.
 */

const DB_NAME = 'zendit';
const STORE = 'lists';

export const LIST_KEYS = ['zendit_channels', 'zendit_movies', 'zendit_series'] as const;
export type ListKey = (typeof LIST_KEYS)[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return (
    dbPromise ||
    (dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') {
          resolve(null);
          return;
        }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    }))
  );
}

/** All stored lists, or null when IndexedDB is unavailable. */
export async function loadStoredLists(): Promise<Partial<Record<ListKey, unknown[]>> | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const out: Partial<Record<ListKey, unknown[]>> = {};
      for (const key of LIST_KEYS) {
        const req = store.get(key);
        req.onsuccess = () => {
          if (Array.isArray(req.result)) out[key] = req.result;
        };
      }
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Saves one list; resolves false when it could not be written. */
export async function saveStoredList(key: ListKey, value: unknown[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function clearStoredLists(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/**
 * Drops entries the screens cannot render (no id / name) and fills in missing optional lists
 * (genres, cast, seasons). One damaged entry would otherwise crash a screen on each start.
 * When nothing is dropped the same array is returned.
 */
export function sanitizeList<T>(key: ListKey, list: T[]): T[] {
  const ok = (item: any): boolean => {
    if (!item || typeof item !== 'object') return false;
    // Older builds saved panel numbers as-is (a title like 4857): turn them into text.
    for (const field of ['id', 'name', 'title', 'category', 'logo', 'poster', 'backdrop', 'synopsis', 'director']) {
      if (typeof item[field] === 'number') item[field] = String(item[field]);
    }
    if (!isText(item.id)) return false;
    if (key === 'zendit_channels' && !(isText(item.name) && typeof item.streamUrl === 'string')) return false;
    if (key === 'zendit_channels') return true;
    if (!isText(item.title)) return false;
    // Optional lists the detail screens read without checking: make sure they are arrays.
    if (!Array.isArray(item.genres)) item.genres = [];
    if (!Array.isArray(item.cast)) item.cast = [];
    if (key === 'zendit_series') {
      item.seasons = Array.isArray(item.seasons) ? item.seasons.filter((s: any) => s && Array.isArray(s.episodes)) : [];
    }
    return true;
  };
  let clean: T[] | null = null;
  for (let i = 0; i < list.length; i++) {
    if (ok(list[i])) clean?.push(list[i]);
    else if (!clean) clean = list.slice(0, i);
  }
  return clean || list;
}
