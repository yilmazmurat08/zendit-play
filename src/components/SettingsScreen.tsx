import React, { useState } from 'react';
import { AppSettings } from '../types';
import {
  ArrowLeft,
  Globe,
  Home,
  RefreshCw,
  Tv,
  Video,
  PlaySquare,
  FastForward,
  Trash2,
  Calendar,
  Zap,
  Check,
  ChevronRight,
  Sparkles,
  BarChart3,
  Smartphone,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearData: () => void;
  onOpenAnalytics?: () => void;
  onOpenDeviceInstall?: () => void;
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onClearData,
  onOpenAnalytics,
  onOpenDeviceInstall,
  onBack,
}) => {
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [clearedToast, setClearedToast] = useState(false);

  const toggleSetting = (key: keyof AppSettings) => {
    if (typeof settings[key] === 'boolean') {
      onUpdateSettings({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  const handleClearDataClick = () => {
    onClearData();
    setClearedToast(true);
    setTimeout(() => setClearedToast(false), 2000);
  };

  return (
    <div
      id="zendit-settings-screen"
      className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-5 animate-in fade-in duration-200"
    >
      {/* Top Header matching Screenshot 10 */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[#FF5B3D]" />
          </button>
        )}
        <h1 className="text-xl md:text-2xl font-black text-white tracking-wider uppercase font-display">
          AYARLAR
        </h1>
      </div>

      {/* 1. Oynatıcı Motoru Seçimi Card (Matching Spec C & Screenshot 10) */}
      <div className="bg-[#2A2750] rounded-3xl p-5 border border-white/[0.08] shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-white block">Oynatıcı Motoru Seçimi</span>
            <span className="text-xs text-zinc-400">
              {settings.playerEngine === 'exo'
                ? 'Dahili ExoPlayer (Sıfır gecikme & donanım hızlandırma)'
                : 'Harici Cihaz Oynatıcısı (Android Intent / VLC / MX Player)'}
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-[#FF5B3D]" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Sistem (Exo) Button */}
          <button
            id="btn-player-engine-exo"
            onClick={() => onUpdateSettings({ ...settings, playerEngine: 'exo' })}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              settings.playerEngine === 'exo'
                ? 'bg-[#FF5B3D] text-black shadow-[0_0_15px_rgba(255,91,61,0.4)]'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {settings.playerEngine === 'exo' && <Check className="w-4 h-4" />}
            <span>Sistem (Exo)</span>
          </button>

          {/* Harici Player Button */}
          <button
            id="btn-player-engine-intent"
            onClick={() => onUpdateSettings({ ...settings, playerEngine: 'intent' })}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              settings.playerEngine === 'intent'
                ? 'bg-[#7C4DFF] text-white shadow-[0_0_15px_rgba(124,77,255,0.4)]'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {settings.playerEngine === 'intent' && <Check className="w-4 h-4" />}
            <span>Harici Player</span>
          </button>
        </div>
      </div>

      {/* Settings Row List (Matching Screenshot 10 Icons & Layout) */}
      <div className="space-y-2.5">
        {/* Uygulama dili */}
        <div
          onClick={() => setShowLanguageModal(true)}
          className="bg-[#2A2750] hover:bg-[#34315E] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Uygulama dili</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1">
              🇹🇷 Turkish
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* Uygulama başlangıcı */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Uygulama başlangıcı</span>
          </div>
          <span className="text-xs text-zinc-400 font-semibold px-2 py-1 bg-white/5 rounded-lg">
            Etkin (Ana Sayfa)
          </span>
        </div>

        {/* Otomatik Yenileme Switch */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Otomatik Yenileme</span>
              <span className="text-[11px] text-zinc-400">Listeleri periyodik güncelle</span>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('autoRefresh')}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.autoRefresh ? 'bg-[#FF5B3D]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                settings.autoRefresh ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Canlı yayın formatı */}
        <div
          onClick={() => setShowFormatModal(true)}
          className="bg-[#2A2750] hover:bg-[#34315E] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Tv className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Canlı yayın formatı</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#FF5B3D] font-mono font-bold bg-[#FF5B3D]/10 px-2 py-0.5 rounded border border-[#FF5B3D]/20">
              {settings.liveStreamFormat}
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* Change Player (VOD) */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Change Player (VOD)</span>
          </div>
          <span className="text-xs text-zinc-400 font-semibold px-2 py-1 bg-white/5 rounded-lg font-mono">
            VLV / EXO
          </span>
        </div>

        {/* Canlı oynatıcıyı değiştir */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <PlaySquare className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Canlı oynatıcıyı değiştir</span>
          </div>
          <span className="text-xs text-zinc-400 font-semibold px-2 py-1 bg-white/5 rounded-lg font-mono">
            VLV / INTENT
          </span>
        </div>

        {/* Sonraki öğeyi otomatik oynat Switch */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <FastForward className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Sonraki öğeyi otomatik oynat</span>
          </div>
          <button
            onClick={() => toggleSetting('autoPlayNext')}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.autoPlayNext ? 'bg-[#FF5B3D]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                settings.autoPlayNext ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* EPG Switch */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">EPG Program Rehberi</span>
              <span className="text-[11px] text-zinc-400">Canlı yayın akış çizelgesi</span>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('epgEnabled')}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.epgEnabled ? 'bg-[#FF5B3D]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                settings.epgEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Donanım Hızlandırma */}
        <div className="bg-[#2A2750] rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Donanım Hızlandırma (HW)</span>
              <span className="text-[11px] text-zinc-400">GPU decoder & akıcı 60 FPS render</span>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('hardwareAcceleration')}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.hardwareAcceleration ? 'bg-[#FF5B3D]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                settings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Fiziksel Cihaza Kurulum (Android / PWA) */}
        {onOpenDeviceInstall && (
          <div
            id="row-settings-device-install"
            onClick={onOpenDeviceInstall}
            className="bg-[#2A2750] hover:bg-[#152326] rounded-2xl p-3.5 border border-white/[0.06] hover:border-emerald-500/40 flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block flex items-center gap-2">
                  Fiziksel Cihaza Kurulum
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    Android
                  </span>
                </span>
                <span className="text-[11px] text-zinc-400">Telefon, tablet veya TV cihazına doğrudan yükle</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        )}

        {/* İzleme İstatistikleri & Analiz */}
        {onOpenAnalytics && (
          <div
            onClick={onOpenAnalytics}
            className="bg-[#2A2750] hover:bg-[#1E212A] rounded-2xl p-3.5 border border-white/[0.06] hover:border-[#FF5B3D]/40 flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF5B3D]/15 border border-[#FF5B3D]/30 flex items-center justify-center text-[#FF5B3D]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">İzleme İstatistikleri & Analiz</span>
                <span className="text-[11px] text-zinc-400">Veri trafiği, süreler ve kategori dağılımı</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        )}

        {/* Verileri temizle */}
        <div
          onClick={handleClearDataClick}
          className="bg-[#2A2750] hover:bg-[#2A1719] rounded-2xl p-3.5 border border-white/[0.06] hover:border-red-500/30 flex items-center justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Verileri temizle</span>
              <span className="text-[11px] text-zinc-400">Önbellek ve kayıtlı listeleri sıfırla</span>
            </div>
          </div>
          <span className="text-xs text-red-400 font-bold">
            {clearedToast ? 'Temizlendi!' : 'Temizle'}
          </span>
        </div>
      </div>

      {/* Format Modal */}
      {showFormatModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowFormatModal(false)}
        >
          <div
            className="w-full max-w-xs bg-[#2A2750] border border-white/10 rounded-2xl p-4 space-y-2 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Yayın Formatı Seç
            </span>
            {(['.ts', '.m3u8', '.mpd'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => {
                  onUpdateSettings({ ...settings, liveStreamFormat: fmt });
                  setShowFormatModal(false);
                }}
                className={`w-full p-3 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-all ${
                  settings.liveStreamFormat === fmt
                    ? 'bg-[#FF5B3D]/20 border border-[#FF5B3D] text-[#FF5B3D]'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <span>{fmt} (MPEG-TS / HLS)</span>
                {settings.liveStreamFormat === fmt && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Language Modal */}
      {showLanguageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowLanguageModal(false)}
        >
          <div
            className="w-full max-w-xs bg-[#2A2750] border border-white/10 rounded-2xl p-4 space-y-2 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Uygulama Dili Seç
            </span>
            {[
              { code: 'tr', label: '🇹🇷 Türkçe' },
              { code: 'en', label: '🇬🇧 English' },
              { code: 'de', label: '🇩🇪 Deutsch' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onUpdateSettings({ ...settings, language: lang.code as any });
                  setShowLanguageModal(false);
                }}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  settings.language === lang.code
                    ? 'bg-[#FF5B3D]/20 border border-[#FF5B3D] text-[#FF5B3D]'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <span>{lang.label}</span>
                {settings.language === lang.code && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
