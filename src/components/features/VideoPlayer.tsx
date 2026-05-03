
import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, SkipBack, SkipForward, Settings, Minimize, ChevronDown } from 'lucide-react';
import type { StreamQuality } from '@/types';

interface VideoPlayerProps {
  /** All available stream qualities */
  streams?: StreamQuality[];
  /** Single direct URL fallback */
  src?: string;
  title: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
  subtitleUrl?: string;
}

export default function VideoPlayer({
  streams = [],
  src,
  title,
  poster,
  onTimeUpdate,
  startTime = 0,
  subtitleUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Quality selection — default to 720p (index 1)
  const [qualityIdx, setQualityIdx] = useState(() => {
    const idx = streams.findIndex(s => (s.resolutions || s.quality || '') === '720');
    return idx >= 0 ? idx : 0;
  });
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine active source
  const activeStream = streams[qualityIdx] ?? null;
  const activeSrc = activeStream?.proxyUrl || src || '';

  // Reset quality index when new streams arrive (e.g. episode change)
  useEffect(() => {
    if (streams.length > 0) {
      const idx720 = streams.findIndex(s => (s.resolutions || s.quality || '').toString() === '720');
      setQualityIdx(idx720 >= 0 ? idx720 : 0);
    }
  }, [streams]);

  const qualityLabel = (s: StreamQuality) => {
    const r = String(s.resolutions || s.quality || '');
    if (!r) return 'Auto';
    const numericR = parseInt(r);
    if (numericR >= 1080) return '1080p HD';
    if (numericR >= 720) return '720p HD';
    if (numericR >= 480) return '480p';
    if (numericR >= 360) return '360p';
    return r;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Load source — always fresh, no cache, no crossOrigin
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    const isFirstLoad = video.currentTime === 0;
    setBuffering(true);
    setError(false);
    setPlaying(false);

    // IMPORTANT: Remove any crossOrigin attribute before setting src
    // crossOrigin blocks CDN streams that don't send CORS headers
    video.removeAttribute('crossorigin');

    // Set src and call load() — correct order
    video.src = activeSrc;
    video.load();

    if (startTime > 0 && isFirstLoad) {
      const onMeta = () => {
        video.currentTime = startTime;
        video.removeEventListener('loadedmetadata', onMeta);
      };
      video.addEventListener('loadedmetadata', onMeta);
    }

    // HLS support for .m3u8 streams
    if (activeSrc.includes('.m3u8') && !video.canPlayType('application/vnd.apple.mpegurl')) {
      const loadHls = () => {
        const HlsLib = (window as unknown as { Hls?: { isSupported: () => boolean; new(): unknown } }).Hls;
        if (HlsLib?.isSupported()) {
          const hls = new (HlsLib as unknown as {
            new(): { loadSource: (s: string) => void; attachMedia: (v: HTMLVideoElement) => void };
          })();
          hls.loadSource(video.src);
          hls.attachMedia(video);
        }
      };
      if ((window as unknown as { Hls?: unknown }).Hls) loadHls();
      else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
        script.onload = loadHls;
        document.head.appendChild(script);
      }
    }
  }, [activeSrc, startTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers: Record<string, (e?: Event) => void> = {
      loadedmetadata: () => { setDuration(video.duration); setBuffering(false); },
      timeupdate: () => {
        setCurrentTime(video.currentTime);
        if (onTimeUpdate) onTimeUpdate(video.currentTime, video.duration);
      },
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      waiting: () => setBuffering(true),
      playing: () => setBuffering(false),
      canplay: () => setBuffering(false),
      error: () => { setError(true); setBuffering(false); console.error('Video error:', video.error); },
    };

    Object.entries(handlers).forEach(([ev, fn]) => video.addEventListener(ev, fn as EventListener));
    return () => Object.entries(handlers).forEach(([ev, fn]) => video.removeEventListener(ev, fn as EventListener));
  }, [onTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    playing ? video.pause() : video.play().catch(e => console.error('play error:', e));
    resetControlsTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = val;
    setCurrentTime(val);
    resetControlsTimer();
  };

  const skip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
    resetControlsTimer();
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // ─── No source state ──────────────────────────────────────────────────────
  if (!activeSrc) {
    return (
      <div className="w-full aspect-video bg-[#111] rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-800">
        <div className="w-10 h-10 border-3 border-[#e50914] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Preparing stream…</p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full aspect-video bg-gradient-to-br from-gray-900 to-[#111] flex flex-col items-center justify-center rounded-2xl gap-4 border border-gray-800">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="3" stroke="#374151" strokeWidth="1.5" />
          <path d="M10 9l4 3-4 3V9z" fill="#374151" />
          <path d="M8 21h8M12 18v3" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="text-center">
          <p className="text-white font-semibold text-base">Stream unavailable</p>
          <p className="text-gray-600 text-sm mt-1">The video link may have expired</p>
        </div>
        <button
          onClick={() => { setError(false); setBuffering(true); const v = videoRef.current; if (v) { v.src = activeSrc; v.load(); v.play().catch(() => null); } }}
          className="bg-[#e50914] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onClick={e => { if ((e.target as HTMLElement).closest('button, a, input')) return; togglePlay(); }}
    >
      {/* NOTE: No crossOrigin attribute — CDN streams block it */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        playsInline
        preload="metadata"
      >
        {subtitleUrl && (
          <track src={subtitleUrl} kind="subtitles" srcLang="en" label="English" default />
        )}
      </video>

      {/* Subtitle language indicator */}
      {subtitleUrl && (
        <div className="absolute top-12 right-4 z-10 pointer-events-none">
          <span className="text-[10px] font-bold text-white/70 bg-black/60 px-2 py-1 rounded-lg">
            CC ON
          </span>
        </div>
      )}

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="w-14 h-14 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Big play button */}
      {!playing && !buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[72px] h-[72px] rounded-full bg-[#e50914]/85 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <Play size={30} fill="white" className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Top bar: title */}
      <div className={`absolute top-0 left-0 right-0 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
        <p className="text-white font-semibold text-sm truncate drop-shadow">{title}</p>
      </div>

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress */}
        <div className="relative mb-3 group">
          <input
            type="range" min={0} max={duration || 100} value={currentTime} step={0.5}
            onChange={handleSeek}
            className="w-full h-1 group-hover:h-1.5 appearance-none rounded-full cursor-pointer transition-all"
            style={{ background: `linear-gradient(to right, #e50914 ${progressPercent}%, #555 ${progressPercent}%)` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            <button onClick={togglePlay} className="text-white hover:text-[#e50914] transition-colors w-9 h-9 flex items-center justify-center">
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={() => skip(-10)} className="text-gray-400 hover:text-white transition-colors hidden sm:flex w-8 h-8 items-center justify-center">
              <SkipBack size={16} />
            </button>
            <button onClick={() => skip(10)} className="text-gray-400 hover:text-white transition-colors hidden sm:flex w-8 h-8 items-center justify-center">
              <SkipForward size={16} />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center">
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 hidden sm:block appearance-none rounded-full cursor-pointer bg-gray-600"
              />
            </div>

            <span className="text-gray-400 text-xs hidden sm:block font-mono ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Quality selector */}
            {streams.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(q => !q)}
                  className="flex items-center gap-1 text-gray-300 hover:text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Settings size={13} /> {qualityLabel(streams[qualityIdx])} <ChevronDown size={11} />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#161616] border border-gray-700/60 rounded-xl overflow-hidden shadow-2xl z-20 min-w-[110px]">
                    {streams.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setQualityIdx(i); setShowQualityMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${i === qualityIdx ? 'text-[#e50914] font-black bg-[#e50914]/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                      >
                        {qualityLabel(s)}
                        {i === qualityIdx && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Download */}
            {activeSrc && (
              <a
                href={activeStream?.proxyUrl || activeSrc}
                download
                onClick={e => e.stopPropagation()}
                className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center"
                title="Download"
              >
                <Download size={15} />
              </a>
            )}

            <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center">
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
