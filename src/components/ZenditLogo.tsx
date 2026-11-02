import { useId } from 'react';

interface ZenditLogoProps {
  size?: 'mini' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const SIZE_PX: Record<NonNullable<ZenditLogoProps['size']>, number> = {
  mini: 24,
  sm: 30,
  md: 38,
  lg: 56,
  xl: 96,
};

export function ZenditLogo({ size = 'md', showText = false, className = '' }: ZenditLogoProps) {
  const px = SIZE_PX[size];
  const textSize = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-xl' : 'text-base';

  const reactId = useId();
  const gradientId = `zendit-shield-metal-${reactId}`;
  const glowId = `zendit-glow-${reactId}`;

  return (
    <div id="zendit-brand-logo" className={`inline-flex items-center gap-3 ${className}`}>
      <svg width={px} height={px} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradientId} x1="20" y1="5" x2="80" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8EAF0" />
            <stop offset="35%" stopColor="#8B93A6" />
            <stop offset="55%" stopColor="#C7CCDA" />
            <stop offset="100%" stopColor="#5B6070" />
          </linearGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M50 6 L83 19 L83 48 C83 71 68 87 50 94 C32 87 17 71 17 48 L17 19 Z"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
        />

        <path
          d="M38 32 L38 68 L69 50 Z"
          stroke="#FF5B3D"
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
          filter={`url(#${glowId})`}
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${textSize} font-semibold tracking-tight text-white`}>
            ZENDIT<span className="text-[#FF5B3D] font-bold">PLAY</span>
          </span>
          {size === 'xl' && <span className="text-xs text-zinc-500 tracking-[0.2em] mt-1.5">IPTV STREAMING</span>}
        </div>
      )}
    </div>
  );
}
