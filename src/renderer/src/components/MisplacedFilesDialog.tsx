import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, FolderInput, Image, Film, Music, FileText } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import type { FileItem, MediaSection } from '../types'
import { SECTION_CONFIG, SECTION_EXPECTED_CATEGORY, CATEGORY_TO_SECTION } from '../types'

const CATEGORY_ICONS: Record<Exclude<FileItem['category'], 'folder'>, typeof Image> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText
}

const CATEGORY_LABELS: Record<Exclude<FileItem['category'], 'folder'>, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document'
}

export default function MisplacedFilesDialog() {
  const isOpen = useFileStore((s) => s.isMisplacedDialogOpen)
  const activeSection = useFileStore((s) => s.activeSection)
  const sections = useFileStore((s) => s.sections)
  const searchIndex = useFileStore((s) => s.searchIndex)
  const isSearching = useFileStore((s) => s.isSearching)
  const setMisplacedDialogOpen = useFileStore((s) => s.setMisplacedDialogOpen)
  const setMoveDialogOpen = useFileStore((s) => s.setMoveDialogOpen)
  const moveFilesToDestination = useFileStore((s) => s.moveFilesToDestination)
  const setActiveSection = useFileStore((s) => s.setActiveSection)

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [isMoving, setIsMoving] = useState(false)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const expectedCategory = SECTION_EXPECTED_CATEGORY[activeSection]
  const misplacedFiles = useMemo(() => {
    return searchIndex.filter(
      (f): f is FileItem => !f.isDirectory && f.category !== 'folder' && f.category !== expectedCategory
    )
  }, [searchIndex, expectedCategory])

  useEffect(() => {
    if (!isOpen) return
    setSelectedPaths(new Set())
    const t = setTimeout(() => firstFocusableRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [isOpen])

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedPaths(new Set(misplacedFiles.map((f) => f.path)))
  }, [misplacedFiles])

  const selectNone = useCallback(() => {
    setSelectedPaths(new Set())
  }, [])

  const handleMoveTo = useCallback(() => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    setMoveDialogOpen(true, 'move', paths)
  }, [selectedPaths, setMoveDialogOpen])

  const handleMoveToSection = useCallback(
    async (section: MediaSection) => {
      const paths = Array.from(selectedPaths)
      if (paths.length === 0) return
      const dest = sections[section]
      if (!dest) return
      setIsMoving(true)
      try {
        await moveFilesToDestination(paths, dest)
        setSelectedPaths(new Set())
        await setActiveSection(activeSection)
      } finally {
        setIsMoving(false)
      }
    },
    [selectedPaths, sections, moveFilesToDestination, setActiveSection, activeSection]
  )

  if (!isOpen) return null

  const currentSectionLabel = SECTION_CONFIG[activeSection].label

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="misplaced-dialog-title"
    >
      <div
        className="relative w-[560px] max-h-[80vh] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {isMoving && (
          <div
            className="absolute inset-0 rounded-xl bg-surface-900/60 flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20 shrink-0">
          <div>
            <h2 id="misplaced-dialog-title" className="text-[14px] font-semibold text-neutral-100">
              Find misplaced files
            </h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {isSearching
                ? 'Indexing section…'
                : `Files in ${currentSectionLabel} that are not ${expectedCategory}s (e.g. videos in Images folder).`}
            </p>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={() => setMisplacedDialogOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
          {isSearching && (
            <div className="flex items-center justify-center py-12 gap-3 text-neutral-400">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-[13px]">Indexing section…</span>
            </div>
          )}

          {!isSearching && misplacedFiles.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-neutral-400">No misplaced files found.</p>
              <p className="text-[12px] text-neutral-600 mt-1">
                All files in this section match the expected type ({expectedCategory}s).
              </p>
            </div>
          )}

          {!isSearching && misplacedFiles.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-neutral-500">
                  {misplacedFiles.length} file{misplacedFiles.length !== 1 ? 's' : ''} in wrong folder
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[11px] px-2 py-1 rounded bg-surface-500/30 text-neutral-400 hover:text-neutral-200"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-[11px] px-2 py-1 rounded bg-surface-500/30 text-neutral-400 hover:text-neutral-200"
                  >
                    Select none
                  </button>
                </div>
              </div>
              <ul className="space-y-1 max-h-[320px] overflow-y-auto rounded-lg border border-surface-500/30 bg-surface-300/30">
                {misplacedFiles.map((file) => {
                  const CategoryIcon = CATEGORY_ICONS[file.category]
                  const sectionForCategory = CATEGORY_TO_SECTION[file.category]
                  const targetLabel = SECTION_CONFIG[sectionForCategory].label
                  return (
                    <li
                      key={file.path}
                      className="flex items-center gap-2 py-2 px-3 hover:bg-surface-500/20 border-b border-surface-500/10 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPaths.has(file.path)}
                        onChange={() => togglePath(file.path)}
                        className="rounded border-surface-500/50 text-accent focus:ring-accent/50 shrink-0"
                      />
                      <CategoryIcon size={14} className="shrink-0 text-neutral-500" />
                      <span className="text-[12px] text-neutral-300 truncate min-w-0 flex-1" title={file.path}>
                        {file.name}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface-500/40 text-neutral-500 shrink-0"
                        title={`Belongs in ${targetLabel}`}
                      >
                        {CATEGORY_LABELS[file.category]} → {targetLabel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {!isSearching && misplacedFiles.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-500/20 shrink-0">
            <p className="text-[11px] text-neutral-600">
              {selectedPaths.size > 0 ? `${selectedPaths.size} selected` : 'Select files to move.'}
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => setMisplacedDialogOpen(false)}
                className="h-8 px-4 text-[12px] text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-surface-400/30"
              >
                Close
              </button>
              <button
                onClick={handleMoveTo}
                disabled={selectedPaths.size === 0 || isMoving}
                className="h-8 px-4 flex items-center gap-1.5 text-[12px] rounded-md bg-surface-400/50 text-neutral-300 hover:bg-surface-500/50 disabled:opacity-40 disabled:pointer-events-none"
                title="Choose destination folder"
              >
                <FolderInput size={13} />
                Move to…
              </button>
              {(['images', 'videos', 'audio', 'documents'] as const).map((section) => {
                const dest = sections[section]
                if (!dest) return null
                const label = SECTION_CONFIG[section].label
                return (
                  <button
                    key={section}
                    onClick={() => handleMoveToSection(section)}
                    disabled={selectedPaths.size === 0 || isMoving}
                    className="h-8 px-3 text-[12px] rounded-md bg-accent/15 text-accent-light hover:bg-accent/25 disabled:opacity-40 disabled:pointer-events-none"
                    title={`Move selected to ${label}`}
                  >
                    To {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
