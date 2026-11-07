import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
// @ts-ignore
import mpegts from 'mpegts.js';
import { AlertCircle, Loader2, Maximize2, Tv } from 'lucide-react';
import { Channel } from '../types';
import { detectStreamKind, proxiedStreamUrl } from '../lib/proxy';
import { isNativeApp, NativePlayer, toNativeRect } from '../lib/nativePlayer';

interface LivePreviewProps {
  channel: Channel | null;
  /** false while the fullscreen player is open - most IPTV accounts allow only one stream at a time. */
  active: boolean;
  onOpenFullscreen: () => void;
}

export function LivePreview({ channel, active, onOpenFullscreen }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const boxRef = useRef<HTMLButtonElement | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const native = isNativeApp();

  // Android app: ExoPlayer draws the preview natively over this box (hls.js/mpegts.js are not used there).
  useEffect(() => {
    const box = boxRef.current;
    if (!native || !box) return;
    if (!channel || !active) {
      setState('idle');
      return;
    }

    setState('loading');
    const listeners = [
      NativePlayer.addListener('previewPlaying', () => setState('playing')),
      NativePlayer.addListener('previewError', () => setState('error')),
    ];
    const rectKey = (r: { x: number; y: number; width: number; height: number }) => `${r.x},${r.y},${r.width},${r.height}`;
    const first = toNativeRect(box);
    let lastKey = rectKey(first);
    NativePlayer.startPreview({ url: channel.streamUrl, ...first }).catch(() => setState('error'));

    // Keep the native view on top of the box when the layout changes (rotation, folding, hidden categories,
    // the search bar opening...). A short poll also catches moves that fire no resize event; only changes are sent.
    const sync = () => {
      const rect = toNativeRect(box);
      const key = rectKey(rect);
      if (key === lastKey) return;
      lastKey = key;
      NativePlayer.updatePreview(rect).catch(() => {});
    };
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resizeObserver?.observe(box);
    window.addEventListener('resize', update);
    const poll = window.setInterval(sync, 300);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(poll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', update);
      listeners.forEach((listener) => listener.then((handle) => handle.remove()));
      NativePlayer.stopPreview().catch(() => {});
    };
  }, [native, channel?.id, channel?.streamUrl, active]);

  // Browser / AI Studio preview: play the stream in the <video> element with hls.js / mpegts.js.
  useEffect(() => {
    const video = videoRef.current;
    if (native) return;
    if (!video || !channel || !active) {
      setState('idle');
      return;
    }

    const raw = channel.streamUrl;
    const url = proxiedStreamUrl(raw);
    const kind = detectStreamKind(raw, channel);
    let hls: Hls | null = null;
    let tsPlayer: any = null;

    setState('loading');
    video.muted = false;
    const onPlaying = () => setState('playing');
    const onError = () => setState('error');
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    const start = () => {
      video.play().catch(() => {
        // Autoplay with sound can be blocked - retry muted instead of showing nothing.
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    if (kind === 'hls' && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, start);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setState('error');
      });
    } else if (kind === 'mpegts' && mpegts.isSupported()) {
      tsPlayer = mpegts.createPlayer({ type: 'mpegts', isLive: true, url }, { enableWorker: true, liveBufferLatencyChasing: true });
      tsPlayer.attachMediaElement(video);
      tsPlayer.on(mpegts.Events.ERROR, () => setState('error'));
      tsPlayer.load();
      start();
    } else {
      video.src = url;
      start();
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      hls?.destroy();
      tsPlayer?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [native, channel?.id, channel?.streamUrl, active]);

  return (
    <button
      ref={boxRef}
      type="button"
      onClick={onOpenFullscreen}
      disabled={!channel}
      title="Tam ekran izle"
      className="tv-focus-ring group relative w-full aspect-video shrink-0 rounded-2xl tv:rounded-[1.25rem] overflow-hidden bg-black/50"
    >
      <video ref={videoRef} className="w-full h-full object-cover" playsInline />

      {!channel && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
          <Tv className="w-8 h-8 tv:w-[3.5rem] tv:h-[3.5rem]" />
          <span className="text-sm tv:text-[1.2rem] font-medium">Önizleme için bir kanal seçin</span>
        </span>
      )}
      {channel && state === 'loading' && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 tv:w-[3.5rem] tv:h-[3.5rem] text-white animate-spin" />
        </span>
      )}
      {channel && state === 'error' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-center px-6">
          <AlertCircle className="w-8 h-8 tv:w-[3rem] tv:h-[3rem] text-brand" />
          <span className="text-sm tv:text-[1.2rem] font-semibold">Önizleme açılamadı</span>
          <span className="text-xs tv:text-[1rem] text-white/70">Tam ekranda denemek için tekrar seçin.</span>
        </span>
      )}
      {channel && state === 'playing' && (
        <span className="absolute bottom-3 right-3 tv:bottom-[1rem] tv:right-[1rem] flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 tv:px-[1rem] tv:py-[0.4rem] text-xs tv:text-[1rem] font-semibold opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <Maximize2 className="w-3.5 h-3.5 tv:w-[1.1rem] tv:h-[1.1rem]" /> Tam ekran
        </span>
      )}
    </button>
  );
}
