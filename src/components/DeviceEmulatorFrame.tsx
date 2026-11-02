import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Home,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Wifi,
  Battery,
  Tv,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronLeft,
  Circle,
  Square,
} from 'lucide-react';

export type EmulatorViewMode = 'native' | 'phone_frame' | 'tv_frame';

interface DeviceEmulatorFrameProps {
  children: React.ReactNode;
  activeAccountName?: string;
  onNavigateHome?: () => void;
  onNavigateBack?: () => void;
}

export const DeviceEmulatorFrame: React.FC<DeviceEmulatorFrameProps> = ({
  children,
  activeAccountName = 'Zendit UHD',
  onNavigateHome,
  onNavigateBack,
}) => {
  // Default to 'native' so the user experiences the real full-screen Android app natively
  const [viewMode, setViewMode] = useState<EmulatorViewMode>('native');
  const [volumeLevel, setVolumeLevel] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('20:58');

  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live time update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  const triggerVolumeChange = (delta: number) => {
    setVolumeLevel((prev) => {
      const next = Math.max(0, Math.min(100, prev + delta));
      if (next === 0) setIsMuted(true);
      else setIsMuted(false);
      return next;
    });
    setShowVolumeHud(true);
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeHud(false);
    }, 2000);
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
    setShowVolumeHud(true);
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeHud(false);
    }, 2000);
  };

  // 1. NATIVE ANDROID MOBILE APP VIEW (100% Edge-to-Edge Native Feel)
  if (viewMode === 'native') {
    return (
      <div className="relative min-h-screen bg-[#0F1016] text-[#F3F4F6] flex flex-col antialiased selection:bg-[#00E5FF] selection:text-black">
        {/* Subtle Android Status Bar */}
        <div className="w-full h-7 bg-[#0B0C12]/90 backdrop-blur-md px-4 flex items-center justify-between text-[11px] font-semibold text-zinc-300 z-40 select-none border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white">{currentTimeStr}</span>
            <span className="text-[10px] font-mono text-zinc-400">Zendit Play IPTV</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-300">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono font-bold text-[#00E5FF]">5G</span>
              <Wifi className="w-3.5 h-3.5 text-[#00E5FF]" />
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="text-[10px] font-bold text-white">96%</span>
              <Battery className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            </div>

            {/* Switch to Emulator Frame Frame */}
            <button
              onClick={() => setViewMode('phone_frame')}
              className="ml-2 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] text-[10px] font-bold text-zinc-300 transition-colors flex items-center gap-1"
              title="Android Studio Emülatör Çerçevesini Aç"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden sm:inline">Emülatör Çerçevesi</span>
            </button>
          </div>
        </div>

        {/* Volume Overlay HUD if activated */}
        {showVolumeHud && (
          <div className="fixed right-4 top-14 z-50 bg-[#1F222D]/95 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-150">
            {isMuted || volumeLevel === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : volumeLevel > 50 ? (
              <Volume2 className="w-4 h-4 text-[#00E5FF]" />
            ) : (
              <Volume1 className="w-4 h-4 text-[#00E5FF]" />
            )}
            <div className="w-2 h-24 bg-white/10 rounded-full relative overflow-hidden flex flex-col justify-end">
              <div
                style={{ height: isMuted ? '0%' : `${volumeLevel}%` }}
                className="w-full bg-[#00E5FF] rounded-full transition-all duration-150"
              />
            </div>
            <span className="text-[9px] font-mono text-zinc-300 font-bold">
              {isMuted ? '0' : volumeLevel}
            </span>
          </div>
        )}

        {/* Real App Component */}
        <div className="flex-1 w-full flex flex-col relative">{children}</div>
      </div>
    );
  }

  // 2. ANDROID STUDIO EMULATOR CHASSIS VIEW (Phone Frame / TV Frame)
  return (
    <div className="min-h-screen bg-[#07080C] text-zinc-200 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-x-hidden font-sans">
      {/* Top Floating Switcher */}
      <div className="mb-3 flex items-center gap-2 bg-[#141620] border border-white/10 p-1.5 rounded-2xl shadow-2xl z-40">
        <button
          onClick={() => setViewMode('native')}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-black shadow-lg flex items-center gap-1.5 transition-all hover:scale-105"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>📱 Gerçek Tam Ekran Mobil Modu</span>
        </button>

        <button
          onClick={() => setViewMode('phone_frame')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            viewMode === 'phone_frame'
              ? 'bg-white/20 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pixel 8 Pro</span>
        </button>

        <button
          onClick={() => setViewMode('tv_frame')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            viewMode === 'tv_frame'
              ? 'bg-white/20 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Android TV 4K</span>
        </button>
      </div>

      {/* Device Chassis Container */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 my-auto">
        <div
          style={
            viewMode === 'tv_frame'
              ? { width: 'min(94vw, 1060px)', height: '620px' }
              : { width: 'min(92vw, 410px)', height: '820px' }
          }
          className={`relative bg-[#181B26] p-3 sm:p-3.5 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(0,229,255,0.18)] border-4 border-[#2A2E3D] transition-all duration-300 ${
            viewMode === 'tv_frame' ? 'rounded-[24px]' : 'rounded-[48px]'
          }`}
        >
          {/* Inner Screen Display */}
          <div
            className={`w-full h-full bg-[#0F1016] overflow-hidden flex flex-col relative border border-white/10 shadow-inner ${
              viewMode === 'tv_frame' ? 'rounded-[16px]' : 'rounded-[36px]'
            }`}
          >
            {/* Status Bar for Phone */}
            {viewMode === 'phone_frame' && (
              <div className="w-full h-8 bg-[#0F1016]/95 backdrop-blur-md px-5 pt-1 flex items-center justify-between text-[11px] font-semibold text-zinc-300 z-30 select-none border-b border-white/[0.04] shrink-0">
                <span className="font-bold tracking-tight">{currentTimeStr}</span>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-[10px] font-mono text-[#00E5FF] font-bold">5G</span>
                  <Wifi className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">96%</span>
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            {/* App Content */}
            <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative">
              {children}
            </div>

            {/* Bottom 3-Button Navigation Bar for Phone Frame */}
            {viewMode === 'phone_frame' && (
              <div className="w-full h-8 bg-[#0F1016]/95 backdrop-blur-md flex items-center justify-around px-8 z-30 border-t border-white/[0.04] shrink-0">
                <button
                  onClick={onNavigateBack}
                  className="p-1 text-zinc-400 hover:text-[#00E5FF] active:scale-90 transition-transform"
                  title="Geri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNavigateHome}
                  className="p-1 text-zinc-400 hover:text-white active:scale-90 transition-transform"
                  title="Ana Sayfa"
                >
                  <Circle className="w-3 h-3 fill-current" />
                </button>
                <button
                  onClick={onNavigateHome}
                  className="p-1 text-zinc-400 hover:text-[#00E5FF] active:scale-90 transition-transform"
                  title="Son Uygulamalar"
                >
                  <Square className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Floating Hardware Side Toolbar */}
        <aside className="hidden md:flex flex-col items-center gap-3 p-2 bg-[#141620] border border-white/10 rounded-full shadow-2xl z-40">
          <button
            onClick={onNavigateBack}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-[#00E5FF] transition-all"
            title="Geri"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateHome}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
            title="Ana Sayfa"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => triggerVolumeChange(10)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-[#00E5FF] transition-all"
            title="Ses Aç"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => triggerVolumeChange(-10)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-[#00E5FF] transition-all"
            title="Ses Kıs"
          >
            <Volume1 className="w-4 h-4" />
          </button>
          <button
            onClick={handleMuteToggle}
            className={`p-2.5 rounded-full transition-all ${
              isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
            title="Sessize Al"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        </aside>
      </div>
    </div>
  );
};
