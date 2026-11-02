import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
// @ts-ignore
import mpegts from 'mpegts.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Languages,
  ListVideo,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, Episode, Movie, Series, Channel } from '../types';
import { detectStreamKind, isDemoSampleUrl, proxiedStreamUrl } from '../lib/proxy';
import { buildAndroidIntentUrl } from '../lib/externalPlayer';

interface VideoPlayerModalProps {
  media: Movie | Series | Channel | null;
  activeEpisode?: Episode | null;
  activeSeasonNum?: number;
  settings: AppSettings;
  onClose: () => void;
  onSelectEpisode?: (seasonNum: number, episode: Episode) => void;
  onMediaWatched?: (id: string, type: 'movie' | 'series' | 'live') => void;
}

const DEFAULT_FALLBACK_STREAM =
  'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4';

export function VideoPlayerModal({
  media,
  activeEpisode,
  activeSeasonNum = 1,
  settings,
  onClose,
  onSelectEpisode,
  onMediaWatched,
}: VideoPlayerModalProps) {
  if (!media) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [audioTracks, setAudioTracks] = useState<{ id: number; label: string }[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; label: string }[]>([]);
  const [activeAudioTrackId, setActiveAudioTrackId] = useState(-1);
  const [activeSubtitleTrackId, setActiveSubtitleTrackId] = useState(-1);
  const [aspectRatio, setAspectRatio] = useState<'fit' | 'fill' | '16:9'>('16:9');
  const [playbackRate, setPlaybackRate] = useState(1);
  const isLive = Boolean('category' in media && 'currentShow' in media);

  const [forceInternal, setForceInternal] = useState(false);
  const useExternalPlayer = settings.playerEngine === 'intent' && !forceInternal;
  const [externalLaunchState, setExternalLaunchState] = useState<'idle' | 'launched'>('idle');

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const isSeries = 'seasons' in media;
  const rawStreamUrl = isSeries
    ? activeEpisode?.streamUrl || media.seasons[0]?.episodes[0]?.streamUrl || DEFAULT_FALLBACK_STREAM
    : 'streamUrl' in media && media.streamUrl
    ? media.streamUrl
    : DEFAULT_FALLBACK_STREAM;

  const title = isSeries
    ? `${media.title} - S${activeSeasonNum}E${activeEpisode?.episodeNum || 1}: ${activeEpisode?.title || ''}`
    : 'title' in media
    ? media.title
    : (media as Channel).name;

  const subtitle = isSeries
    ? activeEpisode?.plot || media.synopsis
    : 'currentShow' in media
    ? (media as Channel).currentShow
    : (media as Movie).synopsis;

  useEffect(() => {
    setActiveStreamUrl(proxiedStreamUrl(rawStreamUrl || DEFAULT_FALLBACK_STREAM));
  }, [rawStreamUrl]);

  useEffect(() => {
    if (!useExternalPlayer || !rawStreamUrl) return;
    setExternalLaunchState('idle');
    const t = setTimeout(() => {
      try {
        window.location.href = buildAndroidIntentUrl(rawStreamUrl);
      } catch {
        // Malformed URL etc. - the manual "Tekrar Dene" / "Uygulama içinde oynat" buttons below still cover this.
      }
      setExternalLaunchState('launched');
    }, 300);
    return () => clearTimeout(t);
  }, [useExternalPlayer, rawStreamUrl]);

  useEffect(() => {
    if (useExternalPlayer) return;
    const video = videoRef.current;
    const url = activeStreamUrl || DEFAULT_FALLBACK_STREAM;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setAudioTracks([]);
    setSubtitleTracks([]);
    setActiveAudioTrackId(-1);
    setActiveSubtitleTrackId(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }

    const isDemoContent = isDemoSampleUrl(rawStreamUrl || '');
    const failPlayback = (message: string) => {
      if (isDemoContent) {
        setActiveStreamUrl(DEFAULT_FALLBACK_STREAM);
      } else {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(message);
      }
    };

    const streamKind = detectStreamKind(rawStreamUrl || '', media);

    if (streamKind === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Ses Parçası ${i + 1}` })));
          setActiveAudioTrackId(hls.audioTrack);
        });
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          setSubtitleTracks(hls.subtitleTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Altyazı ${i + 1}` })));
          setActiveSubtitleTrackId(hls.subtitleTrack);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('HLS fatal error encountered:', data.type);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                failPlayback('Yayın bağlantısı kesildi. Sunucu adresini ve hesabınızın durumunu kontrol edip tekrar deneyin.');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => setIsPlaying(false));
      } else {
        failPlayback('Tarayıcınız HLS (M3U8) yayınlarını desteklemiyor.');
      }
    } else if (streamKind === 'mpegts') {
      if (mpegts.isSupported()) {
        const player = mpegts.createPlayer(
          { type: 'mpegts', isLive, url },
          { enableWorker: true, liveBufferLatencyChasing: isLive }
        );
        mpegtsRef.current = player;
        player.attachMediaElement(video);

        player.on(mpegts.Events.ERROR, (errType: string, errDetail: string) => {
          console.warn('mpegts.js fatal error:', errType, errDetail);
          failPlayback(
            'Bu yayın (MPEG-TS) tarayıcıda oynatılamadı. Sunucu HLS (M3U8) da sunuyorsa Ayarlar > Canlı Yayın Formatı üzerinden değiştirmeyi deneyin.'
          );
        });

        video.addEventListener('loadeddata', () => setIsLoading(false), { once: true });

        player.load();
        const playPromise = player.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => setIsPlaying(false));
        }
      } else {
        failPlayback('Tarayıcınız bu yayın formatını (MPEG-TS) desteklemiyor.');
      }
    } else {
      video.src = url;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsLoading(false);
        });
    }

    if (onMediaWatched) {
      if (isSeries) onMediaWatched(media.id, 'series');
      else if ('currentShow' in media) onMediaWatched(media.id, 'live');
      else onMediaWatched(media.id, 'movie');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [activeStreamUrl, media]);

  const handleVideoError = () => {
    console.warn('HTML5 Video source error handled.');
    if (isDemoSampleUrl(rawStreamUrl || '') && activeStreamUrl !== DEFAULT_FALLBACK_STREAM) {
      setActiveStreamUrl(DEFAULT_FALLBACK_STREAM);
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Akış oynatılamadı. Sunucu adresini, hesap durumunu ve internet bağlantınızı kontrol edip tekrar deneyin.');
    }
  };

  const handleRetryPlayback = () => {
    setHasError(false);
    setIsLoading(true);
    setActiveStreamUrl(proxiedStreamUrl(rawStreamUrl || DEFAULT_FALLBACK_STREAM));
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    resetControlsTimer();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      if (isLoading && video.currentTime > 0) {
        setIsLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatRemaining = (cur: number, dur: number) => {
    if (isNaN(dur) || dur <= 0) return '';
    const rem = Math.max(0, dur - cur);
    return `-${formatTime(rem)}`;
  };

  const getNextEpisode = (): { seasonNum: number; episode: Episode } | null => {
    if (!isSeries || !activeEpisode) return null;
    const seriesMedia = media as Series;
    const season = seriesMedia.seasons.find((s) => s.seasonNum === activeSeasonNum);
    if (!season) return null;
    const idx = season.episodes.findIndex((e) => e.episodeNum === activeEpisode.episodeNum);
    if (idx === -1) return null;
    if (idx + 1 < season.episodes.length) {
      return { seasonNum: activeSeasonNum, episode: season.episodes[idx + 1] };
    }
    const nextSeason = seriesMedia.seasons.find((s) => s.seasonNum === activeSeasonNum + 1);
    if (nextSeason && nextSeason.episodes.length > 0) {
      return { seasonNum: nextSeason.seasonNum, episode: nextSeason.episodes[0] };
    }
    return null;
  };

  const handlePlaybackEnded = () => {
    setIsPlaying(false);
    if (settings.autoPlayNext && onSelectEpisode) {
      const next = getNextEpisode();
      if (next) onSelectEpisode(next.seasonNum, next.episode);
    }
  };

  if (useExternalPlayer) {
    return (
      <div
        id="zendit-external-player-handoff"
        className="fixed inset-0 z-50 bg-[#1B1938] flex flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {externalLaunchState === 'idle' ? (
          <Loader2 className="w-8 h-8 text-[#FF5B3D] animate-spin" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#2A2750] flex items-center justify-center">
            <Play className="w-6 h-6 text-[#FF5B3D] fill-current ml-0.5" />
          </div>
        )}

        <div>
          <p className="text-white text-sm font-medium">Harici oynatıcı açılıyor</p>
          <p className="text-zinc-500 text-xs mt-1 max-w-xs">
            {externalLaunchState === 'idle'
              ? 'Cihazınızdaki bir video uygulaması aranıyor…'
              : 'Uygulama açılmadıysa cihazınızda uyumlu bir oynatıcı (VLC, MX Player vb.) kurulu olmayabilir.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <button
            onClick={() => {
              setExternalLaunchState('idle');
              try {
                window.location.href = buildAndroidIntentUrl(rawStreamUrl);
              } catch {
                // no-op - button stays available to retry
              }
              setExternalLaunchState('launched');
            }}
            className="w-full py-2.5 rounded-lg bg-[#2A2750] text-white text-sm"
          >
            Tekrar dene
          </button>
          <button onClick={() => setForceInternal(true)} className="w-full py-2.5 rounded-lg bg-[#FF5B3D] text-[#FFFFFF] text-sm font-medium">
            Uygulama içinde oynat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="zendit-video-player-modal"
      className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center select-none overflow-hidden"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      <video
        ref={videoRef}
        id="zendit-html5-video"
        className={`w-full h-full object-${aspectRatio === 'fit' ? 'contain' : aspectRatio === 'fill' ? 'cover' : 'contain'}`}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onEnded={handlePlaybackEnded}
        onError={handleVideoError}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      />

      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none z-10 animate-in fade-in">
          <Loader2 className="w-12 h-12 text-[#FF5B3D] animate-spin" />
          <span className="text-xs text-zinc-300 font-medium mt-3 tracking-wide">
            Akış Yükleniyor...
          </span>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1B1938]/95 backdrop-blur-md z-30 p-6 text-center space-y-4">
          <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-white">Yayın Akışı Başlatılamadı</h3>
            <p className="text-xs text-zinc-400">{errorMessage}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleRetryPlayback}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5B3D] text-black text-xs font-bold hover:bg-[#E84A2E] transition-all shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tekrar Dene</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-20 ${
          showControls && !isLoading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-8 md:gap-14 pointer-events-auto">
          <button
            id="btn-skip-back-10"
            onClick={(e) => {
              e.stopPropagation();
              seekRelative(-10);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/10 hover:border-[#FF5B3D]/40 transition-all hover:scale-110 active:scale-95"
          >
            <RotateCcw className="w-7 h-7 text-[#FF5B3D]" />
            <span className="text-[10px] font-bold mt-0.5">10</span>
          </button>

          <button
            id="btn-main-play-pause"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#7C4DFF] to-[#FF5B3D] text-black shadow-[0_0_25px_rgba(255,91,61,0.5)] hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 md:w-10 md:h-10 fill-black text-black" />
            ) : (
              <Play className="w-8 h-8 md:w-10 md:h-10 fill-black text-black ml-1" />
            )}
          </button>

          <button
            id="btn-skip-forward-10"
            onClick={(e) => {
              e.stopPropagation();
              seekRelative(10);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/10 hover:border-[#FF5B3D]/40 transition-all hover:scale-110 active:scale-95"
          >
            <RotateCw className="w-7 h-7 text-[#FF5B3D]" />
            <span className="text-[10px] font-bold mt-0.5">10</span>
          </button>
        </div>
      </div>

      <div
        className={`absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-start justify-between gap-4 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            id="btn-player-close"
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/15 text-white backdrop-blur-md border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-bold text-base md:text-lg tracking-wide line-clamp-1">
              {title}
            </h2>
            <p className="text-zinc-400 text-xs line-clamp-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-player-audio-lang"
            onClick={(e) => {
              e.stopPropagation();
              setShowAudioDialog(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-white/15 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-all"
          >
            <Languages className="w-4 h-4 text-[#FF5B3D]" />
            <span className="hidden sm:inline">Dil & Ses</span>
          </button>

          <button
            id="btn-aspect-ratio"
            onClick={(e) => {
              e.stopPropagation();
              setAspectRatio((prev) => (prev === '16:9' ? 'fill' : prev === 'fill' ? 'fit' : '16:9'));
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-white/15 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-all"
          >
            {aspectRatio.toUpperCase()}
          </button>

          {isSeries && (
            <button
              id="btn-player-episodes"
              onClick={(e) => {
                e.stopPropagation();
                setShowEpisodesDrawer(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-white/15 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-all"
            >
              <ListVideo className="w-4 h-4 text-[#FF5B3D]" />
              <span className="hidden sm:inline">Bölümler</span>
            </button>
          )}

          <button
            id="btn-player-fullscreen"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="p-2 rounded-xl bg-black/50 hover:bg-white/15 text-white backdrop-blur-md border border-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {!isLive && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1.5 px-1">
              <span className="text-[#FF5B3D] font-mono">{formatTime(currentTime)}</span>
              <span className="text-zinc-400 font-mono">{formatRemaining(currentTime, duration)}</span>
            </div>
            <input
              id="player-timeline-slider"
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF5B3D] hover:h-2 transition-all"
            />
          </div>
        )}

        {isLive && (
          <div className="flex items-center justify-between bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2.5 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">CANLI YAYIN</span>
              <span className="text-xs text-zinc-400">| {(media as Channel).resolution}</span>
              <span className="text-[10px] bg-[#FF5B3D]/20 text-[#FF5B3D] px-1.5 py-0.5 rounded font-mono font-semibold">
                {(media as Channel).format}
              </span>
            </div>
            <span className="text-xs text-zinc-300 font-mono">
              {(media as Channel).epgStart} - {(media as Channel).epgEnd}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#FF5B3D]" />}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF5B3D]"
              />
            </div>

            {!isLive && (
              <button
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 2, 0.75];
                  const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                  const newRate = rates[nextIdx];
                  setPlaybackRate(newRate);
                  if (videoRef.current) videoRef.current.playbackRate = newRate;
                }}
                className="px-2.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 hover:text-white"
              >
                {playbackRate}x
              </button>
            )}
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="hidden md:inline">Zendit ExoEngine v3.8</span>
            <span className="px-2 py-0.5 bg-[#7C4DFF]/20 text-[#7C4DFF] border border-[#7C4DFF]/30 rounded text-[10px] font-semibold">
              Ultra Low-Latency
            </span>
          </div>
        </div>
      </div>

      {showAudioDialog && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAudioDialog(false)}
        >
          <div
            className="w-full max-w-sm bg-[#2A2750] border border-white/15 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Languages className="w-4 h-4 text-[#FF5B3D]" />
                <span>Ses & Altyazı Ayarları</span>
              </div>
              <button
                onClick={() => setShowAudioDialog(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Ses Parçası (Audio Track)
              </label>
              {audioTracks.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Bu içerik için birden fazla ses parçası bulunmuyor.</p>
              ) : (
                <div className="space-y-1.5">
                  {audioTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.audioTrack = track.id;
                        setActiveAudioTrackId(track.id);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                        activeAudioTrackId === track.id
                          ? 'bg-[#FF5B3D]/20 border border-[#FF5B3D] text-[#FF5B3D]'
                          : 'bg-white/[0.04] border border-white/5 text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{track.label}</span>
                      {activeAudioTrackId === track.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Altyazı (Subtitles)
              </label>
              {subtitleTracks.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Bu içerik için altyazı bulunmuyor.</p>
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                      setActiveSubtitleTrackId(-1);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                      activeSubtitleTrackId === -1
                        ? 'bg-[#7C4DFF]/20 border border-[#7C4DFF] text-[#7C4DFF]'
                        : 'bg-white/[0.04] border border-white/5 text-zinc-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>Kapalı</span>
                    {activeSubtitleTrackId === -1 && <Check className="w-4 h-4" />}
                  </button>
                  {subtitleTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.subtitleTrack = track.id;
                        setActiveSubtitleTrackId(track.id);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                        activeSubtitleTrackId === track.id
                          ? 'bg-[#7C4DFF]/20 border border-[#7C4DFF] text-[#7C4DFF]'
                          : 'bg-white/[0.04] border border-white/5 text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{track.label}</span>
                      {activeSubtitleTrackId === track.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEpisodesDrawer && isSeries && (
        <div
          className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end"
          onClick={() => setShowEpisodesDrawer(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[#2A2750] border-l border-white/10 p-5 flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-[#FF5B3D]" />
                <span>Bölümler ({media.title})</span>
              </h3>
              <button onClick={() => setShowEpisodesDrawer(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {media.seasons.map((season) => (
                <div key={season.seasonNum} className="space-y-2">
                  <div className="text-xs font-bold text-[#FF5B3D] px-1 sticky top-0 bg-[#2A2750] py-1">
                    {season.title}
                  </div>
                  {season.episodes.map((ep) => {
                    const isCurrent =
                      activeSeasonNum === season.seasonNum &&
                      activeEpisode?.episodeNum === ep.episodeNum;
                    return (
                      <div
                        key={ep.episodeNum}
                        onClick={() => {
                          if (onSelectEpisode) onSelectEpisode(season.seasonNum, ep);
                          setShowEpisodesDrawer(false);
                        }}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          isCurrent
                            ? 'bg-[#FF5B3D]/15 border-[#FF5B3D] text-white shadow-lg'
                            : 'bg-white/[0.04] border-white/5 text-zinc-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={ep.thumbnail}
                            alt={ep.title}
                            className="w-20 h-12 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">
                              Bölüm {ep.episodeNum}: {ep.title}
                            </div>
                            <div className="text-[11px] text-zinc-400">{ep.duration}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
