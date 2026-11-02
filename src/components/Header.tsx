import React from 'react';
import { ZenditLogo } from './ZenditLogo';
import { Search, RefreshCw, Settings, Heart, History, ListVideo, X } from 'lucide-react';
import { TabType, XtreamAccount } from '../types';
import { getSubscription, MENU_COLORS } from '../lib/tv';
import { LiveIcon, MovieIcon, SeriesIcon } from './TvUi';

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
  onOpenAccountModal: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  /** Narrow landscape stage (phone held sideways): hide the playlist pill. */
  compact?: boolean;
}

const SECTIONS: Partial<Record<TabType, { label: string; icon: React.ElementType; color?: string }>> = {
  live: { label: 'Canlı TV', icon: LiveIcon, color: MENU_COLORS.live },
  movies: { label: 'Filmler', icon: MovieIcon, color: MENU_COLORS.movies },
  series: { label: 'Diziler', icon: SeriesIcon, color: MENU_COLORS.series },
  settings: { label: 'Ayarlar', icon: Settings },
};

const circleBtn =
  'tv-focus shrink-0 w-10 h-10 tv:w-[4.75rem] tv:h-[4.75rem] rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white';
const circleIcon = 'w-[18px] h-[18px] tv:w-[2rem] tv:h-[2rem]';

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeAccount,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
  onGoHome,
  onOpenSettings,
  onOpenFavorites,
  onOpenHistory,
  onOpenAccountModal,
  onRefreshData,
  isRefreshing = false,
  compact = false,
}) => {
  const isHome = currentTab === 'home';
  const section = SECTIONS[currentTab];
  const sub = getSubscription(activeAccount);

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
      className="shrink-0 z-40 w-full px-4 pt-3 pb-3 tv:px-[5rem] tv:pt-[2.5rem] tv:pb-[1.75rem]"
    >
      <div className="flex flex-wrap tv:flex-nowrap items-center gap-2.5 tv:gap-[1.25rem]">
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          title="Ana Sayfa"
          className="shrink-0 flex items-center gap-2 tv:gap-[0.9rem] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand pr-1"
        >
          <span className="[&_svg]:w-8 [&_svg]:h-8 tv:[&_svg]:w-[4.25rem] tv:[&_svg]:h-[4.25rem]">
            <ZenditLogo size="md" />
          </span>
          <span className={`${isHome ? 'flex' : 'hidden sm:flex'} flex-col leading-none`}>
            <span className="text-lg tv:text-[2.35rem] font-extrabold tracking-tight text-white">
              ZEND<span className="text-brand">IT</span>
            </span>
            <span className="self-end text-xs tv:text-[1.45rem] font-bold text-white/90 tv:-mt-[0.1rem]">Play</span>
          </span>
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
            <button
              id="btn-header-account"
              type="button"
              onClick={onOpenAccountModal}
              title="Playlist / Hesap"
              className={`tv-focus ${compact ? 'hidden' : 'hidden sm:flex'} min-w-0 items-center gap-3 tv:gap-[1rem] h-10 tv:h-[4.75rem] pl-2 pr-4 tv:pl-[0.9rem] tv:pr-[2rem] rounded-full bg-white/[0.08] border border-white/[0.08] text-left`}
            >
              <span className="shrink-0 w-7 h-7 tv:w-[3.1rem] tv:h-[3.1rem] rounded-full border-2 border-white/80 flex items-center justify-center">
                <ListVideo className="w-3.5 h-3.5 tv:w-[1.5rem] tv:h-[1.5rem]" />
              </span>
              <span className="min-w-0 text-[10px] tv:text-[1rem] font-semibold leading-tight">
                <span className="block truncate max-w-[9rem] tv:max-w-[14rem]">Playlist: {activeAccount?.name || '-'}</span>
                <span className="block truncate text-white/80">Bitiş: {sub.expiry}</span>
              </span>
            </button>

            {section && (
              <div
                className="shrink-0 flex items-center gap-2 tv:gap-[0.9rem] h-10 tv:h-[4.75rem] px-3.5 tv:px-[1.9rem] rounded-full bg-white/[0.08] border border-white/[0.08]"
                style={section.color ? { borderColor: `rgb(${section.color} / 0.45)` } : undefined}
              >
                <section.icon
                  className="w-[18px] h-[18px] tv:w-[2.2rem] tv:h-[2.2rem]"
                  style={
                    section.color
                      ? { color: `rgb(${section.color})`, filter: `drop-shadow(0 0 0.5rem rgb(${section.color} / 0.7))` }
                      : undefined
                  }
                />
                <span className="text-sm tv:text-[2rem] font-bold tracking-tight">{section.label}</span>
              </div>
            )}

            <div className="flex-1" />

            {currentTab !== 'settings' && isSearchOpen && (
              <div className="order-last w-full tv:order-none tv:w-auto tv:min-w-0 flex">{searchInput}</div>
            )}

            {currentTab !== 'settings' && (
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
            <button type="button" onClick={onOpenSettings} title="Ayarlar" className={circleBtn}>
              <Settings className={circleIcon} />
            </button>
          </>
        )}

        {isHome && <div className="hidden tv:block flex-1" />}

        <div className={`${isHome ? 'block' : 'hidden sm:block'} ml-auto tv:ml-[1rem] shrink-0 text-right leading-tight`}>
          <div className="text-xs tv:text-[1.5rem] font-bold text-white">{sub.title}</div>
          <div className="text-sm tv:text-[1.75rem] font-bold text-alert">{sub.remaining}</div>
        </div>
      </div>

    </header>
  );
};
