import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronDown, ChevronRight, Trash2, FolderInput } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { api } from '../api'
import type { DuplicateGroup, FileItem } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Parse duplicate group key "name\tsize" for display. */
function formatGroupLabel(key: string, firstFile: FileItem): string {
  const [name, sizePart] = key.split('\t')
  const size = sizePart ? Number(sizePart) : firstFile.size
  return `${name} (${formatSize(size)})`
}

export default function DuplicatesDialog() {
  const isOpen = useFileStore((s) => s.isDuplicatesDialogOpen)
  const sectionRoot = useFileStore((s) => s.sectionRoot)
  const duplicateGroups = useFileStore((s) => s.duplicateGroups)
  const isScanning = useFileStore((s) => s.isScanningDuplicates)
  const setDuplicatesDialogOpen = useFileStore((s) => s.setDuplicatesDialogOpen)
  const runFindDuplicates = useFileStore((s) => s.runFindDuplicates)
  const setMoveDialogOpen = useFileStore((s) => s.setMoveDialogOpen)
  const addNotification = useFileStore((s) => s.addNotification)

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isTrashing, setIsTrashing] = useState(false)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setSelectedPaths(new Set())
    setExpandedGroups(new Set())
    const t = setTimeout(() => firstFocusableRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && sectionRoot) {
      runFindDuplicates()
    }
  }, [isOpen, sectionRoot, runFindDuplicates])

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAllInGroup = useCallback((group: DuplicateGroup) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      group.files.forEach((f) => next.add(f.path))
      return next
    })
  }, [])

  const selectAllButFirst = useCallback((group: DuplicateGroup) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      group.files.forEach((f, i) => {
        if (i > 0) next.add(f.path)
        else next.delete(f.path)
      })
      return next
    })
  }, [])

  const handleMoveToRecycleBin = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    setIsTrashing(true)
    try {
      const results = await api.trashFiles(paths)
      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        addNotification('error', `Failed to move ${failed.length} file(s) to Recycle Bin`)
      } else {
        addNotification('success', `Moved ${paths.length} file(s) to Recycle Bin`)
      }
      setSelectedPaths(new Set())
      await runFindDuplicates()
    } finally {
      setIsTrashing(false)
    }
  }, [selectedPaths, addNotification, runFindDuplicates])

  const handleMoveTo = useCallback(() => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    setMoveDialogOpen(true, 'move', paths)
  }, [selectedPaths, setMoveDialogOpen])

  if (!isOpen) return null

  const totalDuplicateFiles = duplicateGroups.reduce((acc, g) => acc + g.files.length, 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicates-dialog-title"
    >
      <div
        className="relative w-[560px] max-h-[80vh] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {isTrashing && (
          <div
            className="absolute inset-0 rounded-xl bg-surface-900/60 flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20 shrink-0">
          <div>
            <h2 id="duplicates-dialog-title" className="text-[14px] font-semibold text-neutral-100">
              Find duplicates
            </h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {isScanning
                ? 'Scanning section…'
                : duplicateGroups.length === 0
                  ? 'No duplicate groups found (same name + size).'
                  : `${duplicateGroups.length} group(s), ${totalDuplicateFiles} file(s) total`}
            </p>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={() => setDuplicatesDialogOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px] space-y-2">
          {isScanning && (
            <div className="flex items-center justify-center py-12 gap-3 text-neutral-400">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-[13px]">Scanning section for duplicates…</span>
            </div>
          )}

          {!isScanning && duplicateGroups.length === 0 && !sectionRoot && (
            <div className="py-8 text-center text-[13px] text-neutral-500">
              Open Settings to set a folder for this section, then try again.
            </div>
          )}

          {!isScanning && duplicateGroups.length === 0 && sectionRoot && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-neutral-400">No duplicates found.</p>
              <p className="text-[12px] text-neutral-600 mt-1">
                Duplicates are verified by content (same name, size, and hash) within this section.
              </p>
            </div>
          )}

          {!isScanning &&
            duplicateGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.key)
              const label = formatGroupLabel(group.key, group.files[0])
              return (
                <div
                  key={group.key}
                  className="rounded-lg border border-surface-500/30 bg-surface-300/30 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-neutral-200 hover:bg-surface-400/30 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="shrink-0 text-neutral-500" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0 text-neutral-500" />
                    )}
                    <span className="font-medium truncate">{label}</span>
                    <span className="text-[11px] text-neutral-500 shrink-0">
                      {group.files.length} cop{group.files.length === 1 ? 'y' : 'ies'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-surface-500/25 px-3 py-2 space-y-1 bg-surface-400/10">
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => selectAllButFirst(group)}
                          className="text-[11px] px-2 py-1 rounded bg-surface-500/30 text-neutral-400 hover:text-neutral-200 hover:bg-surface-500/50"
                        >
                          Select all but first
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAllInGroup(group)}
                          className="text-[11px] px-2 py-1 rounded bg-surface-500/30 text-neutral-400 hover:text-neutral-200 hover:bg-surface-500/50"
                        >
                          Select all
                        </button>
                      </div>
                      {group.files.map((file) => (
                        <label
                          key={file.path}
                          className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-surface-500/20 cursor-pointer group/row"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPaths.has(file.path)}
                            onChange={() => togglePath(file.path)}
                            className="mt-1 rounded border-surface-500/50 text-accent focus:ring-accent/50"
                          />
                          <span className="text-[12px] text-neutral-400 truncate flex-1 min-w-0" title={file.path}>
                            {file.path}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-500/20 shrink-0">
          <p className="text-[11px] text-neutral-600">
            {selectedPaths.size > 0 ? `${selectedPaths.size} selected for removal` : 'Select copies to remove or move.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDuplicatesDialogOpen(false)}
              className="h-8 px-4 text-[12px] text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-surface-400/30 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleMoveTo}
              disabled={selectedPaths.size === 0 || isTrashing}
              className="h-8 px-4 flex items-center gap-1.5 text-[12px] rounded-md bg-surface-400/50 text-neutral-300 hover:bg-surface-500/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Move selected to another folder"
              aria-label="Move to folder"
            >
              <FolderInput size={13} />
              Move to…
            </button>
            <button
              onClick={handleMoveToRecycleBin}
              disabled={selectedPaths.size === 0 || isTrashing}
              className="h-8 px-4 flex items-center gap-1.5 text-[12px] rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Move selected to Recycle Bin"
              aria-label="Move to Recycle Bin"
            >
              <Trash2 size={13} />
              Move to Recycle Bin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
