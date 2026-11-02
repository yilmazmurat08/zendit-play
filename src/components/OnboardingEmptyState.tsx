import React from 'react';
import {
  Tv,
  Film,
  Sparkles,
  LogIn,
  Upload,
  PlusCircle,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface OnboardingEmptyStateProps {
  onOpenLogin: () => void;
  onLoadDemo: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  onOpenLogin,
  onLoadDemo,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in duration-300">
      {/* Brand Icon Glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] blur-2xl opacity-40 rounded-full animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#1E2230] to-[#2A2E3D] border border-white/20 shadow-2xl flex items-center justify-center text-[#00E5FF]">
          <Tv className="w-10 h-10" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white tracking-wide mb-2">
        Zendit Play'e Hoş Geldiniz
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
        Xtream Codes API, M3U çalma listesi bağlantısı veya yerel M3U dosyanızı ekleyerek canlı TV, film ve dizilerinizi anında izlemeye başlayın.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={onOpenLogin}
          className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-black font-bold text-sm shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-98 transition-all"
        >
          <LogIn className="w-4 h-4 text-black" />
          <span>Hesap & Liste Ekle</span>
        </button>

        <button
          onClick={onLoadDemo}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 active:scale-98 transition-all"
        >
          <Sparkles className="w-4 h-4 text-[#00E5FF]" />
          <span>Demo İçerikle Başla</span>
        </button>
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-10">
        <div className="bg-[#181A20] border border-white/5 p-3.5 rounded-2xl flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Ultra Akıcı</div>
            <div className="text-[10px] text-zinc-400">ExoPlayer & HLS</div>
          </div>
        </div>

        <div className="bg-[#181A20] border border-white/5 p-3.5 rounded-2xl flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-[#7C4DFF]/10 text-[#7C4DFF]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">4K & FHD Desteği</div>
            <div className="text-[10px] text-zinc-400">VOD & Diziler</div>
          </div>
        </div>

        <div className="bg-[#181A20] border border-white/5 p-3.5 rounded-2xl flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Yerel Gizlilik</div>
            <div className="text-[10px] text-zinc-400">Güvenli depolama</div>
          </div>
        </div>
      </div>
    </div>
  );
};
