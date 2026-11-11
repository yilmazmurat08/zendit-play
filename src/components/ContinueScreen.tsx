import { useState } from 'react';
import { Play, Trash2, Tv } from 'lucide-react';
import type { Channel, Movie, Series } from '../types';
import { CategoryPanel, PosterImage } from './TvUi';
import { useParental } from '../lib/parental';
import { currentProgramme, programmeProgress, useProgrammes } from '../lib/epg';
import {
  CONTINUE_LABELS,
  MAX_LIVE,
  movieRemainingLabel,
  progressPercent,
  seriesProgressLabel,
  type ContinueKind,
  type ContinueLists,
} from '../lib/continueWatching';

const KINDS: ContinueKind[] = ['live', 'series', 'movie'],
  EMPTY_TEXT: Record<ContinueKind, string> = {
    live: 'İzlediğiniz kanallar burada görünür.',
    series: 'Yarım kalan diziler burada görünür.',
    movie: 'Yarım kalan filmler burada görünür.',
  };
interface ContinueScreenProps {
  lists: ContinueLists;
  initialKind?: ContinueKind | null;
  onPlayChannel: (channel: Channel, list: Channel[]) => void;
  onResume: (item: Movie | Series) => void;
  onClear: (kind: ContinueKind) => void;
  compact?: boolean;
}

/** "İzlemeye Devam Et" screen: recent channels, series in progress and half-watched movies. */
export function ContinueScreen({ lists, initialKind, onPlayChannel, onResume, onClear, compact = false }: ContinueScreenProps) {
  const parental = useParental(),
    [kind, setKind] = useState<ContinueKind>(initialKind || KINDS.find((A) => lists[A].length > 0) || 'live'),
    [confirmClear, setConfirmClear] = useState(false),
    { items: programmes } = useProgrammes(kind === 'live' ? lists.live.map((A) => A.id) : [], 1),
    guard = (A: boolean, k: () => void) => {
      A ? parental.unlock().then((C) => C && k()) : k();
    },
    categoryItems = KINDS.map((A) => ({ name: CONTINUE_LABELS[A], count: lists[A].length })),
    selectCategory = (A) => {
      const k = KINDS.find((C) => CONTINUE_LABELS[C] === A);
      k && (setKind(k), setConfirmClear(false));
    },
    count = lists[kind].length;
  return (
    <div id="zendit-continue-screen" className="h-full flex flex-col">
      <div
        className={`flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3 tv:grid tv:gap-[1.5rem] ${compact ? 'tv:grid-cols-[20fr_80fr] tv:px-[2.5rem] tv:pb-[1rem]' : 'tv:grid-cols-[19fr_81fr] tv:px-[5rem] tv:pb-[1.5rem]'}`}
      >
        <CategoryPanel items={categoryItems} selected={CONTINUE_LABELS[kind]} onSelect={selectCategory} />
        <div className="glass flex-1 tv:flex-none min-h-0 rounded-2xl tv:rounded-[2.25rem] p-3 tv:p-[1.75rem] flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-3 mb-3 tv:mb-[1.25rem] min-h-[2.25rem]">
            <h2 className="text-base tv:text-[1.6rem] font-bold truncate">
              {CONTINUE_LABELS[kind]}
              <span className="ml-2 text-white/50 font-semibold text-[0.8em]">
                {kind === 'live' ? `son izlenen ${MAX_LIVE} kanal` : count}
              </span>
            </h2>
            {count > 0 &&
              (confirmClear ? (
                <div className="shrink-0 flex items-center gap-2 tv:gap-[0.6rem]">
                  <span className="hidden sm:inline text-xs tv:text-[1rem] font-semibold text-white/75">
                    Liste temizlensin mi?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      (onClear(kind), setConfirmClear(false));
                    }}
                    className="tv-focus-ring rounded-full bg-alert px-3 py-1.5 tv:px-[1rem] tv:py-[0.45rem] text-xs tv:text-[1rem] font-bold"
                  >
                    Evet, temizle
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="tv-focus-ring rounded-full bg-white/[0.1] px-3 py-1.5 tv:px-[1rem] tv:py-[0.45rem] text-xs tv:text-[1rem] font-bold"
                  >
                    Vazgeç
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="tv-focus shrink-0 flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 tv:px-[1rem] tv:py-[0.45rem] text-xs tv:text-[1rem] font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem]" />
                  {' Listeyi temizle'}
                </button>
              ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-1 -m-1">
            {count === 0 ? (
              <div className="h-full min-h-[10rem] flex flex-col items-center justify-center text-center gap-3 text-white/55 px-6">
                <Tv className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
                <p className="text-sm tv:text-[1.15rem]">{EMPTY_TEXT[kind]}</p>
              </div>
            ) : kind === 'live' ? (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 tv:gap-[0.9rem] ${compact ? 'tv:grid-cols-2' : 'tv:grid-cols-3'}`}
              >
                {lists.live.map((A) => {
                  const k = parental.hidden('live', A),
                    C = k ? null : currentProgramme(programmes[A.id]);
                  return (
                    <button
                      key={A.id}
                      type="button"
                      onClick={() => guard(k, () => onPlayChannel(A, lists.live))}
                      className="tv-focus flex items-center gap-3 tv:gap-[0.9rem] rounded-xl tv:rounded-[1rem] bg-white/[0.06] p-2.5 tv:p-[0.8rem] text-left"
                    >
                      <span className="w-12 h-12 tv:w-[3.6rem] tv:h-[3.6rem] shrink-0 rounded-lg tv:rounded-[0.7rem] overflow-hidden bg-white/10">
                        <PosterImage src={A.logo} locked={k} small />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm tv:text-[1.15rem] font-semibold truncate">{A.name}</span>
                        <span className="block text-[11px] tv:text-[0.9rem] text-white/60 truncate">
                          {k ? 'Kilitli kanal' : C?.title || A.category}
                        </span>
                        <span className="block mt-1.5 tv:mt-[0.4rem] h-[3px] tv:h-[0.22rem] rounded-full bg-white/15 overflow-hidden">
                          {C && <span className="block h-full bg-brand" style={{ width: `${programmeProgress(C)}%` }} />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className={`grid grid-cols-3 sm:grid-cols-4 gap-3 tv:gap-[1.1rem] ${compact ? 'tv:grid-cols-5' : 'tv:grid-cols-6'}`}
              >
                {(kind === 'series' ? lists.series : lists.movie).map((A) => {
                  const k = parental.hidden(kind, A),
                    C = k ? 'Kilitli içerik' : 'seasons' in A ? seriesProgressLabel(A) : movieRemainingLabel(A);
                  return (
                    <button
                      key={A.id}
                      type="button"
                      onClick={() => guard(k, () => onResume(A))}
                      title={A.title}
                      className="tv-focus-ring group rounded-xl tv:rounded-[1rem] text-left"
                    >
                      <span className="relative block aspect-[2/3] rounded-xl tv:rounded-[1rem] overflow-hidden bg-white/[0.07]">
                        <PosterImage src={A.poster} locked={k} />
                        {!k && (
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 bg-black/35 transition-opacity">
                            <Play className="w-8 h-8 tv:w-[2.6rem] tv:h-[2.6rem] text-white" fill="currentColor" />
                          </span>
                        )}
                        <span className="absolute left-0 right-0 bottom-0 h-1 tv:h-[0.3rem] bg-black/50">
                          <span className="block h-full bg-brand" style={{ width: `${progressPercent(A)}%` }} />
                        </span>
                      </span>
                      <span className="block mt-1.5 tv:mt-[0.45rem] text-xs tv:text-[1.02rem] font-semibold truncate">
                        {A.title}
                      </span>
                      <span className="block text-[10px] tv:text-[0.85rem] text-white/60 truncate">{C}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
