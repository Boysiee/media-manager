import { memo, useRef, useCallback, useState, useEffect } from 'react'
import { Music, Play, Star } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { getFileIcon, formatFileSize, formatDuration } from '../utils/icons'
import { requestVideoThumbSlot, releaseVideoThumbSlot } from '../utils/videoThumbQueue'
import type { FileItem, GridSize } from '../types'

interface FileCardProps {
  file: FileItem
  isSelected: boolean
  isSearchResult: boolean
  currentPath: string
  gridSize?: GridSize
  onClick: (file: FileItem, e: React.MouseEvent) => void
  onDoubleClick: (file: FileItem) => void
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void
}

const FileCard = memo(function FileCard({
  file,
  isSelected,
  isSearchResult,
  currentPath,
  gridSize = 'medium',
  onClick,
  onDoubleClick,
  onContextMenu
}: FileCardProps) {
  const renamingPath = useFileStore((s) => s.renamingPath)
  const setRenamingPath = useFileStore((s) => s.setRenamingPath)
  const renameItem = useFileStore((s) => s.renameItem)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const mediaDurations = useFileStore((s) => s.mediaDurations)
  const setMediaDuration = useFileStore((s) => s.setMediaDuration)
  const mediaServerPort = useFileStore((s) => s.mediaServerPort)
  const favorites = useFileStore((s) => s.favorites)
  const setFavorite = useFileStore((s) => s.setFavorite)

  const isRenaming = renamingPath === file.path
  const inputRef = useRef<HTMLInputElement>(null)
  const [renameValue, setRenameValue] = useState(file.name)

  // Thumbnail state
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [thumbLoading, setThumbLoading] = useState(false)
  const [useFallbackUrl, setUseFallbackUrl] = useState(false)

  // Audio cover state
  const [audioCover, setAudioCover] = useState<string | null>(null)

  // Video thumbnail state
  const [videoThumb, setVideoThumb] = useState<string | null>(null)

  const isImage = file.category === 'image'
  const isVideo = file.category === 'video'
  const isAudio = file.category === 'audio'
  const { icon: Icon, color } = getFileIcon(file.category, file.extension)

  const mediaUrl = `media-file:///${encodeURIComponent(file.path.replace(/\\/g, '/'))}`
  const streamUrl = mediaServerPort
    ? `http://127.0.0.1:${mediaServerPort}/${encodeURIComponent(file.path)}`
    : mediaUrl

  // Lazy loading via IntersectionObserver
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Load image thumbnail — try nativeImage first, fall back to direct URL for webp/avif/gif
  useEffect(() => {
    if (!isImage || !isVisible || thumbnail || useFallbackUrl) return
    let cancelled = false
    setThumbLoading(true)

    window.api.getThumbnail(file.path).then((data) => {
      if (cancelled) return
      if (data) {
        setThumbnail(data)
      } else {
        // nativeImage can't handle this format — load the original via protocol
        setUseFallbackUrl(true)
      }
      setThumbLoading(false)
    })

    return () => { cancelled = true }
  }, [isImage, isVisible, file.path, thumbnail, useFallbackUrl])

  // Generate video thumbnail by grabbing a frame with <video> + <canvas>. Concurrency limited via queue.
  const videoSlotHeldRef = useRef(false)
  useEffect(() => {
    if (!isVideo || !isVisible || videoThumb !== null) return
    let cancelled = false

    requestVideoThumbSlot().then(() => {
      if (cancelled) {
        releaseVideoThumbSlot()
        return
      }
      videoSlotHeldRef.current = true

      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.crossOrigin = 'anonymous'
      video.src = streamUrl

      const releaseSlot = () => {
        if (!videoSlotHeldRef.current) return
        videoSlotHeldRef.current = false
        releaseVideoThumbSlot()
      }

      video.onloadeddata = () => {
        if (!cancelled && Number.isFinite(video.duration)) {
          setMediaDuration(file.path, video.duration)
        }
        video.currentTime = Math.min(1, video.duration * 0.1)
      }

      video.onseeked = () => {
        if (cancelled) return
        try {
          const canvas = document.createElement('canvas')
          const scale = 200 / Math.max(video.videoWidth, video.videoHeight, 1)
          canvas.width = Math.round(video.videoWidth * scale)
          canvas.height = Math.round(video.videoHeight * scale)
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            setVideoThumb(canvas.toDataURL('image/jpeg', 0.7))
          }
        } catch {
          setVideoThumb('')
        }
        video.src = ''
        releaseSlot()
      }

      video.onerror = () => {
        if (!cancelled) setVideoThumb('')
        releaseSlot()
      }
    })

    return () => {
      cancelled = true
      if (videoSlotHeldRef.current) {
        videoSlotHeldRef.current = false
        releaseVideoThumbSlot()
      }
    }
  }, [isVideo, isVisible, streamUrl, videoThumb, file.path, setMediaDuration])

  // Load audio cover art
  useEffect(() => {
    if (!isAudio || !isVisible || audioCover !== null) return
    let cancelled = false

    window.api.getAudioMetadata(file.path).then((meta) => {
      if (cancelled) return
      setAudioCover(meta?.cover ?? '')
      if (meta?.duration != null && Number.isFinite(meta.duration)) {
        setMediaDuration(file.path, meta.duration)
      }
    })

    return () => { cancelled = true }
  }, [isAudio, isVisible, file.path, audioCover])

  // Rename handling
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      setRenameValue(file.name)
      inputRef.current.focus()
      const dotIndex = file.name.lastIndexOf('.')
      if (dotIndex > 0 && !file.isDirectory) {
        inputRef.current.setSelectionRange(0, dotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [isRenaming, file.name, file.isDirectory])

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== file.name) {
      renameItem(file.path, trimmed)
    } else {
      setRenamingPath(null)
    }
  }, [renameValue, file.name, file.path, renameItem, setRenamingPath])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move'
      if (!selectedFiles.has(file.path)) {
        useFileStore.getState().selectFile(file.path, 'single')
      }
      e.dataTransfer.setData('text/plain', 'files')
    },
    [file.path, selectedFiles]
  )

  const relativePath = isSearchResult
    ? file.path.replace(currentPath, '').replace(/^[\\/]/, '').replace(/[\\/][^\\/]+$/, '')
    : null

  return (
    <div
      ref={cardRef}
      className={`file-card group relative rounded-lg p-2 pt-2.5 cursor-pointer
                  transition-all duration-100 select-none h-full overflow-hidden
                  grid grid-rows-[minmax(0,1fr)_auto] gap-y-2
                  ${isSelected ? 'bg-accent/10 selection-ring' : 'hover:bg-surface-300/50'}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick(file, e)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick(file)
      }}
      onContextMenu={(e) => onContextMenu(e, file)}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
    >
      {/* Thumbnail area: row 1 takes remaining space; inner square fits and keeps image contained */}
      <div className="min-h-0 w-full flex items-center justify-center">
        <div className="w-full max-h-full aspect-square rounded-md overflow-hidden flex items-center justify-center bg-surface-300/30 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setFavorite(file.path, !favorites.has(file.path))
          }}
          className="absolute top-1 right-1 z-20 w-6 h-6 flex items-center justify-center rounded-md
                     bg-black/40 hover:bg-black/60 text-neutral-200 hover:text-amber-400 transition-colors"
          title={favorites.has(file.path) ? 'Remove from Favorites' : 'Add to Favorites'}
          aria-label={favorites.has(file.path) ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Star
            size={12}
            className={favorites.has(file.path) ? 'text-amber-400' : ''}
            fill={favorites.has(file.path) ? 'currentColor' : 'none'}
          />
        </button>
        {isImage && isVisible ? (
          <>
            {thumbLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-5 h-5 border-2 border-accent/20 border-t-accent/60 rounded-full animate-spin" />
              </div>
            )}
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={file.name}
                className="thumbnail-img w-full h-full object-contain"
                decoding="async"
              />
            ) : useFallbackUrl ? (
              <img
                src={mediaUrl}
                alt={file.name}
                className="thumbnail-img w-full h-full object-contain"
                decoding="async"
                loading="lazy"
              />
            ) : null}
          </>
        ) : isVideo && isVisible ? (
          <div className="relative w-full h-full flex items-center justify-center bg-surface-400/20 group/thumb">
            {videoThumb && videoThumb !== '' ? (
              <img
                src={videoThumb}
                alt={file.name}
                className="thumbnail-img w-full h-full object-cover"
                decoding="async"
              />
            ) : (
              <Icon size={28} style={{ color }} className="opacity-40" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <Play size={18} className="text-surface-800 fill-surface-800 ml-0.5" />
              </div>
            </div>
            {(mediaDurations[file.path] != null ? (
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-neutral-200 font-mono">
                {formatDuration(mediaDurations[file.path])}
              </div>
            ) : null)}
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-neutral-400 font-mono uppercase">
              {file.extension.slice(1)}
            </div>
          </div>
        ) : isAudio && isVisible && audioCover ? (
          <div className="relative w-full h-full">
            <img
              src={audioCover}
              alt={file.name}
              className="w-full h-full object-cover"
              decoding="async"
            />
            {mediaDurations[file.path] != null && (
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-neutral-200 font-mono">
                {formatDuration(mediaDurations[file.path])}
              </div>
            )}
          </div>
        ) : isAudio && isVisible && audioCover === '' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-surface-400/20">
            <Music size={28} style={{ color: '#34d399' }} className="opacity-40" />
            {mediaDurations[file.path] != null && (
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-neutral-200 font-mono">
                {formatDuration(mediaDurations[file.path])}
              </div>
            )}
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-neutral-400 font-mono uppercase">
              {file.extension.slice(1)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Icon
              size={file.isDirectory ? 32 : 28}
              style={{ color }}
              className="opacity-50"
            />
            {!file.isDirectory && file.extension && (
              <span className="text-[9px] font-mono uppercase opacity-40" style={{ color }}>
                {file.extension.slice(1)}
              </span>
            )}
          </div>
        )}
        </div>
      </div>

      {/* File name — row 2 auto so it always has space */}
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setRenamingPath(null)
          }}
          className="rename-input w-full shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="w-full min-h-[2.5em] text-center px-1 pb-0.5 overflow-hidden flex flex-col justify-center self-start">
          <p className={`leading-tight line-clamp-2 break-all text-neutral-100 flex-shrink-0 ${gridSize === 'small' ? 'text-[11px]' : gridSize === 'large' ? 'text-[14px]' : 'text-[13px]'}`} title={file.name}>
            {file.name}
          </p>
          {!file.isDirectory && (
            <p className={`text-neutral-500 mt-1 flex-shrink-0 ${gridSize === 'small' ? 'text-[10px]' : 'text-[12px]'}`}>
              {formatFileSize(file.size)}
            </p>
          )}
          {relativePath && (
            <p className="text-[11px] text-neutral-500 mt-0.5 truncate flex-shrink-0" title={relativePath}>
              {relativePath}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

export default FileCard
