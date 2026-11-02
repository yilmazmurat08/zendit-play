import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CalendarClock, CalendarRange, Clock3, Trash2, Tv } from 'lucide-react';
import { Channel, Movie, Series, WatchLogEntry, XtreamAccount } from '../types';
import { computeWatchStats, formatWatchTime } from '../lib/watchLog';
import { useEpgStatus } from '../lib/epg';

interface AnalyticsScreenProps {
  log: WatchLogEntry[];
  account: XtreamAccount | null;
  channels: Channel[];
  movies: Movie[];
  series: Series[];
  onResetHistory: () => void;
  onBack?: () => void;
}

/** Statistics: viewing time per day / hour / kind, most watched channels and titles, library and account facts. */

const KIND_COLORS: Record<WatchLogEntry['kind'], string> = { live: '#1C9AD6', movie: '#D8740E', series: '#9D5CFF' },
  KIND_LABELS = { live: 'Canlı TV', movie: 'Film', series: 'Dizi' },
  KINDS: WatchLogEntry['kind'][] = ['live', 'movie', 'series'],
  PERIODS = [
    { days: 7, label: '7 gün' },
    { days: 30, label: '30 gün' },
    { days: null, label: 'Tümü' },
  ];
function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-3xl p-4 sm:p-5 ${className}`}>
      {title && (
        <header className="mb-3.5">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5 min-w-0">
      <div className="text-xs text-white/55">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white truncate">{value}</div>
      {note && <div className="text-[11px] text-white/45 mt-0.5 truncate">{note}</div>}
    </div>
  );
}
function KindLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {KINDS.map((a) => (
        <span key={a} className="inline-flex items-center gap-1.5 text-xs text-white/70">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: KIND_COLORS[a] }} />
          {KIND_LABELS[a]}
        </span>
      ))}
    </div>
  );
}
function niceStep(max) {
  return [5, 10, 15, 30, 60, 120, 180, 240, 360, 480].find((t) => max / t <= 4) || 600;
}
function axisLabel(minutes) {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes} dk`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', ',')} sa`;
}
function dayLabel(ms, long = false) {
  return new Date(ms).toLocaleDateString(
    'tr-TR',
    long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'numeric' },
  );
}
function DailyChart({ days }) {
  const [hovered, setHovered] = useState(null),
    totals = days.map((g) => g.live + g.movie + g.series),
    max = Math.max(...totals, 1),
    step = niceStep(max),
    top = Math.max(step, Math.ceil(max / step) * step),
    ticks = [];
  for (let g = 0; g <= top; g += step) ticks.push(g);
  const shown = hovered ?? totals.reduce((g, p, v) => (p > (totals[g] || 0) ? v : g), days.length - 1),
    shownDay = days[shown],
    labelEvery = days.length > 10 ? 5 : 1;
  return (
    <div>
      <p className="min-h-[2.5rem] text-xs text-white/70" aria-live="polite">
        <span className="font-semibold text-white">{dayLabel(shownDay.day, true)}</span> ·{' '}
        {formatWatchTime((totals[shown] || 0) * 6e4)}
        {hovered === null && totals[shown] > 0 && <span className="text-white/45"> (en yoğun gün)</span>}
        <br />
        {KINDS.filter((g) => shownDay[g] > 0)
          .map((g) => `${KIND_LABELS[g]} ${formatWatchTime(shownDay[g] * 6e4)}`)
          .join(' · ') || 'İzleme yok'}
      </p>
      <div className="relative mt-2 h-40 pl-10">
        {ticks.map((g) => (
          <div
            key={g}
            className="absolute left-10 right-0 border-t border-white/[0.08]"
            style={{ bottom: `${(g / top) * 100}%` }}
          >
            <span className="absolute -left-10 -translate-y-1/2 w-9 text-right text-[10px] text-white/45 tabular-nums">
              {axisLabel(g)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 left-10 flex items-end gap-[2px]">
          {days.map((g, p) => {
            const v = totals[p];
            return (
              <button
                key={g.day}
                type="button"
                aria-label={`${dayLabel(g.day, true)}: ${formatWatchTime(v * 6e4)}`}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p)}
                onBlur={() => setHovered(null)}
                onClick={() => setHovered(p)}
                className={`group relative flex-1 h-full flex flex-col justify-end items-center outline-none rounded-md ${hovered === p ? 'bg-white/[0.06]' : ''} focus-visible:bg-white/[0.1]`}
              >
                <span className="flex flex-col-reverse w-full max-w-[24px] gap-[2px]" style={{ height: `${(v / top) * 100}%` }}>
                  {KINDS.map((b, T) => {
                    if (g[b] <= 0) return null;
                    const A = KINDS.slice(T + 1).every((k) => g[k] <= 0);
                    return (
                      <span
                        key={b}
                        className={A ? 'rounded-t-[4px]' : ''}
                        style={{ flexGrow: g[b], flexBasis: 0, minHeight: 2, backgroundColor: KIND_COLORS[b] }}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-[2px] pl-10 mt-1.5">
        {days.map((g, p) => (
          <span key={g.day} className="flex-1 text-center text-[10px] text-white/45 tabular-nums">
            {p % labelEvery === 0 || p === days.length - 1 ? dayLabel(g.day) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
function HourChart({ hours }) {
  const [hovered, setHovered] = useState(null),
    max = Math.max(...hours, 1),
    peak = hours.indexOf(Math.max(...hours)),
    shown = hovered ?? peak;
  return (
    <div>
      <p className="text-xs text-white/70 min-h-[1.25rem]" aria-live="polite">
        <span className="font-semibold text-white tabular-nums">
          {String(shown).padStart(2, '0')}:00 - {String((shown + 1) % 24).padStart(2, '0')}:00
        </span>{' '}
        · {formatWatchTime(hours[shown] * 6e4)}
        {hovered === null && hours[peak] > 0 && <span className="text-white/45"> (en çok izlenen saat)</span>}
      </p>
      <div className="mt-3 h-24 flex items-end gap-[2px] border-b border-white/[0.08]">
        {hours.map((u, c) => (
          <button
            key={c}
            type="button"
            aria-label={`${c}:00 - ${formatWatchTime(u * 6e4)}`}
            onMouseEnter={() => setHovered(c)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(c)}
            onBlur={() => setHovered(null)}
            onClick={() => setHovered(c)}
            className="flex-1 h-full flex items-end justify-center outline-none rounded-t-md focus-visible:bg-white/[0.1]"
          >
            <span
              className="w-full max-w-[16px] rounded-t-[4px]"
              style={{
                height: `${Math.max(u > 0 ? 3 : 0, (u / max) * 100)}%`,
                backgroundColor: '#FF5B3D',
                opacity: hovered === null || hovered === c ? 1 : 0.45,
              }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-white/45 tabular-nums">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}
function RankList({ items, empty }) {
  if (items.length === 0) return <p className="text-xs text-white/50">{empty}</p>;
  const top = items[0].ms || 1;
  return (
    <ol className="space-y-3">
      {items.map((n, r) => (
        <li key={n.key}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-white">
              <span className="text-white/40 tabular-nums mr-1.5">{r + 1}.</span>
              {n.title}
            </span>
            <span className="shrink-0 text-white/60 tabular-nums">
              {formatWatchTime(n.ms)}
              {n.note && <span className="text-white/40"> · {n.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-r-[4px]"
              style={{ width: `${Math.max(3, (n.ms / top) * 100)}%`, backgroundColor: n.kind ? KIND_COLORS[n.kind] : '#FF5B3D' }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
function toRankItems(items) {
  return items.map((e) => ({ key: `${e.kind}:${e.id}`, title: e.title, ms: e.ms, kind: e.kind, note: `${e.count} kez` }));
}
export function AnalyticsScreen({ log, account, channels, movies, series, onResetHistory, onBack }: AnalyticsScreenProps) {
  const [period, setPeriod] = useState<number | null>(7),
    [confirmReset, setConfirmReset] = useState(false),
    epg = useEpgStatus(),
    stats = useMemo(() => computeWatchStats(log, period), [log, period]),
    hasData = stats.totalMs > 0,
    periodLabel = period ? `Son ${period} gün` : 'Tüm zamanlar',
    favorites =
      channels.filter((C) => C.isFavorite).length +
      movies.filter((C) => C.isFavorite).length +
      series.filter((C) => C.isFavorite).length,
    daysLeft =
      account != null && account.expiryDate ? Math.ceil((new Date(account.expiryDate).getTime() - Date.now()) / 864e5) : null,
    epgCoverage = epg.state === 'ready' && channels.length ? Math.round((epg.channels / channels.length) * 100) : null;
  return (
    <div id="zendit-analytics-screen" className="max-w-4xl mx-auto px-4 py-5 pb-10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Geri"
              className="tv-focus-ring w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-white flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black tracking-wide text-white">İstatistikler</h1>
            <p className="text-xs text-white/55">{periodLabel}</p>
          </div>
        </div>
        <div className="flex gap-1.5 p-1 rounded-full bg-white/[0.06]" role="radiogroup" aria-label="Dönem">
          {PERIODS.map((C) => (
            <button
              key={C.label}
              type="button"
              role="radio"
              aria-checked={period === C.days}
              onClick={() => setPeriod(C.days)}
              className={`tv-focus-ring rounded-full px-3.5 py-1.5 text-xs font-bold ${period === C.days ? 'bg-brand text-white' : 'text-white/70 hover:text-white'}`}
            >
              {C.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatTile label="Toplam izleme" value={formatWatchTime(stats.totalMs)} note={`${stats.sessions} oturum`} />
        <StatTile
          label="Günlük ortalama"
          value={formatWatchTime(stats.dailyAverageMs)}
          note={period ? `${stats.activeDays} / ${period} gün izlendi` : `${stats.activeDays} gün izlendi`}
        />
        <StatTile
          label="İzleme serisi"
          value={`${stats.streak} gün`}
          note={stats.streak > 0 ? 'Üst üste izlenen günler' : 'Bugün izleyerek başlayın'}
        />
        <StatTile label="En uzun oturum" value={formatWatchTime(stats.longestMs)} />
      </div>
      {!hasData && (
        <Card>
          <div className="flex items-start gap-3">
            <Clock3 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-white/75 leading-relaxed">
              {log.length === 0
                ? 'Henüz izleme kaydı yok. Dahili oynatıcıda 15 saniyeden uzun izlediğiniz kanal, film ve bölümler burada toplanır.'
                : 'Bu dönemde izleme kaydı yok. Daha uzun bir dönem seçebilirsiniz.'}
            </p>
          </div>
        </Card>
      )}
      {hasData && (
        <>
          <Card title="Günlük izleme süresi" subtitle={period ? periodLabel : 'Son 30 gün'}>
            <div className="mb-2">
              <KindLegend />
            </div>
            <DailyChart days={stats.days} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="İçerik dağılımı">
              <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
                {KINDS.filter((C) => stats.byKind[C] > 0).map((C) => (
                  <span key={C} style={{ flexGrow: stats.byKind[C], backgroundColor: KIND_COLORS[C] }} />
                ))}
              </div>
              <ul className="mt-4 space-y-2.5">
                {KINDS.map((C) => (
                  <li key={C} className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 text-white">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: KIND_COLORS[C] }} />
                      {KIND_LABELS[C]}
                    </span>
                    <span className="text-white/60 tabular-nums">
                      {formatWatchTime(stats.byKind[C])} · %{Math.round((stats.byKind[C] / stats.totalMs) * 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Hangi saatlerde izliyorsunuz?">
              <HourChart hours={stats.hours} />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="En çok izlenen kanallar">
              <RankList items={toRankItems(stats.topChannels)} empty="Bu dönemde canlı yayın izlenmedi." />
            </Card>
            <Card title="En çok izlenen film ve diziler">
              <RankList items={toRankItems(stats.topVod)} empty="Bu dönemde film veya dizi izlenmedi." />
            </Card>
            <Card title="Kategoriler">
              <RankList
                items={stats.topCategories.map((C) => ({ key: C.name, title: C.name, ms: C.ms }))}
                empty="Kategori bilgisi yok."
              />
            </Card>
          </div>
        </>
      )}
      <Card title="Kitaplık ve hesap">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: 'Kanal', value: channels.length },
            { label: 'Film', value: movies.length },
            { label: 'Dizi', value: series.length },
            { label: 'Favori', value: favorites },
          ].map((C) => (
            <div key={C.label} className="rounded-2xl bg-white/[0.05] px-3 py-2.5">
              <div className="text-lg font-semibold text-white">{C.value.toLocaleString('tr-TR')}</div>
              <div className="text-[11px] text-white/50">{C.label}</div>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-xs text-white/70">
          {daysLeft !== null && (
            <li className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-white/45" />
              {daysLeft >= 0 ? (
                <span>
                  Abonelik <span className="font-semibold text-white">{daysLeft} gün</span> sonra bitiyor (
                  {new Date(account.expiryDate).toLocaleDateString('tr-TR')})
                </span>
              ) : (
                <span className="text-amber-300">Aboneliğin süresi dolmuş görünüyor.</span>
              )}
            </li>
          )}
          {account != null && account.maxConnections ? (
            <li className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-white/45" />
              Aynı anda {account.maxConnections} cihazda izlenebilir
            </li>
          ) : null}
          <li className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-white/45" />
            {epgCoverage !== null
              ? `EPG: kanalların %${epgCoverage}'inde yayın akışı var (${epg.programmes.toLocaleString('tr-TR')} program)`
              : epg.state === 'loading'
                ? 'EPG indiriliyor…'
                : 'EPG henüz yüklenmedi'}
          </li>
          {account?.lastRefreshAt && (
            <li className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-white/45" />
              Listeler en son{' '}
              {new Date(account.lastRefreshAt).toLocaleString('tr-TR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              tarihinde güncellendi
            </li>
          )}
        </ul>
      </Card>
      <div className="flex justify-center">
        {confirmReset ? (
          <div className="flex flex-wrap items-center justify-center gap-2 glass rounded-2xl px-4 py-3">
            <span className="text-xs text-white/80">İstatistikler ve izleme geçmişi silinsin mi?</span>
            <button
              type="button"
              onClick={() => {
                (onResetHistory(), setConfirmReset(false));
              }}
              className="tv-focus-ring px-3.5 py-1.5 rounded-full bg-alert/90 text-white text-xs font-bold"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="tv-focus-ring px-3.5 py-1.5 rounded-full bg-white/[0.08] text-white text-xs font-bold"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            id="btn-reset-history"
            type="button"
            onClick={() => setConfirmReset(true)}
            className="tv-focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-alert hover:bg-white/[0.04]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            İstatistikleri sıfırla
          </button>
        )}
      </div>
    </div>
  );
}
