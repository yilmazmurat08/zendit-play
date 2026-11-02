import React, { Fragment, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { XtreamAccount } from '../types';
import { DeviceInfo, getSubscription, useNow } from '../lib/tv';

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

export function PosterImage({ src, className = '' }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
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
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

export interface CategoryItem {
  name: string;
  count?: number;
}

export function CategoryPanel({
  items,
  selected,
  onSelect,
}: {
  items: CategoryItem[];
  selected: string;
  onSelect: (name: string) => void;
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
            {cat.count !== undefined && <span className="text-[0.8em] font-medium opacity-50">{cat.count}</span>}
          </button>
        );
      })}
    </nav>
  );
}

function InfoPairs({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[auto_auto] justify-start gap-x-3 tv:gap-x-[1.25rem] leading-snug">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <span className="text-white/60 font-medium">{label}:</span>
          <span className="font-semibold text-white truncate">{value}</span>
        </Fragment>
      ))}
    </div>
  );
}

interface FooterProps {
  account: XtreamAccount | null;
  device: DeviceInfo;
  variant?: 'home' | 'section';
  children?: React.ReactNode;
}

export function Footer({ account, device, variant = 'section', children }: FooterProps) {
  const now = useNow();
  const sub = getSubscription(account);
  const playlist = account?.name || '-';

  if (variant === 'home') {
    return (
      <footer className="shrink-0 grid grid-cols-2 tv:grid-cols-3 items-end gap-3 text-[11px] tv:text-[1.05rem] pt-2 tv:pt-[1.1rem]">
        <InfoPairs rows={[['Playlist', playlist], ['Bitiş', sub.expiry]]} />
        <div className="justify-self-end tv:justify-self-center">
          <InfoPairs rows={[['Cihaz ID', device.id], ['Cihaz PIN', device.pin]]} />
        </div>
        <div className="hidden tv:block justify-self-end text-right font-semibold leading-snug">
          <div>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-white/80">
            {now.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 tv:px-[5rem] py-2.5 tv:py-[1.1rem] text-[11px] tv:text-[1.05rem]">
      <div className="flex items-center gap-4 tv:gap-[1.5rem]">
        <InfoPairs rows={[['Cihaz ID', device.id], ['Playlist', playlist]]} />
        <span className="w-px self-stretch bg-white/25" />
        <InfoPairs rows={[['Cihaz PIN', device.pin], ['Bitiş', sub.expiry]]} />
      </div>
      {children && <div className="flex flex-wrap items-center gap-x-5 gap-y-1 tv:gap-x-[2.75rem]">{children}</div>}
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
