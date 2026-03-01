import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  ExternalLink,
  FolderOpen,
  Pencil,
  Move,
  Trash2,
  Copy,
  GripVertical,
  Maximize2
} from 'lucide-react'
import { format } from 'date-fns'
import { useFileStore } from '../stores/fileStore'
import { getFileIcon, formatFileSize, formatDuration } from '../utils/icons'
import AudioPlayer from './AudioPlayer'

const TEXT_PREVIEW_EXT = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.log',
  '.ini', '.cfg', '.conf', '.html', '.htm', '.css', '.js', '.ts',
  '.py', '.java', '.c', '.cpp', '.h', '.sh', '.bat', '.rtf'
])

const MIN_PREVIEW_WIDTH = 240
const MAX_PREVIEW_WIDTH = 520

export default function PreviewPanel() {
  const previewFile = useFileStore((s) => s.previewFile)
  const previewPanelWidth = useFileStore((s) => s.previewPanelWidth)
  const setPreviewPanelWidth = useFileStore((s) => s.setPreviewPanelWidth)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const togglePreview = useFileStore((s) => s.togglePreview)
  const setRenamingPath = useFileStore((s) => s.setRenamingPath)
  const setMoveDialogOpen = useFileStore((s) => s.setMoveDialogOpen)
  const openFile = useFileStore((s) => s.openFile)
  const openInExplorer = useFileStore((s) => s.openInExplorer)
  const trashSelected = useFileStore((s) => s.trashSelected)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const mediaDurations = useFileStore((s) => s.mediaDurations)
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null)
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = previewPanelWidth

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX // drag left = increase width
        const next = Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, startW + delta))
        setPreviewPanelWidth(next)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [previewPanelWidth, setPreviewPanelWidth]
  )

  // Document text preview
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)

  // Audio metadata
  const [audioMeta, setAudioMeta] = useState<{
    title: string | null
    artist: string | null
    album: string | null
    duration: number | null
    cover: string | null
  } | null>(null)

  // Reset video resolution and fullscreen when file changes
  useEffect(() => {
    setVideoResolution(null)
    setIsVideoFullscreen(false)
  }, [previewFile?.path])

  // Escape closes video fullscreen
  useEffect(() => {
    if (!isVideoFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVideoFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isVideoFullscreen])

  // Load text preview for documents
  useEffect(() => {
    setTextContent(null)
    setAudioMeta(null)

    if (!previewFile) return

    if (!previewFile.isDirectory && TEXT_PREVIEW_EXT.has(previewFile.extension)) {
      setTextLoading(true)
      window.api.readTextFile(previewFile.path, 100).then((content) => {
        setTextContent(content)
        setTextLoading(false)
      })
    }

    if (previewFile.category === 'audio') {
      window.api.getAudioMetadata(previewFile.path).then((meta) => {
        setAudioMeta(meta)
      })
    }
  }, [previewFile])

  if (!previewFile) {
    return (
      <div
        ref={panelRef}
        className="flex flex-col items-center justify-center animate-slide-in-right bg-surface-50 border-l border-surface-500/30 relative shrink-0"
        style={{ width: previewPanelWidth, minWidth: previewPanelWidth }}
      >
        <div
          role="separator"
          aria-label="Resize preview panel"
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/20 transition-colors z-10 flex items-center justify-center"
        >
          <GripVertical size={12} className="text-neutral-600 opacity-0 hover:opacity-100" />
        </div>
        <div className="text-neutral-500 text-[13px] text-center px-6">
          <p className="mb-1 text-neutral-300">No file selected</p>
          <p className="text-[12px]">Click a file to preview it</p>
        </div>
      </div>
    )
  }

  const file = previewFile
  const { icon: Icon, color } = getFileIcon(file.category, file.extension)
  const isImage = file.category === 'image'
  const isVideo = file.category === 'video'
  const isAudio = file.category === 'audio'
  const isPdf = file.extension === '.pdf'
  const isTextPreviewable = TEXT_PREVIEW_EXT.has(file.extension)
  const multipleSelected = selectedFiles.size > 1

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const mediaUrl = `media-file:///${encodeURIComponent(file.path.replace(/\\/g, '/'))}`

  return (
    <div
      ref={panelRef}
      className="bg-surface-50 border-l border-surface-500/30 flex flex-col animate-slide-in-right relative shrink-0"
      style={{ width: previewPanelWidth, minWidth: previewPanelWidth }}
    >
      <div
        role="separator"
        aria-label="Resize preview panel"
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/20 transition-colors z-10 flex items-center justify-center"
      >
        <GripVertical size={12} className="text-neutral-600 opacity-0 hover:opacity-100" />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-surface-500/20 shrink-0">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          {multipleSelected ? `${selectedFiles.size} Selected` : 'Preview'}
        </span>
        <button
          onClick={togglePreview}
          className="w-6 h-6 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-300 hover:bg-surface-400/30 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview area — skip the big icon block for text-previewable files */}
        {!isTextPreviewable && (
          <div className="p-4 pb-0">
            <div className="w-full rounded-lg overflow-hidden bg-surface-300/30 flex items-center justify-center">
              {isImage ? (
                <img
                  src={mediaUrl}
                  alt={file.name}
                  className="w-full object-contain max-h-[300px]"
                  decoding="async"
                />
              ) : isVideo ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full max-h-[300px]"
                    controls
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget
                      if (v.videoWidth && v.videoHeight) {
                        setVideoResolution({ width: v.videoWidth, height: v.videoHeight })
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsVideoFullscreen(true)}
                    className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
                    title="Theater / Fullscreen"
                    aria-label="Expand video to fullscreen"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              ) : isAudio ? (
                <div className="flex flex-col items-center gap-3 p-4 w-full">
                  {audioMeta?.cover ? (
                    <img
                      src={audioMeta.cover}
                      alt="Album art"
                      className="w-32 h-32 rounded-lg object-cover shadow-lg shadow-black/30"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-surface-400/30 flex items-center justify-center">
                      <Icon size={40} style={{ color }} className="opacity-40" />
                    </div>
                  )}
                  {audioMeta && (audioMeta.title || audioMeta.artist) && (
                    <div className="text-center">
                      {audioMeta.title && (
                        <p className="text-[12px] text-neutral-300 font-medium">{audioMeta.title}</p>
                      )}
                      {audioMeta.artist && (
                        <p className="text-[11px] text-neutral-500">{audioMeta.artist}</p>
                      )}
                      {audioMeta.album && (
                        <p className="text-[10px] text-neutral-600">{audioMeta.album}</p>
                      )}
                    </div>
                  )}
                  <AudioPlayer src={mediaUrl} />
                </div>
              ) : isPdf ? (
                <div className="w-full py-6 flex flex-col items-center justify-center gap-2 px-4">
                  <Icon size={32} style={{ color }} className="opacity-40" />
                  <p className="text-[11px] text-neutral-500 text-center">PDF Document</p>
                  <button
                    onClick={() => openFile(file.path)}
                    className="mt-1 px-3 py-1.5 bg-accent/15 text-accent-light text-[11px] rounded-md hover:bg-accent/25 transition-colors"
                  >
                    Open in Default Viewer
                  </button>
                </div>
              ) : (
                <div className="w-full py-6 flex flex-col items-center justify-center gap-1 px-4">
                  <Icon size={32} style={{ color }} className="opacity-40" />
                  {file.extension && (
                    <span className="text-[10px] font-mono uppercase opacity-50" style={{ color }}>
                      {file.extension.slice(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text content preview — shown instead of the icon for text files */}
        {isTextPreviewable && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} />
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {file.extension.slice(1)} Preview
              </span>
            </div>
            {textLoading ? (
              <div className="bg-surface-300/30 rounded-lg p-3 h-40 flex items-center justify-center">
                <span className="text-[11px] text-neutral-600 animate-pulse">Loading...</span>
              </div>
            ) : textContent ? (
              <pre className="bg-surface-300/30 rounded-lg p-3 text-[10px] text-neutral-400 font-mono
                              max-h-[320px] overflow-y-auto whitespace-pre-wrap break-all leading-relaxed select-text">
                {textContent}
              </pre>
            ) : (
              <div className="bg-surface-300/30 rounded-lg p-3 text-center">
                <span className="text-[11px] text-neutral-600">Unable to preview</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-surface-500/25 mt-4" />

        {/* File info */}
        <div className="px-4 pt-4 pb-4 space-y-3">
          <div>
            <p className="text-[14px] font-medium text-neutral-100 break-all leading-snug">
              {file.name}
            </p>
          </div>

          <div className="space-y-2">
            {!file.isDirectory && (
              <div className="flex justify-between">
                <span className="text-[11px] text-neutral-500">Size</span>
                <span className="text-[12px] text-neutral-300">{formatFileSize(file.size)}</span>
              </div>
            )}
            {file.category === 'video' && (mediaDurations[file.path] != null || videoResolution) && (
              <>
                {mediaDurations[file.path] != null && (
                  <div className="flex justify-between">
                    <span className="text-[11px] text-neutral-500">Duration</span>
                    <span className="text-[12px] text-neutral-300">{formatDuration(mediaDurations[file.path])}</span>
                  </div>
                )}
                {videoResolution && (
                  <div className="flex justify-between">
                    <span className="text-[11px] text-neutral-500">Resolution</span>
                    <span className="text-[12px] text-neutral-300 tabular-nums">
                      {videoResolution.width}×{videoResolution.height}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-[11px] text-neutral-500">Type</span>
              <span className="text-[12px] text-neutral-300 flex items-center gap-1.5">
                <Icon size={11} style={{ color }} />
                {file.isDirectory ? 'Folder' : file.extension.slice(1).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-neutral-500">Modified</span>
              <span className="text-[12px] text-neutral-300">
                {format(new Date(file.modified), 'dd MMM yyyy, HH:mm')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-neutral-500">Created</span>
              <span className="text-[12px] text-neutral-300">
                {format(new Date(file.created), 'dd MMM yyyy, HH:mm')}
              </span>
            </div>
          </div>

          <div className="border-t border-surface-500/25 pt-3 mt-3" />

          {/* Path */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-neutral-500">Path</span>
              <button
                onClick={handleCopyPath}
                className="text-[11px] text-neutral-500 hover:text-accent transition-colors flex items-center gap-1"
                title="Copy full path"
              >
                <Copy size={10} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 break-all bg-surface-300/30 rounded px-2 py-1.5 font-mono">
              {file.path}
            </p>
          </div>

          <div className="border-t border-surface-500/25 pt-3 mt-3" />

          {/* Actions */}
          <div className="space-y-1.5">
            {!file.isDirectory && (
              <button
                onClick={() => openFile(file.path)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                           text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200 transition-colors"
              >
                <ExternalLink size={13} />
                Open File
              </button>
            )}
            <button
              onClick={() => openInExplorer(file.path)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                         text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200 transition-colors"
            >
              <FolderOpen size={13} />
              Show in Explorer
            </button>
            <button
              onClick={() => setRenamingPath(file.path)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                         text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200 transition-colors"
            >
              <Pencil size={13} />
              Rename
            </button>
            <button
              onClick={() => setMoveDialogOpen(true, 'move')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                         text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200 transition-colors"
              title="Move selected items to another folder"
            >
              <Move size={13} />
              Move to...
            </button>
            <button
              onClick={() => setMoveDialogOpen(true, 'copy')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                         text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200 transition-colors"
              title="Copy selected items to another folder"
            >
              <Copy size={13} />
              Copy to...
            </button>
            <button
              onClick={trashSelected}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]
                         text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Move selected items to Recycle Bin"
            >
              <Trash2 size={13} />
              Move to Recycle Bin
            </button>
          </div>
        </div>
      </div>

      {/* Video fullscreen/theater overlay */}
      {isVideoFullscreen && isVideo && (
        <div
          className="fixed inset-0 z-[55] bg-black flex flex-col items-center justify-center"
          role="dialog"
          aria-label="Video fullscreen"
        >
          <button
            type="button"
            onClick={() => setIsVideoFullscreen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close fullscreen"
          >
            <X size={20} />
          </button>
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
