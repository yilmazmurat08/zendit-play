/**
 * Search text matching for Turkish titles: case-insensitive with Turkish casing rules (İ/i, I/ı)
 * and tolerant of typing without Turkish letters, so "isik" finds "IŞIK" and "sinema" finds "SİNEMA".
 */

const FOLD: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };
const FOLD_PATTERN = /[ışğüöçâîû]/g;

// Folding tens of thousands of titles on every keystroke is what makes search stutter on a TV stick,
// so each distinct string is folded once. Bounded: cleared when it grows past the limit.
const cache = new Map<string, string>();
const CACHE_LIMIT = 150000;

export function foldText(text: string | undefined | null): string {
  if (!text) return '';
  let folded = cache.get(text);
  if (folded === undefined) {
    folded = text.toLocaleLowerCase('tr-TR').replace(FOLD_PATTERN, (ch) => FOLD[ch]);
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(text, folded);
  }
  return folded;
}

/** Folded query, or '' when there is nothing to search for. */
export function foldQuery(query: string): string {
  return foldText(query.trim());
}

/** Does any of the given fields contain the (already folded) query? */
export function matchesQuery(foldedQuery: string, ...fields: (string | undefined | null)[]): boolean {
  for (const field of fields) if (field && foldText(field).includes(foldedQuery)) return true;
  return false;
}
