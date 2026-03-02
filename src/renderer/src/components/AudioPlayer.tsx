import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward } from 'lucide-react'
import { formatDuration } from '../utils/icons'

interface AudioPlayerProps {
  src: string
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (!isDragging) setCurrentTime(audio.currentTime)
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [isDragging])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds))
    setCurrentTime(audio.currentTime)
  }, [])

  const handleSeekMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true)
      const seek = (ev: MouseEvent) => {
        if (!progressRef.current || !audioRef.current) return
        const rect = progressRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width))
        const percent = x / rect.width
        const newTime = percent * duration
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
      seek(e.nativeEvent)
      const onMouseMove = (ev: MouseEvent) => seek(ev)
      const onMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [duration]
  )

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value)
      setVolume(v)
      setIsMuted(v === 0)
      if (audioRef.current) audioRef.current.volume = v
    },
    []
  )

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        const restored = prevVolume || 0.8
        audioRef.current.volume = restored
        setVolume(restored)
        setIsMuted(false)
      } else {
        setPrevVolume(volume)
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }, [isMuted, volume, prevVolume])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div className="audio-player w-full">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Controls row: skip back, play/pause, skip forward */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => skip(-10)}
          className="audio-ctrl-btn w-8 h-8 flex items-center justify-center rounded-full"
          title="Rewind 10s"
        >
          <SkipBack size={14} />
        </button>

        <button
          onClick={togglePlay}
          className="audio-play-btn w-11 h-11 flex items-center justify-center rounded-full shrink-0"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <button
          onClick={() => skip(10)}
          className="audio-ctrl-btn w-8 h-8 flex items-center justify-center rounded-full"
          title="Forward 10s"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Seek bar with timestamps */}
      <div className="space-y-1.5">
        <div
          ref={progressRef}
          className="audio-seek-bar relative w-full h-5 flex items-center cursor-pointer group"
          onMouseDown={handleSeekMouseDown}
        >
          <div className="relative w-full h-[3px] group-hover:h-[5px] transition-all duration-150">
            <div className="absolute inset-0 rounded-full bg-surface-500/60" />
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-accent transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
            <div
              className="audio-seek-thumb absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-accent shadow-md shadow-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 5.5px)` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-500 font-mono tabular-nums select-none">
            {formatDuration(currentTime)}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono tabular-nums select-none">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div
        className="flex items-center justify-center mt-2"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="audio-ctrl-btn w-7 h-7 flex items-center justify-center rounded-full"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <VolumeIcon size={13} />
          </button>
          <div
            className={`audio-volume-wrap flex items-center overflow-hidden transition-all duration-200 ${
              showVolumeSlider ? 'w-[72px] opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="audio-volume-slider w-full h-[3px] appearance-none bg-surface-500/50 rounded-full cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
