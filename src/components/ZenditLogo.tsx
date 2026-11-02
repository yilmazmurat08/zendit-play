import type { CSSProperties } from 'react';
import emblem from '../assets/zendit-emblem.png';

/** The shield emblem (the "ZEN" part of the logo). */
export function ZenditEmblem({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <img src={emblem} alt="" draggable={false} className={`block select-none ${className}`} style={style} />;
}

/** The "dit" wordmark next to the emblem, with the small "player" tagline under it. */
export function ZenditWordmark({
  className = '',
  style,
  tagline = true,
}: {
  className?: string;
  style?: CSSProperties;
  tagline?: boolean;
}) {
  return (
    <span className={`relative block ${className}`} style={style}>
      <span className="zendit-word block font-extrabold leading-none tracking-tight">dit</span>
      {tagline && (
        <span aria-hidden className="zendit-tagline absolute left-[0.07em] top-full mt-[0.03em] text-[0.42em]">
          player
        </span>
      )}
    </span>
  );
}

interface ZenditLogoProps {
  size?: 'mini' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

const SIZE_PX: Record<NonNullable<ZenditLogoProps['size']>, number> = {
  mini: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 140,
};

export function ZenditLogo({ size = 'md', showText = false, showTagline = true, className = '' }: ZenditLogoProps) {
  const px = SIZE_PX[size];
  return (
    <div id="zendit-brand-logo" role="img" aria-label="ZENdit player" className={`inline-flex items-end ${className}`}>
      <ZenditEmblem style={{ width: px, height: px }} />
      {showText && (
        <ZenditWordmark
          tagline={showTagline}
          style={{ fontSize: px * 0.42, marginLeft: px * 0.02, marginBottom: px * 0.2 }}
        />
      )}
    </div>
  );
}
