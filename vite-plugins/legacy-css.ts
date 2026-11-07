import type { Plugin } from 'vite';

/**
 * Makes the production CSS work on older Android System WebView versions
 * (Android TV sticks often ship Chrome 8x-9x and are rarely updated).
 *
 * 1. Cascade layers (`@layer`, Chrome 99+): an older WebView drops every rule
 *    inside a layer, which removes all Tailwind utilities and with them the TV
 *    layout and focus styles. The layers are unwrapped in place. Tailwind
 *    already writes them in cascade order (properties, theme, base, components,
 *    utilities) and the app's own unlayered rules come after them, so the
 *    result renders the same on new WebViews.
 * 2. The individual `translate` property (Chrome 104+): a `transform`
 *    fallback is added for WebViews without it, so centred icons and toasts
 *    stay in place.
 */
export function legacyCssPlugin(): Plugin {
  return {
    name: 'zendit-legacy-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue;
        const css = typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
        file.source = addTransformFallbacks(unwrapLayers(css));
      }
    },
  };
}

/** Index just after the `}` that closes the block whose `{` is at `open`. */
function blockEnd(css: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new Error('legacy-css: unbalanced braces');
}

export function unwrapLayers(css: string): string {
  let out = '';
  let i = 0;
  const re = /@layer\s*[\w\s,.-]*([;{])/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    out += css.slice(i, m.index);
    if (m[1] === ';') {
      // Layer order statement: nothing to keep.
      i = m.index + m[0].length;
    } else {
      const open = m.index + m[0].length - 1;
      const end = blockEnd(css, open);
      // Unwrap recursively (nested layers).
      out += unwrapLayers(css.slice(open + 1, end - 1));
      i = end;
    }
    re.lastIndex = i;
  }
  return out + css.slice(i);
}

const TRANSLATE = 'translate:var(--tw-translate-x) var(--tw-translate-y)';

export function addTransformFallbacks(css: string): string {
  const fallbacks: string[] = [];
  // Simple rules only: `selector{...declarations...}` without nested blocks.
  const ruleRe = /([^{}@;]+)\{([^{}]*)\}/g;
  for (let m = ruleRe.exec(css); m; m = ruleRe.exec(css)) {
    const [, selector, body] = m;
    if (body.includes(TRANSLATE)) {
      fallbacks.push(`${selector.trim()}{transform:translate(var(--tw-translate-x,0),var(--tw-translate-y,0))}`);
    }
  }
  if (fallbacks.length === 0) return css;
  return `${css}@supports not (translate:0){${fallbacks.join('')}}`;
}
