import React from 'react';
import { TabType } from '../types';
import { ZenditLogo } from './ZenditLogo';
import { Tv, Film, Clapperboard, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: TabType;
  onTabSelect: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabSelect }) => {
  return (
    <nav
      id="zendit-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F1016]/95 border-t border-white/[0.06] px-2 py-1.5 pb-safe transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Ana Sayfa */}
        <button
          id="nav-tab-home"
          onClick={() => onTabSelect('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-150 ${
            currentTab === 'home'
              ? 'text-[#00E5FF]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative mb-0.5">
            <ZenditLogo size="mini" />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00E5FF] rounded-full" />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-tight">Ana Sayfa</span>
        </button>

        {/* Canlı TV */}
        <button
          id="nav-tab-live"
          onClick={() => onTabSelect('live')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-150 ${
            currentTab === 'live'
              ? 'text-[#00E5FF]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Tv className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Canlı TV</span>
        </button>

        {/* Filmler */}
        <button
          id="nav-tab-movies"
          onClick={() => onTabSelect('movies')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-150 ${
            currentTab === 'movies'
              ? 'text-[#00E5FF]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Film className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Filmler</span>
        </button>

        {/* Diziler */}
        <button
          id="nav-tab-series"
          onClick={() => onTabSelect('series')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-150 ${
            currentTab === 'series'
              ? 'text-[#00E5FF]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clapperboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Diziler</span>
        </button>

        {/* Ayarlar */}
        <button
          id="nav-tab-settings"
          onClick={() => onTabSelect('settings')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-150 ${
            currentTab === 'settings'
              ? 'text-[#00E5FF]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Ayarlar</span>
        </button>
      </div>
    </nav>
  );
};
