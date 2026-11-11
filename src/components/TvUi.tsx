import React, { useState } from 'react';
import { ImageOff, Lock, LockOpen } from 'lucide-react';
import { useNow } from '../lib/tv';

type IconProps = { className?: string; style?: React.CSSProperties };

/* Filled menu icons (Canlı TV / Filmler / Diziler / Favoriler) - they take the tile color via currentColor. */
export function LiveIcon({ className = '', style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M8 2.8l4 3.4 4-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.6" y="6.6" width="18.8" height="13.8" rx="2.6" stroke="currentColor" strokeWidth="2.1" />
      <path d="M10 10.2v6.4l5.3-3.2z" fill="currentColor" />
    </svg>
  );
}

export function MovieIcon({ className = '', style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.2 3.6h15.6a1.2 1.2 0 0 1 1.2 1.2v3.6H3V4.8a1.2 1.2 0 0 1 1.2-1.2zM7.4 4.4h1.9L7.8 7.6H5.9zM11.4 4.4h1.9l-1.5 3.2H9.9zM15.4 4.4h1.9l-1.5 3.2h-1.9z"
      />
      <path fill="currentColor" d="M3 9.4h18v9.4a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18.8z" />
    </svg>
  );
}

export function SeriesIcon({ className = '', style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M3.8 7.4v11.2a2.6 2.6 0 0 0 2.6 2.6h10.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9.6 2.4h9.8a2.2 2.2 0 0 1 2.2 2.2v9.8a2.2 2.2 0 0 1-2.2 2.2H9.6a2.2 2.2 0 0 1-2.2-2.2V4.6a2.2 2.2 0 0 1 2.2-2.2zM12.6 6.2v6.6l5.2-3.3z"
      />
    </svg>
  );
}

export function HeartIcon({ className = '', style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20.8s-7.6-4.6-9.6-9.3C1 8.2 3 4.4 6.9 4.4c2.2 0 3.7 1.2 5.1 3 1.4-1.8 2.9-3 5.1-3 3.9 0 5.9 3.8 4.5 7.1-2 4.7-9.6 9.3-9.6 9.3z"
      />
    </svg>
  );
}

/** Poster / logo with a placeholder; `locked` (parental control) blurs it and shows a lock. */
export function PosterImage({
  src,
  className = '',
  locked = false,
  small = false,
}: {
  src?: string;
  className?: string;
  locked?: boolean;
  /** Small thumbnails (channel logos): lighter blur, smaller lock. */
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (locked) {
    return (
      <span className={`relative block w-full h-full overflow-hidden bg-black/30 ${className}`}>
        {src && !failed && (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover scale-125"
            style={{ filter: `blur(${small ? 5 : 18}px) brightness(0.65)` }}
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={`rounded-full bg-black/55 text-white flex items-center justify-center ${
              small ? 'w-[70%] h-[70%] max-w-[2rem] max-h-[2rem]' : 'w-[38%] aspect-square max-w-[4.5rem]'
            }`}
          >
            <Lock className="w-1/2 h-1/2" />
          </span>
        </span>
      </span>
    );
  }
  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-white/55 ${className}`}>
        <ImageOff className="w-1/3 h-1/3 max-w-[4rem] stroke-[1.5]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

export interface CategoryItem {
  name: string;
  count?: number;
  /** Under parental control: lock icon (open lock once the PIN was entered). */
  locked?: boolean;
}

export function CategoryPanel({
  items,
  selected,
  onSelect,
  unlocked = false,
}: {
  items: CategoryItem[];
  selected: string;
  onSelect: (name: string) => void;
  unlocked?: boolean;
}) {
  return (
    <nav className="glass shrink-0 min-h-0 rounded-2xl tv:rounded-[2rem] p-2 tv:p-[1.1rem] flex tv:flex-col gap-1.5 tv:gap-[0.35rem] overflow-x-auto tv:overflow-x-hidden tv:overflow-y-auto no-scrollbar">
      {items.map((cat) => {
        const isActive = cat.name === selected;
        return (
          <button
            key={cat.name}
            type="button"
            autoFocus={isActive}
            onClick={() => onSelect(cat.name)}
            className={`tv-focus shrink-0 flex items-center justify-between gap-3 text-left rounded-xl tv:rounded-[1rem] px-3.5 py-2 tv:px-[1.1rem] tv:py-[0.95rem] text-sm tv:text-[1.15rem] font-semibold whitespace-nowrap ${
              isActive ? 'bg-lilac text-white' : 'text-white/85'
            }`}
          >
            <span className="truncate">{cat.name}</span>
            <span className="shrink-0 flex items-center gap-2 tv:gap-[0.5rem]">
              {cat.count !== undefined && <span className="text-[0.8em] font-medium opacity-50">{cat.count}</span>}
              {cat.locked &&
                (unlocked ? (
                  <LockOpen aria-label="Kilit açık" className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem] text-white/60" />
                ) : (
                  <Lock
                    aria-label="Kilitli"
                    className={`w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem] ${isActive ? 'text-white' : 'text-brand'}`}
                  />
                ))}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

interface FooterProps {
  variant?: 'home' | 'section';
  children?: React.ReactNode;
}

/** Bottom bar: clock and date on the home screen (TV layout), remote color-key hints on the other screens. */
export function Footer({ variant = 'section', children }: FooterProps) {
  const now = useNow();
  if (variant === 'home') {
    return (
      <footer className="hidden tv:flex shrink-0 justify-end items-baseline gap-[0.9rem] pt-[0.9rem] text-[1.05rem] font-semibold">
        <span>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="text-white/70">{now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </footer>
    );
  }
  if (!children) return null;
  return (
    <footer className="shrink-0 flex flex-wrap items-center justify-end gap-x-5 gap-y-1 tv:gap-x-[2.75rem] px-4 tv:px-[5rem] py-2.5 tv:py-[1rem] text-[11px] tv:text-[1.05rem]">
      {children}
    </footer>
  );
}

const LEGEND_COLORS = {
  red: 'bg-[#E53935]',
  blue: 'bg-[#4FC3F7]',
  yellow: 'bg-[#FDD835]',
  green: 'bg-[#43A047]',
};

export function LegendKey({
  color,
  label,
  onClick,
}: {
  color: keyof typeof LEGEND_COLORS;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="flex items-center gap-2 tv:gap-[0.6rem] text-xs tv:text-[1.3rem] font-semibold text-white/95 hover:text-white"
    >
      <span className={`w-3 h-3 tv:w-[1.2rem] tv:h-[1.2rem] rounded-full ${LEGEND_COLORS[color]}`} />
      {label}
    </button>
  );
}
