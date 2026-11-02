import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock3, History, Lock, Play, Tv } from 'lucide-react';
import type { AppSettings, Channel, XtreamAccount } from '../types';
import { PosterImage } from './TvUi';
import { useParental } from '../lib/parental';
import { formatClock, useEpgStatus, useGuideProgrammes, type EpgProgramme } from '../lib/epg';
import { MAX_ARCHIVE_DAYS, archiveDays, canCatchup } from '../lib/catchup';
import { CATEGORY_FAVORITES, useIsTv } from '../lib/tv';
import { useVirtualList } from '../lib/useVirtualList';

const ALL_CHANNELS = 'Tüm Kanallar',
  ARCHIVE_CHANNELS = 'Arşivli kanallar',
  DAY_MS = 864e5,
  WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
function startOfDay(ts: number) {
  const d = new Date(ts);
  return (d.setHours(0, 0, 0, 0), d.getTime());
}
function dayLabel(offset: number, ts: number) {
  if (offset === 0) return 'Bugün';
  if (offset === -1) return 'Dün';
  if (offset === 1) return 'Yarın';
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
}
interface GuideScreenProps {
  channels: Channel[];
  account: XtreamAccount | null;
  settings: AppSettings;
  initialCategory?: string;
  searchQuery?: string;
  isPlayerOpen: boolean;
  onPlayChannel: (channel: Channel, list: Channel[]) => void;
  onPlayCatchup: (channel: Channel, programme: EpgProgramme) => void;
  compact?: boolean;
}

type CellState = 'live' | 'archive' | 'past' | 'future';

/** TV guide grid: channels as rows, time as columns, with catch-up for archived programmes. */
export function GuideScreen({
  channels,
  account,
  settings,
  initialCategory,
  searchQuery = '',
  isPlayerOpen,
  onPlayChannel,
  onPlayCatchup,
  compact = false,
}: GuideScreenProps) {
  const isTv = useIsTv(),
    parental = useParental(),
    epgStatus = useEpgStatus(),
    [now, setNow] = useState(() => Date.now()),
    [dayOffset, setDayOffset] = useState(0),
    [category, setCategory] = useState(initialCategory === CATEGORY_FAVORITES ? CATEGORY_FAVORITES : ALL_CHANNELS),
    [focused, setFocused] = useState<{ channel: Channel; programme: EpgProgramme | null } | null>(null),
    [toast, setToast] = useState('');
  (useEffect(() => {
    const Me = window.setInterval(() => setNow(Date.now()), 3e4);
    return () => window.clearInterval(Me);
  }, []),
    useEffect(() => {
      if (!toast) return;
      const Me = window.setTimeout(() => setToast(''), 3500);
      return () => window.clearTimeout(Me);
    }, [toast]));
  const dims = isTv
      ? compact
        ? { channelW: 230, ppm: 7, rowH: 70, headerH: 34 }
        : { channelW: 320, ppm: 9, rowH: 84, headerH: 40 }
      : { channelW: 96, ppm: 3.2, rowH: 62, headerH: 30 },
    archiveSpan = useMemo(
      () =>
        Math.min(
          MAX_ARCHIVE_DAYS,
          channels.reduce((Me, Ze) => Math.max(Me, archiveDays(Ze)), 0),
        ),
      [channels],
    ),
    days = useMemo((): { offset: number; start: number }[] => {
      const Me = startOfDay(now),
        Ze = [];
      for (let ut = -archiveSpan; ut <= 1; ut++) Ze.push({ offset: ut, start: startOfDay(Me + ut * DAY_MS + DAY_MS / 2) });
      return Ze;
    }, [archiveSpan, startOfDay(now)]),
    dayStart = days.find((Me) => Me.offset === dayOffset)?.start ?? startOfDay(now),
    dayEnd = startOfDay(dayStart + DAY_MS + DAY_MS / 2),
    dayMinutes = (dayEnd - dayStart) / 6e4,
    gridWidth = dims.channelW + dayMinutes * dims.ppm,
    categories = useMemo(() => {
      const Me = Array.from(
          new Set(
            channels
              .map((ut) => {
                return ut.category?.trim();
              })
              .filter(Boolean),
          ),
        ).sort((ut, Dt) => ut.localeCompare(Dt, 'tr')),
        Ze = [ALL_CHANNELS, CATEGORY_FAVORITES];
      return (channels.some((ut) => archiveDays(ut) > 0) && Ze.push(ARCHIVE_CHANNELS), [...Ze, ...Me]);
    }, [channels]),
    filtered = useMemo(() => {
      let Me;
      category === ALL_CHANNELS
        ? (Me = channels)
        : category === CATEGORY_FAVORITES
          ? (Me = channels.filter((ut) => ut.isFavorite))
          : category === ARCHIVE_CHANNELS
            ? (Me = channels.filter((ut) => archiveDays(ut) > 0))
            : (Me = channels.filter((ut) => {
                return ut.category?.trim() === category;
              }));
      const Ze = searchQuery.trim().toLocaleLowerCase('tr-TR');
      return (Ze && (Me = Me.filter((ut) => ut.name.toLocaleLowerCase('tr-TR').includes(Ze))), Me);
    }, [channels, category, searchQuery]),
    { containerRef, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(filtered.length, dims.rowH, 4),
    [scrollX, setScrollX] = useState(0);
  useEffect(() => {
    const Me = containerRef.current;
    if (!Me) return;
    let Ze = 0;
    const ut = () => {
      Ze ||
        (Ze = requestAnimationFrame(() => {
          ((Ze = 0), setScrollX((Dt) => (Math.abs(Dt - Me.scrollLeft) > 8 ? Me.scrollLeft : Dt)));
        }));
    };
    return (
      Me.addEventListener('scroll', ut, { passive: true }),
      () => {
        (Me.removeEventListener('scroll', ut), Ze && cancelAnimationFrame(Ze));
      }
    );
  }, [containerRef, filtered.length > 0, settings.epgEnabled]);
  const visibleChannels = filtered.slice(startIndex, endIndex),
    programmes = useGuideProgrammes(visibleChannels, dayStart, dayEnd, account, settings),
    cellState = (Me, Ze) =>
      Ze.start <= now && now < Ze.stop
        ? 'live'
        : Ze.stop <= now
          ? canCatchup(Me, account, Ze.start, now)
            ? 'archive'
            : 'past'
          : 'future',
    autoFocusRef = useRef(true),
    anchorTime = dayOffset === 0 ? now - 30 * 6e4 : dayStart + (dayOffset < 0 ? 19 : 12) * 36e5;
  (useEffect(() => {
    const Me = containerRef.current;
    Me &&
      ((Me.scrollLeft = Math.max(0, ((anchorTime - dayStart) / 6e4) * dims.ppm)),
      (autoFocusRef.current = true),
      (cursorTimeRef.current = dayOffset === 0 ? now : anchorTime + 30 * 6e4));
  }, [dayStart, category, dims.ppm]),
    useEffect(() => {
      var Ni;
      if (!autoFocusRef.current || isPlayerOpen || filtered.length === 0) return;
      const Me = filtered[startIndex];
      if (!Me || !programmes[Me.id]) return;
      autoFocusRef.current = false;
      const Ze = document.activeElement;
      if (
        (Ze &&
          Ze !== document.body &&
          !((Ni = containerRef.current) != null && Ni.contains(Ze)) &&
          !Ze.closest('#zendit-guide-screen')) ||
        (Ze && Ze.closest('[data-guide-toolbar]'))
      )
        return;
      const ut = dayOffset === 0 ? now : anchorTime + 30 * 6e4,
        Dt = containerRef.current?.querySelectorAll<HTMLElement>(`[data-row="${startIndex}"][data-start]`),
        zt: HTMLElement[] = Dt ? Array.from(Dt) : [],
        wi = zt.find((Ji) => Number(Ji.dataset.start) <= ut && ut < Number(Ji.dataset.stop)) || zt[0],
        ai = containerRef.current?.querySelector<HTMLElement>(`[data-channel-cell="${startIndex}"]`);
      (wi || ai)?.focus({ preventScroll: true });
    }, [programmes, startIndex, isPlayerOpen]));
  const focusInfo = (Me, Ze) => setFocused({ channel: Me, programme: Ze }),
    activate = (Me, Ze) => {
      focusInfo(Me, Ze);
      const ut = () => {
        if (!Ze) {
          onPlayChannel(Me, filtered);
          return;
        }
        const Dt = cellState(Me, Ze);
        Dt === 'live'
          ? onPlayChannel(Me, filtered)
          : Dt === 'archive'
            ? onPlayCatchup(Me, Ze)
            : setToast(
                Dt === 'past'
                  ? archiveDays(Me) > 0
                    ? 'Bu program arşiv süresinin dışında kaldı.'
                    : 'Bu kanalda geriye dönük izleme yok.'
                  : `Bu program ${formatClock(Ze.start)}'da başlayacak.`,
              );
      };
      parental.hidden('live', Me) ? parental.unlock().then((Dt) => Dt && ut()) : ut();
    },
    xOf = (Me) => dims.channelW + ((Math.max(Me, dayStart) - dayStart) / 6e4) * dims.ppm,
    cursorTimeRef = useRef(0),
    onChannelColRef = useRef(false),
    timeOf = (Me) => dayStart + ((Me - dims.channelW) / dims.ppm) * 6e4,
    scrollRowIntoView = (Me) => {
      const Ze = containerRef.current;
      if (!Ze) return;
      const ut = dims.headerH + Me * dims.rowH;
      ut - dims.headerH < Ze.scrollTop
        ? (Ze.scrollTop = ut - dims.headerH)
        : ut + dims.rowH > Ze.scrollTop + Ze.clientHeight && (Ze.scrollTop = ut + dims.rowH - Ze.clientHeight);
    },
    scrollCellIntoView = (Me) => {
      const Ze = containerRef.current;
      if (!Ze) return;
      const ut = Me.offsetLeft,
        Dt = Ze.scrollLeft + dims.channelW,
        zt = Ze.scrollLeft + Ze.clientWidth;
      (ut < Dt || ut > zt - 60) && (Ze.scrollLeft = Math.max(0, ut - dims.channelW - 12));
    },
    rowCells = (Me: number): HTMLElement[] => {
      const Ze = containerRef.current?.querySelectorAll<HTMLElement>(`[data-row="${Me}"]`);
      return Ze ? Array.from(Ze) : [];
    },
    onGridKeyDown = (Me) => {
      const Ze = Me.target,
        ut = containerRef.current;
      if (!ut) return;
      const Dt = Ze.dataset.row !== void 0 ? Number(Ze.dataset.row) : null,
        zt = Ze.dataset.channelCell !== void 0 ? Number(Ze.dataset.channelCell) : null,
        wi = Dt ?? zt;
      if (wi === null) return;
      const ai = timeOf(ut.scrollLeft + dims.channelW + 4);
      (!cursorTimeRef.current || cursorTimeRef.current < dayStart || cursorTimeRef.current >= dayEnd) &&
        (cursorTimeRef.current = Math.max(ai, Math.min(now, dayEnd - 6e4)));
      const Ni = ($t) => {
        if ($t < 0 || $t >= filtered.length) return false;
        const ei = rowCells($t),
          Ge = cursorTimeRef.current,
          bt =
            ei.find((Zt) => Zt.dataset.start !== void 0 && Number(Zt.dataset.start) <= Ge && Ge < Number(Zt.dataset.stop)) ||
            ei.find((Zt) => Zt.dataset.start === void 0) ||
            containerRef.current?.querySelector<HTMLElement>(`[data-channel-cell="${$t}"]`);
        return bt ? (bt.focus({ preventScroll: true }), scrollRowIntoView($t), true) : false;
      };
      let Si = false;
      if (Me.key === 'ArrowDown' || Me.key === 'ArrowUp' || Me.key === 'PageDown' || Me.key === 'PageUp') {
        const $t = Me.key === 'PageDown' ? 8 : Me.key === 'PageUp' ? -8 : Me.key === 'ArrowDown' ? 1 : -1,
          ei = Math.max(0, Math.min(filtered.length - 1, wi + $t));
        if (ei === wi) return;
        if (zt !== null && onChannelColRef.current) {
          const Ge = containerRef.current?.querySelector<HTMLElement>(`[data-channel-cell="${ei}"]`);
          Ge && (Ge.focus({ preventScroll: true }), scrollRowIntoView(ei), (Si = true));
        } else Si = Ni(ei);
      } else if (Me.key === 'ArrowRight' || Me.key === 'ArrowLeft') {
        const $t = rowCells(wi).filter((Ge) => Ge.dataset.start !== void 0);
        let ei;
        if (zt !== null) {
          if (Me.key === 'ArrowRight') {
            const Ge = Math.max(cursorTimeRef.current, ai);
            ei = $t.find((bt) => Number(bt.dataset.stop) > Ge) || $t[0];
          }
        } else {
          const Ge = $t.indexOf(Ze);
          ((ei = Me.key === 'ArrowRight' ? $t[Ge + 1] : $t[Ge - 1]),
            !ei && Me.key === 'ArrowRight' && (Si = true),
            !ei &&
              Me.key === 'ArrowLeft' &&
              (containerRef.current?.querySelector<HTMLElement>(`[data-channel-cell="${wi}"]`)?.focus({ preventScroll: true }),
              (onChannelColRef.current = true),
              (Si = true)));
        }
        ei &&
          ((onChannelColRef.current = false),
          ei.focus({ preventScroll: true }),
          scrollCellIntoView(ei),
          (cursorTimeRef.current = Math.max(Number(ei.dataset.start), timeOf(ut.scrollLeft + dims.channelW + 4))),
          (Si = true));
      }
      Si && (Me.preventDefault(), Me.stopPropagation());
    },
    nowX = dayStart <= now && now < dayEnd ? xOf(now) : null,
    slots = Array.from({ length: Math.round(dayMinutes / 30) }, (Me, Ze) => dayStart + Ze * 30 * 6e4),
    info = focused,
    infoLocked = info ? parental.hidden('live', info.channel) : false,
    infoState = info != null && info.programme ? cellState(info.channel, info.programme) : null,
    STATE_BADGE = {
      live: { text: 'ŞİMDİ', cls: 'bg-alert text-white' },
      archive: { text: 'ARŞİVDE', cls: 'bg-[#3CC8FF] text-[#0B1B2A]' },
      past: { text: 'GEÇTİ', cls: 'bg-white/15 text-white/80' },
      future: { text: 'SONRA', cls: 'bg-white/15 text-white' },
    },
    STATE_HINT = {
      live: 'OK: canlı izle',
      archive: 'OK: baştan izle',
      past: archiveDays(info?.channel) > 0 ? 'Arşiv süresinin dışında' : 'Bu kanalda arşiv yok',
      future: 'Henüz başlamadı',
    };
  return (
    <div
      id="zendit-guide-screen"
      className={`h-full flex flex-col gap-3 tv:gap-[1.1rem] px-4 pb-3 ${compact ? 'tv:px-[2.5rem] tv:pb-[1rem]' : 'tv:px-[5rem] tv:pb-[1.5rem]'}`}
    >
      <div className="shrink-0 flex flex-col tv:flex-row gap-3 tv:gap-[1.25rem]">
        <div
          className={`glass min-w-0 tv:flex-1 rounded-2xl tv:rounded-[1.5rem] px-4 py-3 ${compact ? 'tv:px-[1.25rem] tv:py-[0.8rem]' : 'tv:px-[1.6rem] tv:py-[1.1rem]'} flex items-center gap-3 tv:gap-[1.1rem]`}
        >
          {info ? (
            <>
              <span
                className={`shrink-0 rounded-lg tv:rounded-[0.8rem] overflow-hidden bg-white/10 w-10 h-10 ${compact ? 'tv:w-[3.2rem] tv:h-[3.2rem]' : 'tv:w-[4.2rem] tv:h-[4.2rem]'}`}
              >
                <PosterImage src={info.channel.logo} locked={infoLocked} small />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 tv:gap-[0.6rem] min-w-0">
                  {infoState && (
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 tv:px-[0.5rem] tv:py-[0.15rem] text-[10px] tv:text-[0.85rem] font-black tracking-wider ${STATE_BADGE[infoState].cls}`}
                    >
                      {STATE_BADGE[infoState].text}
                    </span>
                  )}
                  <span className={`truncate text-sm font-bold ${compact ? 'tv:text-[1.3rem]' : 'tv:text-[1.6rem]'}`}>
                    {infoLocked ? 'Kilitli kanal' : info.programme?.title || 'Program bilgisi yok'}
                  </span>
                </div>
                <div className="mt-0.5 tv:mt-[0.2rem] flex items-center gap-2 tv:gap-[0.7rem] text-[11px] tv:text-[1rem] text-white/70 min-w-0">
                  <span className="truncate font-semibold">{info.channel.name}</span>
                  {info.programme && (
                    <span className="shrink-0 tabular-nums">
                      {dayLabel(Math.round((startOfDay(info.programme.start) - startOfDay(now)) / DAY_MS), info.programme.start)}
                      {' ·'} {formatClock(info.programme.start)}–{formatClock(info.programme.stop)}
                    </span>
                  )}
                  {infoState && !infoLocked && (
                    <span className="hidden sm:inline shrink-0 text-brand font-bold">{STATE_HINT[infoState]}</span>
                  )}
                </div>
                {!compact && info.programme?.desc && !infoLocked && (
                  <p className="hidden tv:block mt-[0.35rem] text-[0.95rem] leading-snug text-white/60 line-clamp-1">
                    {info.programme.desc}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs tv:text-[1.05rem] text-white/65 flex items-center gap-2 tv:gap-[0.6rem]">
              <CalendarDays className="w-4 h-4 tv:w-[1.4rem] tv:h-[1.4rem] shrink-0 text-brand" />
              {archiveSpan > 0
                ? 'Geçmiş programlar için gün seçin. Saat simgeli programlar baştan izlenebilir.'
                : 'Bir programa gelin; şu an yayında olanı OK ile açabilirsiniz.'}
            </p>
          )}
        </div>
        <div data-guide-toolbar className="shrink-0 flex flex-col gap-2 tv:gap-[0.6rem] min-w-0 tv:max-w-[52%]">
          <div className="flex gap-1.5 tv:gap-[0.5rem] overflow-x-auto no-scrollbar p-0.5">
            {days.map((Me) => (
              <button
                key={Me.offset}
                type="button"
                onClick={() => setDayOffset(Me.offset)}
                aria-pressed={Me.offset === dayOffset}
                className={`tv-focus-ring shrink-0 rounded-full px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.5rem] text-xs tv:text-[1.05rem] font-bold ${Me.offset === dayOffset ? 'bg-brand text-white' : 'bg-white/[0.08] text-white/85'}`}
              >
                {Me.offset < 0 && <History className="inline w-3 h-3 tv:w-[0.95rem] tv:h-[0.95rem] mr-1 -mt-0.5" />}
                {dayLabel(Me.offset, Me.start)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 tv:gap-[0.6rem] items-center">
            <select
              aria-label="Kategori"
              value={category}
              onChange={(Me) => setCategory(Me.target.value)}
              className="tv-focus min-w-0 flex-1 bg-lilac text-white text-xs tv:text-[1.05rem] font-semibold px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.5rem] rounded-full border-0 cursor-pointer"
            >
              {categories.map((Me) => (
                <option key={Me} value={Me} className="text-black">
                  {Me}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setDayOffset(0);
                const Me = containerRef.current;
                (Me && (Me.scrollLeft = Math.max(0, ((Date.now() - 30 * 6e4 - startOfDay(Date.now())) / 6e4) * dims.ppm)),
                  (autoFocusRef.current = true));
              }}
              className="tv-focus-ring shrink-0 flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 tv:px-[1.1rem] tv:py-[0.5rem] text-xs tv:text-[1.05rem] font-bold"
            >
              <Clock3 className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem]" />
              Şimdi
            </button>
          </div>
        </div>
      </div>
      <div className="glass relative flex-1 min-h-0 rounded-2xl tv:rounded-[1.75rem] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-white/55 px-6">
            <Tv className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
            <p className="text-sm tv:text-[1.15rem]">Bu kategoride kanal yok.</p>
          </div>
        ) : settings.epgEnabled ? (
          <div
            ref={containerRef}
            onKeyDown={onGridKeyDown}
            className="absolute inset-0 overflow-auto no-scrollbar overscroll-contain"
            style={{ scrollPaddingLeft: dims.channelW + 8, scrollPaddingTop: dims.headerH + 4 }}
          >
            <div className="relative" style={{ width: gridWidth, height: totalHeight + dims.headerH }}>
              <div
                className="sticky top-0 z-20 flex bg-[#17142f]/95 border-b border-white/10"
                style={{ height: dims.headerH, width: gridWidth }}
              >
                <div
                  className="sticky left-0 z-10 shrink-0 bg-[#17142f] border-r border-white/10"
                  style={{ width: dims.channelW }}
                />
                {slots.map((Me) => (
                  <div
                    key={Me}
                    className="shrink-0 border-l border-white/10 pl-1.5 tv:pl-[0.5rem] flex items-center text-[10px] tv:text-[0.95rem] font-bold text-white/70 tabular-nums"
                    style={{ width: 30 * dims.ppm }}
                  >
                    {formatClock(Me)}
                  </div>
                ))}
              </div>
              <div className="absolute left-0 right-0" style={{ top: dims.headerH + offsetY }}>
                {visibleChannels.map((Me, Ze) => {
                  const ut = startIndex + Ze,
                    Dt = parental.hidden('live', Me),
                    zt = programmes[Me.id],
                    wi = archiveDays(Me) > 0;
                  return (
                    <div
                      key={Me.id}
                      className="relative border-b border-white/[0.06]"
                      style={{ height: dims.rowH, width: gridWidth }}
                    >
                      <button
                        type="button"
                        data-channel-cell={ut}
                        onFocus={() => focusInfo(Me, null)}
                        onClick={() => activate(Me, null)}
                        title={Me.name}
                        className="tv-focus sticky left-0 z-10 h-full flex items-center gap-2 tv:gap-[0.7rem] px-2 tv:px-[0.8rem] bg-[#1d1a3a] border-r border-white/10 text-left"
                        style={{ width: dims.channelW }}
                      >
                        {isTv && (
                          <span className="w-[2.4rem] shrink-0 text-[1.05rem] font-bold tabular-nums text-white/75">
                            {Me.number}
                          </span>
                        )}
                        <span
                          className={`shrink-0 rounded-md tv:rounded-[0.55rem] overflow-hidden bg-white/10 ${isTv ? (compact ? 'w-[2.6rem] h-[2.6rem]' : 'w-[3.1rem] h-[3.1rem]') : 'w-8 h-8'}`}
                        >
                          <PosterImage src={Me.logo} locked={Dt} small />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-semibold ${isTv ? (compact ? 'text-[1rem]' : 'text-[1.15rem]') : 'text-[10px] leading-tight'}`}
                          >
                            {Me.name}
                          </span>
                          {wi && (
                            <span className="flex items-center gap-1 text-[9px] tv:text-[0.8rem] font-bold text-[#3CC8FF]">
                              <History className="w-2.5 h-2.5 tv:w-[0.85rem] tv:h-[0.85rem]" />
                              {archiveDays(Me)}
                              {' gün'}
                            </span>
                          )}
                        </span>
                      </button>
                      {Dt ? (
                        <button
                          type="button"
                          data-row={ut}
                          onFocus={() => focusInfo(Me, null)}
                          onClick={() => activate(Me, null)}
                          className="tv-focus absolute top-1 bottom-1 rounded-lg tv:rounded-[0.7rem] bg-white/[0.05] flex items-center gap-2 px-3 text-xs tv:text-[1rem] font-semibold text-white/60"
                          style={{ left: dims.channelW + 4, width: gridWidth - dims.channelW - 8 }}
                        >
                          <Lock className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem] text-brand" />
                          {' Kilitli kanal · açmak için şifre girin'}
                        </button>
                      ) : !zt || zt.length === 0 ? (
                        <button
                          type="button"
                          data-row={ut}
                          onFocus={() => focusInfo(Me, null)}
                          onClick={() => activate(Me, null)}
                          className="tv-focus absolute top-1 bottom-1 rounded-lg tv:rounded-[0.7rem] flex items-center text-[10px] tv:text-[0.95rem] text-white/40"
                          style={{ left: dims.channelW + 4, width: gridWidth - dims.channelW - 8, paddingLeft: scrollX + 12 }}
                        >
                          {zt ? 'Program bilgisi yok · OK: kanalı aç' : epgStatus.state === 'loading' ? 'Yükleniyor…' : ''}
                        </button>
                      ) : (
                        zt.map((ai) => {
                          const Ni = xOf(ai.start),
                            Si = Math.max(4, xOf(Math.min(ai.stop, dayEnd)) - Ni - 3),
                            Ai = cellState(Me, ai),
                            Oi = (info == null ? void 0 : info.channel.id) === Me.id && info.programme?.start === ai.start,
                            Ji = scrollX + dims.channelW,
                            $t = Ni < Ji && Ni + Si - 60 > Ji ? Ji - Ni : 0;
                          return (
                            <button
                              key={ai.start}
                              type="button"
                              data-row={ut}
                              data-start={ai.start}
                              data-stop={ai.stop}
                              onFocus={() => focusInfo(Me, ai)}
                              onClick={() => activate(Me, ai)}
                              title={`${formatClock(ai.start)} ${ai.title}`}
                              className={`guide-cell tv-focus absolute top-1 bottom-1 rounded-lg tv:rounded-[0.7rem] px-2 tv:px-[0.75rem] text-left overflow-hidden flex flex-col justify-center ${Ai === 'live' ? 'bg-brand/30 border border-brand/60' : Ai === 'archive' ? 'bg-[#3CC8FF]/[0.12] border border-[#3CC8FF]/25' : Ai === 'past' ? 'bg-white/[0.04] text-white/45' : 'bg-white/[0.08]'} ${Oi ? 'ring-2 ring-white/70' : ''}`}
                              style={{ left: Ni, width: Si, paddingLeft: $t ? $t + 8 : void 0 }}
                            >
                              {Si > 34 && (
                                <>
                                  <span
                                    className={`flex items-center gap-1 truncate font-semibold leading-tight ${isTv ? (compact ? 'text-[0.95rem]' : 'text-[1.1rem]') : 'text-[11px]'}`}
                                  >
                                    {Ai === 'archive' && (
                                      <History className="shrink-0 w-3 h-3 tv:w-[1rem] tv:h-[1rem] text-[#3CC8FF]" />
                                    )}
                                    {Ai === 'live' && (
                                      <Play className="shrink-0 w-3 h-3 tv:w-[0.95rem] tv:h-[0.95rem]" fill="currentColor" />
                                    )}
                                    <span className="truncate">{ai.title}</span>
                                  </span>
                                  <span
                                    className={`truncate tabular-nums ${isTv ? 'text-[0.85rem]' : 'text-[9px]'} ${Ai === 'past' ? 'text-white/35' : 'text-white/60'}`}
                                  >
                                    {formatClock(ai.start)}–{formatClock(ai.stop)}
                                  </span>
                                </>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
              {nowX !== null && (
                <div
                  className="absolute z-[15] w-[2px] bg-alert pointer-events-none"
                  style={{ left: nowX, top: 0, height: totalHeight + dims.headerH }}
                >
                  <span className="sticky top-0 block -ml-[3px] w-2 h-2 rounded-full bg-alert" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-sm tv:text-[1.15rem] text-white/70 px-6">
            {'EPG kapalı. Ayarlar > Canlı TV ve EPG bölümünden açabilirsiniz.'}
          </div>
        )}
        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 max-w-[90%] rounded-xl bg-surface border border-white/10 px-4 py-2 text-xs tv:text-[1.05rem] font-semibold text-amber-300 shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
