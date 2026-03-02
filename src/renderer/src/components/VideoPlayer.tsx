import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { formatDuration } from '../utils/icons'

interface VideoPlayerProps {
  src: string
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onRequestFullscreen?: () => void
  maxHeight?: string
}

export default function VideoPlayer({
  src,
  onLoadedMetadata,
  onRequestFullscreen,
  maxHeight = '300px'
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const draggingRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const isPlayingRef = useRef(false)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setHasEnded(false)
    setShowControls(true)
    draggingRef.current = false
    wasPlayingRef.current = false
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = undefined
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      if (!draggingRef.current) setCurrentTime(video.currentTime)
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }
    const onMeta = () => setDuration(video.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setHasEnded(true)
      setShowControls(true)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  const resumePlayback = useCallback((video: HTMLVideoElement) => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = undefined
    }
    video.play()
    setIsPlaying(true)
  }, [])

  const scheduleResumeAfterSeek = useCallback((video: HTMLVideoElement) => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = undefined
      }
      video.play()
      setIsPlaying(true)
    }
    video.addEventListener('seeked', onSeeked)
    resumeTimeoutRef.current = setTimeout(() => {
      resumeTimeoutRef.current = undefined
      video.removeEventListener('seeked', onSeeked)
      if (video.paused) {
        video.play()
        setIsPlaying(true)
      }
    }, 250)
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        if (!isHovering) setShowControls(false)
      }, 2500)
    }
  }, [isPlaying, isHovering])

  useEffect(() => {
    if (isPlaying && !isHovering) {
      scheduleHide()
    } else {
      setShowControls(true)
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isPlaying, isHovering, scheduleHide])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (hasEnded) {
      video.currentTime = 0
      video.play()
      setIsPlaying(true)
      setHasEnded(false)
      return
    }
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [hasEnded])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const shouldResume = isPlayingRef.current
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
    if (shouldResume) scheduleResumeAfterSeek(video)
  }, [scheduleResumeAfterSeek])

  const handleSeekMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      const video = videoRef.current
      wasPlayingRef.current = isPlaying
      draggingRef.current = true
      if (video && !video.paused) {
        video.pause()
      }
      const seek = (ev: MouseEvent) => {
        if (!progressRef.current || !videoRef.current) return
        const rect = progressRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width))
        const pct = x / rect.width
        const newTime = pct * duration
        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
      seek(e.nativeEvent)
      const onMove = (ev: MouseEvent) => seek(ev)
      const onUp = () => {
        draggingRef.current = false
        const v = videoRef.current
        if (wasPlayingRef.current && v) {
          if (!v.seeking) resumePlayback(v)
          else scheduleResumeAfterSeek(v)
        }
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
        document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [duration, isPlaying, scheduleResumeAfterSeek, resumePlayback]
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isMuted) {
      const restored = prevVolume || 0.8
      video.volume = restored
      setVolume(restored)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      video.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume, prevVolume])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    if (videoRef.current) videoRef.current.volume = v
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={containerRef}
      className="video-player-container relative rounded-lg overflow-hidden bg-black group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setShowVolumeSlider(false)
      }}
      onMouseMove={() => {
        setShowControls(true)
        scheduleHide()
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full block cursor-pointer"
        style={maxHeight === 'none' ? undefined : { maxHeight }}
        preload="metadata"
        onClick={togglePlay}
        onLoadedMetadata={onLoadedMetadata}
      />

      {/* Center play overlay */}
      {(!isPlaying || hasEnded) && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="video-play-overlay w-14 h-14 rounded-full flex items-center justify-center">
            {hasEnded ? (
              <RotateCcw size={22} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Bottom gradient + controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="video-controls-gradient pt-12 pb-0 px-0">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="video-progress-bar relative w-full h-5 flex items-end cursor-pointer px-3"
            onMouseDown={handleSeekMouseDown}
          >
            <div className="relative w-full h-[3px] group-hover:h-[5px] transition-all duration-150">
              <div className="absolute inset-0 rounded-full bg-white/20" />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/10"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
              <div
                className="video-progress-thumb absolute top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full bg-accent shadow-lg shadow-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 6.5px)` }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="video-ctrl-btn w-8 h-8 flex items-center justify-center rounded-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {hasEnded ? (
                <RotateCcw size={16} />
              ) : isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} className="ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); skip(-10) }}
              className="video-ctrl-btn w-7 h-7 flex items-center justify-center rounded-md"
              title="Rewind 10s"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); skip(10) }}
              className="video-ctrl-btn w-7 h-7 flex items-center justify-center rounded-md"
              title="Forward 10s"
            >
              <SkipForward size={14} />
            </button>

            {/* Time */}
            <span className="text-[11px] text-white/80 font-mono tabular-nums ml-1 select-none">
              {formatDuration(currentTime)}
              <span className="text-white/40 mx-0.5">/</span>
              {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume: icon first, slider expands to the right */}
            <div
              className="flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute() }}
                className="video-ctrl-btn w-7 h-7 flex items-center justify-center rounded-md"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon size={15} />
              </button>
              <div
                className={`flex items-center transition-all duration-200 ${
                  showVolumeSlider ? 'w-[72px] opacity-100 ml-0.5' : 'w-0 opacity-0 overflow-hidden'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="video-volume-slider w-full appearance-none rounded-full cursor-pointer"
                />
              </div>
            </div>

            {onRequestFullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); onRequestFullscreen() }}
                className="video-ctrl-btn w-7 h-7 flex items-center justify-center rounded-md"
                title="Fullscreen"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FullscreenVideoPlayerProps {
  src: string
  onClose: () => void
}

export function FullscreenVideoPlayer({ src, onClose }: FullscreenVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const draggingRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const isPlayingRef = useRef(true)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (hasEnded) {
      video.currentTime = 0
      video.play()
      setIsPlaying(true)
      setHasEnded(false)
      return
    }
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [hasEnded])

  const scheduleResumeAfterSeek = useCallback((video: HTMLVideoElement) => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = undefined
      }
      video.play()
      setIsPlaying(true)
    }
    video.addEventListener('seeked', onSeeked)
    resumeTimeoutRef.current = setTimeout(() => {
      resumeTimeoutRef.current = undefined
      video.removeEventListener('seeked', onSeeked)
      if (video.paused) {
        video.play()
        setIsPlaying(true)
      }
    }, 250)
  }, [])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const shouldResume = isPlayingRef.current
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
    if (shouldResume) scheduleResumeAfterSeek(video)
  }, [scheduleResumeAfterSeek])

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return
    const next = Math.max(0, Math.min(1, video.volume + delta))
    video.volume = next
    setVolume(next)
    setIsMuted(next === 0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'ArrowLeft') skip(-10)
      if (e.key === 'ArrowRight') skip(10)
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        adjustVolume(0.1)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        adjustVolume(-0.1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, togglePlay, skip, adjustVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      if (!draggingRef.current) setCurrentTime(video.currentTime)
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }
    const onMeta = () => setDuration(video.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setHasEnded(true)
      setShowControls(true)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  const resumePlayback = useCallback((video: HTMLVideoElement) => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = undefined
    }
    video.play()
    setIsPlaying(true)
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        if (!isHovering) setShowControls(false)
      }, 2500)
    }
  }, [isPlaying, isHovering])

  useEffect(() => {
    if (isPlaying && !isHovering) {
      scheduleHide()
    } else {
      setShowControls(true)
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isPlaying, isHovering, scheduleHide])

  const handleSeekMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      const video = videoRef.current
      wasPlayingRef.current = isPlayingRef.current
      draggingRef.current = true
      if (video && !video.paused) {
        video.pause()
      }
      const seek = (ev: MouseEvent) => {
        if (!progressRef.current || !videoRef.current) return
        const rect = progressRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width))
        const pct = x / rect.width
        videoRef.current.currentTime = pct * duration
        setCurrentTime(pct * duration)
      }
      seek(e.nativeEvent)
      const onMove = (ev: MouseEvent) => seek(ev)
      const onUp = () => {
        draggingRef.current = false
        const v = videoRef.current
        if (wasPlayingRef.current && v) {
          if (!v.seeking) resumePlayback(v)
          else scheduleResumeAfterSeek(v)
        }
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [duration, scheduleResumeAfterSeek, resumePlayback]
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isMuted) {
      const restored = prevVolume || 0.8
      video.volume = restored
      setVolume(restored)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      video.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume, prevVolume])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    if (videoRef.current) videoRef.current.volume = v
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[55] bg-black flex flex-col items-center justify-center"
      role="dialog"
      aria-label="Video fullscreen"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={() => {
        setShowControls(true)
        scheduleHide()
      }}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
                   rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm
                   transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Close fullscreen"
      >
        <Minimize2 size={18} />
      </button>

      <video
        ref={videoRef}
        src={src}
        autoPlay
        className="max-w-full max-h-full cursor-pointer"
        onClick={togglePlay}
      />

      {/* Center play overlay */}
      {(!isPlaying || hasEnded) && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="video-play-overlay w-20 h-20 rounded-full flex items-center justify-center">
            {hasEnded ? (
              <RotateCcw size={30} className="text-white" />
            ) : (
              <Play size={32} className="text-white ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="video-controls-gradient pt-16 pb-0 px-0">
          {/* Progress */}
          <div
            ref={progressRef}
            className="video-progress-bar relative w-full h-6 flex items-end cursor-pointer px-4"
            onMouseDown={handleSeekMouseDown}
          >
            <div className="relative w-full h-[3px] hover:h-[5px] transition-all duration-150">
              <div className="absolute inset-0 rounded-full bg-white/20" />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/10"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
              <div
                className="video-progress-thumb absolute top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full bg-accent shadow-lg shadow-black/50"
                style={{ left: `calc(${progress}% - 6.5px)` }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="video-ctrl-btn w-9 h-9 flex items-center justify-center rounded-md"
            >
              {hasEnded ? (
                <RotateCcw size={18} />
              ) : isPlaying ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); skip(-10) }}
              className="video-ctrl-btn w-8 h-8 flex items-center justify-center rounded-md"
              title="Rewind 10s"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); skip(10) }}
              className="video-ctrl-btn w-8 h-8 flex items-center justify-center rounded-md"
              title="Forward 10s"
            >
              <RotateCw size={15} />
            </button>

            <span className="text-[12px] text-white/80 font-mono tabular-nums ml-1 select-none">
              {formatDuration(currentTime)}
              <span className="text-white/40 mx-1">/</span>
              {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume: icon first, slider expands to the right */}
            <div
              className="flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute() }}
                className="video-ctrl-btn w-8 h-8 flex items-center justify-center rounded-md"
              >
                <VolumeIcon size={16} />
              </button>
              <div
                className={`flex items-center transition-all duration-200 ${
                  showVolumeSlider ? 'w-[80px] opacity-100 ml-1' : 'w-0 opacity-0 overflow-hidden'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="video-volume-slider w-full appearance-none rounded-full cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="video-ctrl-btn w-8 h-8 flex items-center justify-center rounded-md"
              title="Exit fullscreen"
            >
              <Minimize2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
