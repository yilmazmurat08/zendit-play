import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Pause, Play, RotateCcw, RotateCw, X } from 'lucide-react';

/** In-app YouTube trailer player (IFrame API) with TV remote / media-key support. */
const SEEK_STEP = 10,
  LOAD_TIMEOUT_MS = 3e4,
  YT_ENDED = 0,
  YT_PLAYING = 1,
  YT_PAUSED = 2,
  YT_BUFFERING = 3;
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  var e;
  const a = window as any;
  return (e = a.YT) != null && e.Player
    ? Promise.resolve(a.YT)
    : ytApiPromise ||
        ((ytApiPromise = new Promise((t, n) => {
          const r = a.onYouTubeIframeAPIReady;
          a.onYouTubeIframeAPIReady = () => {
            (r?.(), t(a.YT));
          };
          const o = document.createElement('script');
          ((o.src = 'https://www.youtube.com/iframe_api'),
            (o.async = true),
            (o.onerror = () => {
              ((ytApiPromise = null), o.remove(), n(new Error('YouTube oynatıcısı yüklenemedi.')));
            }),
            document.head.appendChild(o));
        })),
        ytApiPromise);
}
function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
interface TrailerPlayerProps {
  youtubeId: string;
  title: string;
  onClose: () => void;
  /** Opens the trailer on YouTube; `message` explains why when in-app playback failed. */
  onOpenExternal: (message?: string) => void;
}

export function TrailerPlayer({ youtubeId, title, onClose, onOpenExternal }: TrailerPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null),
    playerRef = useRef<any>(null),
    readyRef = useRef(false),
    playBtnRef = useRef<HTMLButtonElement>(null),
    [state, setState] = useState<'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'>('loading'),
    [error, setError] = useState(''),
    [progress, setProgress] = useState({ current: 0, duration: 0, loaded: 0 }),
    externalRef = useRef(onOpenExternal);
  ((externalRef.current = onOpenExternal),
    useEffect(() => {
      const z = document.activeElement as HTMLElement | null;
      return (
        playBtnRef.current?.focus(),
        () => {
          z != null && z.isConnected && z.focus();
        }
      );
    }, []),
    useEffect(() => {
      let z = false;
      readyRef.current = false;
      const F = setTimeout(() => {
        !z && !readyRef.current && externalRef.current("Fragman uygulama içinde yüklenemedi, YouTube'da açılıyor.");
      }, LOAD_TIMEOUT_MS);
      return (
        loadYouTubeApi()
          .then((q) => {
            if (z || !hostRef.current) return;
            const U = document.createElement('div');
            (hostRef.current.appendChild(U),
              (playerRef.current = new q.Player(U, {
                videoId: youtubeId,
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  disablekb: 1,
                  fs: 0,
                  iv_load_policy: 3,
                  playsinline: 1,
                  rel: 0,
                  origin: window.location.origin,
                },
                events: {
                  onReady: (N) => {
                    ((readyRef.current = true), setState((ee) => (ee === 'loading' ? 'paused' : ee)));
                    const $ = N.target.getIframe?.();
                    ($ && (($.tabIndex = -1), ($.title = `${title} fragmanı`)), N.target.playVideo?.());
                  },
                  onStateChange: (N) => {
                    N.data === YT_PLAYING
                      ? setState('playing')
                      : N.data === YT_PAUSED
                        ? setState('paused')
                        : N.data === YT_BUFFERING
                          ? setState('buffering')
                          : N.data === YT_ENDED && setState('ended');
                  },
                  onError: (N) => {
                    readyRef.current = true;
                    const $ = Number(N.data);
                    if ($ === 101 || $ === 150 || $ === 153 || $ === 5) {
                      externalRef.current("Bu fragman uygulama içinde oynatılamıyor, YouTube'da açılıyor.");
                      return;
                    }
                    (setError($ === 2 ? 'Fragman adresi geçersiz.' : "Fragman bulunamadı veya YouTube'dan kaldırılmış."),
                      setState('error'));
                  },
                },
              })));
          })
          .catch(() => {
            z || externalRef.current("YouTube oynatıcısı yüklenemedi, YouTube'da açılıyor.");
          }),
        () => {
          ((z = true), clearTimeout(F));
          try {
            playerRef.current?.destroy?.();
          } catch {}
          playerRef.current = null;
        }
      );
    }, [youtubeId]),
    useEffect(() => {
      const z = setInterval(() => {
        const F = playerRef.current;
        F != null &&
          F.getCurrentTime &&
          setProgress({
            current: Number(F.getCurrentTime()) || 0,
            duration: Number(F.getDuration?.()) || 0,
            loaded: Number(F.getVideoLoadedFraction?.()) || 0,
          });
      }, 500);
      return () => clearInterval(z);
    }, []));
  const togglePlay = () => {
      const z = playerRef.current;
      z != null &&
        z.playVideo &&
        (state === 'playing' || state === 'buffering' ? z.pauseVideo() : (state === 'ended' && z.seekTo(0, true), z.playVideo()));
    },
    seekBy = (z) => {
      const F = playerRef.current;
      if (!(F != null && F.getCurrentTime)) return;
      const q = Number(F.getDuration?.()) || 0;
      let U = (Number(F.getCurrentTime()) || 0) + z;
      ((U = Math.max(0, q ? Math.min(q - 1, U) : U)), F.seekTo(U, true), setProgress(($) => ({ ...$, current: U })));
    },
    seekToFraction = (z) => {
      const F = playerRef.current,
        q = Number(F?.getDuration?.()) || 0;
      if (!(F != null && F.seekTo) || !q) return;
      const U = Math.max(0, Math.min(q - 1, z * q));
      (F.seekTo(U, true), setProgress(($) => ({ ...$, current: U })));
    },
    actionsRef = useRef({ togglePlay, seekBy });
  ((actionsRef.current = { togglePlay, seekBy }),
    useEffect(() => {
      const z = (F) => {
        const q = actionsRef.current;
        let U = true;
        (['MediaPlayPause', 'MediaPlay', 'MediaPause'].includes(F.key) || (F.key === ' ' && F.target?.tagName !== 'BUTTON')
          ? q.togglePlay()
          : F.key === 'MediaFastForward' || F.key === 'MediaTrackNext'
            ? q.seekBy(SEEK_STEP)
            : F.key === 'MediaRewind' || F.key === 'MediaTrackPrevious'
              ? q.seekBy(-SEEK_STEP)
              : (U = false),
          U && (F.preventDefault(), F.stopImmediatePropagation()));
      };
      return (window.addEventListener('keydown', z, true), () => window.removeEventListener('keydown', z, true));
    }, []));
  const isPlaying = state === 'playing' || state === 'buffering',
    percent = progress.duration ? Math.min(100, (progress.current / progress.duration) * 100) : 0,
    btnClass =
      'tv-focus-ring shrink-0 w-11 h-11 tv:w-12 tv:h-12 rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-white flex items-center justify-center disabled:opacity-40';
  return (
    <div data-nav-layer className="fixed inset-0 z-[75] bg-black flex flex-col" role="dialog" aria-label={`${title} fragmanı`}>
      <div className="relative flex-1 min-h-0">
        <div ref={hostRef} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0" />
        {(state === 'loading' || state === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-black">
            {state === 'loading' ? (
              <>
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-sm text-white/70">Fragman yükleniyor…</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-amber-300">{error}</p>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 bg-[#0E0C1F] border-t border-white/10 px-3 sm:px-5 py-2.5 flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => seekBy(-SEEK_STEP)}
          disabled={state === 'loading' || state === 'error'}
          aria-label="10 saniye geri"
          className={btnClass}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          ref={playBtnRef}
          type="button"
          onClick={togglePlay}
          disabled={state === 'error'}
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
          className={`${btnClass} !bg-brand hover:!bg-brand-dark w-12 h-12 tv:w-14 tv:h-14`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          onClick={() => seekBy(SEEK_STEP)}
          disabled={state === 'loading' || state === 'error'}
          aria-label="10 saniye ileri"
          className={btnClass}
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 px-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-bold text-white truncate">
              {title} <span className="font-semibold text-brand">· Fragman</span>
            </span>
            <span className="shrink-0 font-semibold text-white/70 tabular-nums">
              {formatTime(progress.current)}
              {' / '}
              {formatTime(progress.duration)}
            </span>
          </div>
          <div
            className="relative h-1.5 rounded-full bg-white/15 overflow-hidden cursor-pointer"
            onClick={(z) => {
              const F = z.currentTarget.getBoundingClientRect();
              seekToFraction((z.clientX - F.left) / F.width);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/25"
              style={{ width: `${Math.min(100, progress.loaded * 100)}%` }}
            />
            <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenExternal()}
          aria-label="YouTube'da aç"
          title="YouTube'da aç"
          className={`${btnClass} hidden sm:flex`}
        >
          <ExternalLink className="w-5 h-5" />
        </button>
        <button type="button" onClick={onClose} aria-label="Kapat" title="Kapat" className={btnClass}>
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
