import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
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
  const [isMuted, setIsMuted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Reset on source change
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

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const percent = x / rect.width
      const newTime = percent * duration
      if (audioRef.current) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    },
    [duration]
  )

  const handleSeekMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true)
      handleSeek(e)

      const onMouseMove = (ev: MouseEvent) => {
        if (!progressRef.current) return
        const rect = progressRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width))
        const percent = x / rect.width
        const newTime = percent * duration
        if (audioRef.current) {
          audioRef.current.currentTime = newTime
          setCurrentTime(newTime)
        }
      }

      const onMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [duration, handleSeek]
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
        audioRef.current.volume = volume || 0.8
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }, [isMuted, volume])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="w-full space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play button + time */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-accent/20 text-accent-light
                     hover:bg-accent/30 transition-colors shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
          {formatDuration(currentTime)}
          <span className="text-neutral-600 mx-1">/</span>
          {formatDuration(duration)}
        </div>
      </div>

      {/* Seek bar — large, easy to use */}
      <div
        ref={progressRef}
        className="relative w-full h-6 flex items-center cursor-pointer group"
        onMouseDown={handleSeekMouseDown}
      >
        {/* Track background */}
        <div className="absolute w-full h-1.5 rounded-full bg-surface-500/50 group-hover:h-2.5 transition-all" />

        {/* Progress fill */}
        <div
          className="absolute h-1.5 rounded-full bg-accent group-hover:h-2.5 transition-all"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-black/40
                     opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="volume-slider w-20 h-1.5 appearance-none bg-surface-500/50 rounded-full cursor-pointer"
        />
      </div>
    </div>
  )
}
