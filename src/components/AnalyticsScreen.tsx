import React, { useState } from 'react';
import { WatchStats, XtreamAccount } from '../types';
import { TrendingUp, Film, Tv, Clapperboard, Flame, Trash2, HardDrive, ArrowLeft } from 'lucide-react';

interface AnalyticsScreenProps {
  stats: WatchStats;
  account: XtreamAccount | null;
  onResetHistory: () => void;
  onBack?: () => void;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#2A2750] rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] text-zinc-500 block">{label}</span>
        <span className="text-lg font-medium text-white">{value}</span>
      </div>
    </div>
  );
}

export function AnalyticsScreen({ stats, account, onResetHistory, onBack }: AnalyticsScreenProps) {
  const [resetConfirm, setResetConfirm] = useState(false);

  return (
    <div id="zendit-analytics-screen" className="max-w-2xl mx-auto px-4 py-4 pb-8 space-y-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-medium text-white">İstatistikler</h1>
        </div>

        {stats.dailyStreak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2A2750] text-amber-400 text-xs">
            <Flame className="w-3.5 h-3.5" fill="currentColor" />
            <span>{stats.dailyStreak} gün</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Toplam" value={stats.total} color="#9ca3af" />
        <StatCard icon={<Clapperboard className="w-4 h-4" />} label="Film" value={stats.movies} color="#FF5B3D" />
        <StatCard icon={<Film className="w-4 h-4" />} label="Dizi" value={stats.series} color="#7C4DFF" />
        <StatCard icon={<Tv className="w-4 h-4" />} label="Canlı TV" value={stats.liveTv} color="#f59e0b" />
      </div>

      <div className="bg-[#2A2750] rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-medium text-white">İçerik dağılımı</h2>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-5">
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#34315E" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#FF5B3D"
                strokeWidth="9"
                strokeDasharray={`${stats.moviesPercentage * 2.387} 238.7`}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#7C4DFF"
                strokeWidth="9"
                strokeDasharray={`${stats.seriesPercentage * 2.387} 238.7`}
                strokeDashoffset={`-${stats.moviesPercentage * 2.387}`}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="9"
                strokeDasharray={`${stats.livePercentage * 2.387} 238.7`}
                strokeDashoffset={`-${(stats.moviesPercentage + stats.seriesPercentage) * 2.387}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-medium text-white">{stats.total}</span>
              <span className="text-[10px] text-zinc-500">içerik</span>
            </div>
          </div>

          <div className="space-y-2.5 w-full max-w-xs">
            {[
              { label: 'Film', value: stats.movies, pct: stats.moviesPercentage, color: '#FF5B3D' },
              { label: 'Dizi', value: stats.series, pct: stats.seriesPercentage, color: '#7C4DFF' },
              { label: 'Canlı', value: stats.liveTv, pct: stats.livePercentage, color: '#f59e0b' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="text-white">{row.label}</span>
                </div>
                <span className="text-zinc-500">
                  {row.value} · %{row.pct}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#2A2750] rounded-2xl p-4 space-y-3.5">
        <h2 className="text-sm font-medium text-white">En çok izlenen kategoriler</h2>

        {stats.topCategories.length === 0 ? (
          <p className="text-xs text-zinc-500">Henüz izleme verisi yok — bir şeyler izledikçe burada listelenir.</p>
        ) : (
          stats.topCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white">{cat.name}</span>
                <span className="text-zinc-500">{cat.views} izleme</span>
              </div>
              <div className="w-full h-1.5 bg-[#34315E] rounded-full overflow-hidden">
                <div className="h-full bg-[#7C4DFF] rounded-full" style={{ width: `${cat.percentage}%` }} />
              </div>
            </div>
          ))
        )}

        <div className="pt-1">
          {resetConfirm ? (
            <div className="flex items-center gap-2 bg-[#34315E] p-3 rounded-xl">
              <span className="text-xs text-zinc-300 flex-1">Tüm izleme geçmişi silinsin mi?</span>
              <button
                onClick={() => {
                  onResetHistory();
                  setResetConfirm(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/90 text-white text-xs font-medium"
              >
                Sıfırla
              </button>
              <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 text-xs">
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              id="btn-reset-history"
              onClick={() => setResetConfirm(true)}
              className="w-full py-2.5 rounded-lg text-red-400 text-xs font-medium flex items-center justify-center gap-2 hover:bg-white/[0.03]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>İzleme geçmişini sıfırla</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#2A2750] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-white">Cihaz ve yerel depolama</h2>
        </div>

        <p className="text-xs text-zinc-500">
          Önbellek: {stats.cacheSizeMB < 0.01 ? '< 0.01' : stats.cacheSizeMB.toFixed(2)} MB
        </p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#34315E] p-2.5 rounded-lg">
            <span className="block text-sm font-medium text-white">{(account?.channelsCount || 0).toLocaleString('tr-TR')}</span>
            <span className="text-[10px] text-zinc-500">Kanal</span>
          </div>
          <div className="bg-[#34315E] p-2.5 rounded-lg">
            <span className="block text-sm font-medium text-white">{(account?.moviesCount || 0).toLocaleString('tr-TR')}</span>
            <span className="text-[10px] text-zinc-500">Film</span>
          </div>
          <div className="bg-[#34315E] p-2.5 rounded-lg">
            <span className="block text-sm font-medium text-white">{(account?.seriesCount || 0).toLocaleString('tr-TR')}</span>
            <span className="text-[10px] text-zinc-500">Dizi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
