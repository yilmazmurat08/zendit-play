import React from 'react';
import { CalendarDays, Heart, History, RefreshCw, Search, Settings, X } from 'lucide-react';
import { TabType, XtreamAccount } from '../types';
import { MENU_COLORS } from '../lib/tv';
import { LiveIcon, MovieIcon, SeriesIcon } from './TvUi';
import { ZenditEmblem, ZenditWordmark } from './ZenditLogo';

interface HeaderProps {
  currentTab: TabType;
  activeAccount: XtreamAccount | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
  onOpenAccountModal?: () => void;
  onRefreshData?: () => void;
  /** Live TV: opens the TV guide grid. */
  onOpenGuide?: () => void;
  isRefreshing?: boolean;
  /** Narrow landscape stage (phone held sideways): smaller header. */
  compact?: boolean;
}

const SECTIONS: Partial<Record<TabType, { label: string; icon: React.ElementType; color?: string }>> = {
  live: { label: 'Canlı TV', icon: LiveIcon, color: MENU_COLORS.live },
  guide: { label: 'TV Rehberi', icon: CalendarDays, color: MENU_COLORS.live },
  continue: { label: 'İzlemeye Devam Et', icon: History },
  movies: { label: 'Filmler', icon: MovieIcon, color: MENU_COLORS.movies },
  series: { label: 'Diziler', icon: SeriesIcon, color: MENU_COLORS.series },
  settings: { label: 'Ayarlar', icon: Settings },
};

const circleBtn =
  'tv-focus shrink-0 w-9 h-9 sm:w-10 sm:h-10 tv:w-[4.75rem] tv:h-[4.75rem] rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white';
const circleIcon = 'w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] tv:w-[2rem] tv:h-[2rem]';

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
  onGoHome,
  onOpenSettings,
  onOpenFavorites,
  onOpenHistory,
  onRefreshData,
  onOpenGuide,
  isRefreshing = false,
  compact = false,
}) => {
  const isHome = currentTab === 'home';
  const section = SECTIONS[currentTab];
  const hasSearch = currentTab !== 'settings' && currentTab !== 'continue';

  const searchInput = (
    <div className="relative flex-1 min-w-0 tv:flex-initial tv:w-[27rem] tv:min-w-[11rem]">
      <Search className="absolute left-4 tv:left-[1.6rem] top-1/2 -translate-y-1/2 w-[18px] h-[18px] tv:w-[2rem] tv:h-[2rem] text-white/85 pointer-events-none" />
      <input
        id="header-search-input"
        type="text"
        placeholder="Ara"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus={!isHome}
        className="w-full h-10 tv:h-[4.75rem] rounded-full bg-white/[0.08] border border-white/[0.08] pl-11 tv:pl-[4.6rem] pr-10 text-sm tv:text-[1.5rem] text-white placeholder:text-white/70 outline-none focus:border-brand focus:bg-white/[0.12] transition-colors"
      />
      {searchQuery && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onSearchChange('')}
          className="absolute right-3 tv:right-[1.4rem] top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
        >
          <X className="w-4 h-4 tv:w-[1.5rem] tv:h-[1.5rem]" />
        </button>
      )}
    </div>
  );

  return (
    <header
      id="zendit-top-header"
      className={`shrink-0 z-40 w-full px-4 pt-3 pb-3 ${
        compact ? 'tv:px-[2.5rem] tv:pt-[0.9rem] tv:pb-[0.6rem]' : 'tv:px-[5rem] tv:pt-[1.6rem] tv:pb-[1.1rem]'
      }`}
    >
      <div
        className={`flex ${isHome || isSearchOpen ? 'flex-wrap' : 'flex-nowrap'} tv:flex-nowrap items-center gap-2 sm:gap-2.5 tv:gap-[1.25rem]`}
      >
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          title="Ana Sayfa"
          aria-label="ZENdit player - Ana Sayfa"
          className="shrink-0 flex items-end rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand pr-1"
        >
          <ZenditEmblem className={`w-11 h-11 ${compact ? 'tv:w-[5.25rem] tv:h-[5.25rem]' : 'tv:w-[6.5rem] tv:h-[6.5rem]'}`} />
          <ZenditWordmark
            className={`${isHome ? 'block' : 'hidden sm:block'} ml-[0.1rem] mb-[0.55rem] text-[1.155rem] ${
              compact ? 'tv:mb-[1.05rem] tv:text-[2.2rem]' : 'tv:mb-[1.3rem] tv:text-[2.73rem]'
            }`}
          />
        </button>

        {!isHome && <span className="hidden tv:block w-px h-[4.5rem] bg-white/15 mx-[0.5rem]" />}

        {isHome ? (
          <>
            <div className="order-last w-full tv:order-none tv:w-auto tv:min-w-0 flex">{searchInput}</div>
            {onRefreshData && (
              <button
                id="btn-header-refresh"
                type="button"
                onClick={onRefreshData}
                disabled={isRefreshing}
                title="Listeleri Yenile"
                className={circleBtn}
              >
                <RefreshCw className={`${circleIcon} ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button type="button" onClick={onOpenSettings} title="Ayarlar" className={circleBtn}>
              <Settings className={circleIcon} />
            </button>
            <button type="button" onClick={onOpenHistory} title="Son İzlenenler" className={circleBtn}>
              <History className={circleIcon} />
            </button>
          </>
        ) : (
          <>
            {section && (
              <div
                className="min-w-0 shrink flex items-center gap-1.5 sm:gap-2 tv:gap-[0.9rem] h-9 sm:h-10 tv:h-[4.75rem] px-3 sm:px-3.5 tv:px-[1.9rem] rounded-full bg-white/[0.08] border border-white/[0.08]"
                style={section.color ? { borderColor: `rgb(${section.color} / 0.45)` } : undefined}
              >
                <section.icon
                  className="shrink-0 w-[18px] h-[18px] tv:w-[2.2rem] tv:h-[2.2rem]"
                  style={
                    section.color
                      ? { color: `rgb(${section.color})`, filter: `drop-shadow(0 0 0.5rem rgb(${section.color} / 0.7))` }
                      : undefined
                  }
                />
                <span className="truncate text-sm tv:text-[2rem] font-bold tracking-tight">{section.label}</span>
              </div>
            )}

            <div className="flex-1 min-w-0" />

            {hasSearch && isSearchOpen && (
              <div className="order-last w-full tv:order-none tv:w-auto tv:min-w-0 flex">{searchInput}</div>
            )}

            {currentTab === 'live' && onOpenGuide && (
              <button
                id="btn-header-guide"
                type="button"
                onClick={onOpenGuide}
                title="TV Rehberi"
                aria-label="TV Rehberi"
                className={circleBtn}
              >
                <CalendarDays className={circleIcon} />
              </button>
            )}

            {hasSearch && (
              <>
                <button type="button" onClick={onOpenFavorites} title="Favoriler" className={circleBtn}>
                  <Heart className={circleIcon} />
                </button>
                <button
                  id="btn-header-search"
                  type="button"
                  onClick={onToggleSearch}
                  title="Ara"
                  className={`${circleBtn} ${isSearchOpen ? '!bg-brand' : ''}`}
                >
                  <Search className={circleIcon} />
                </button>
              </>
            )}
          </>
        )}

        {isHome && <div className="hidden tv:block flex-1" />}
      </div>
    </header>
  );
};
