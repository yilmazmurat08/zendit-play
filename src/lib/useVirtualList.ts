import React, { useState, useRef, useEffect } from 'react';

/**
 * Minimal fixed-height list windowing, with no external dependency. Real
 * Xtream accounts can have thousands of live channels (and sizeable VOD
 * catalogs too) - rendering every single one as a DOM node at once is a
 * direct, common cause of scroll jank and freezes on a phone, regardless of
 * how light the rest of the CSS is. This renders only what's actually
 * visible (plus a small overscan buffer), the same core idea libraries like
 * react-window use, sized for this app's specific lists rather than pulling
 * in a general-purpose dependency for it.
 *
 * Works for a plain list (one row = one item) or a grid (one "row" here =
 * one visual row of N items) - the caller decides what an "item" in this
 * hook's sense maps to when it renders the slice.
 */
export interface VirtualListState {
  containerRef: React.RefObject<HTMLDivElement | null>;
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number; // exclusive
}

export function useVirtualList(itemCount: number, itemHeight: number, overscan: number = 4): VirtualListState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // rAF-throttled: native `scroll` events can fire far more often than the
    // screen actually repaints, so this coalesces bursts of them into at
    // most one state update per frame instead of one per event - the state
    // update (and the re-render it causes) is the expensive part, not
    // reading `scrollTop` itself.
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrollTop(el.scrollTop);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    setViewportHeight(el.clientHeight);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
      ro.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, []);

  const { totalHeight, offsetY, startIndex, endIndex } = computeVirtualRange(
    itemCount,
    itemHeight,
    scrollTop,
    viewportHeight,
    overscan
  );

  return { containerRef, totalHeight, offsetY, startIndex, endIndex };
}

/**
 * The actual windowing math, split out from the hook so it can be tested
 * directly with plain numbers - no DOM, no React, no ResizeObserver needed.
 */
export function computeVirtualRange(
  itemCount: number,
  itemHeight: number,
  scrollTop: number,
  viewportHeight: number,
  overscan: number
): { totalHeight: number; offsetY: number; startIndex: number; endIndex: number } {
  const safeItemCount = Math.max(0, itemCount);
  const safeItemHeight = itemHeight > 0 ? itemHeight : 1;
  const totalHeight = safeItemCount * safeItemHeight;

  if (safeItemCount === 0 || viewportHeight <= 0) {
    return { totalHeight, offsetY: 0, startIndex: 0, endIndex: 0 };
  }

  const rawStart = Math.floor(scrollTop / safeItemHeight) - overscan;
  const startIndex = Math.min(safeItemCount, Math.max(0, rawStart));

  const visibleCount = Math.ceil(viewportHeight / safeItemHeight) + overscan * 2;
  const endIndex = Math.min(safeItemCount, startIndex + visibleCount);

  return { totalHeight, offsetY: startIndex * safeItemHeight, startIndex, endIndex };
}
