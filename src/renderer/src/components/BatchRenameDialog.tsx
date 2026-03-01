import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import type { FileItem } from '../types'

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  return i < 0 ? path : path.slice(i + 1)
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i) : ''
}

export default function BatchRenameDialog() {
  const files = useFileStore((s) => s.files)
  const searchQuery = useFileStore((s) => s.searchQuery)
  const searchIndex = useFileStore((s) => s.searchIndex)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const setBatchRenameOpen = useFileStore((s) => s.setBatchRenameOpen)
  const renameBatch = useFileStore((s) => s.renameBatch)

  const [pattern, setPattern] = useState('Clip {n}')
  const [startIndex, setStartIndex] = useState(1)
  const [isApplying, setIsApplying] = useState(false)

  const selectedFileList = useMemo(() => {
    const list = searchQuery.trim()
      ? searchIndex.filter((f) => selectedFiles.has(f.path))
      : files.filter((f) => selectedFiles.has(f.path))
    return list.filter((f): f is FileItem => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name))
  }, [files, searchIndex, searchQuery, selectedFiles])

  const preview = useMemo(() => {
    return selectedFileList.map((file, i) => {
      const n = startIndex + i
      const ext = getExtension(file.name)
      const newName = pattern.replace(/\{n\}/gi, String(n)) + (ext && !pattern.includes('.') ? ext : '')
      return { original: file.name, newName: newName || file.name }
    })
  }, [selectedFileList, pattern, startIndex])

  const handleApply = async () => {
    if (selectedFileList.length === 0) return
    setIsApplying(true)
    const entries = selectedFileList.map((file, i) => {
      const n = startIndex + i
      const ext = getExtension(file.name)
      const newName = pattern.replace(/\{n\}/gi, String(n)) + (ext && !pattern.includes('.') ? ext : '')
      return { path: file.path, newName: newName || file.name }
    })
    await renameBatch(entries)
    setIsApplying(false)
    setBatchRenameOpen(false)
  }

  useEffect(() => {
    if (selectedFileList.length === 0) setBatchRenameOpen(false)
  }, [selectedFileList.length, setBatchRenameOpen])

  if (selectedFileList.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div
        className="w-[420px] max-h-[85vh] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20">
          <h2 className="text-[14px] font-semibold text-neutral-100">
            Rename {selectedFileList.length} file{selectedFileList.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={() => setBatchRenameOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-[12px] text-neutral-400">
            Use <code className="px-1 py-0.5 bg-surface-400/50 rounded text-[11px]">&#123;n&#125;</code> for the number (e.g. &quot;Clip &#123;n&#125;&quot; → Clip 1, Clip 2…). Extension is kept.
          </p>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Pattern
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Clip {n}"
              className="w-full h-9 px-3 bg-surface-300 border border-surface-500/40 rounded-md text-[13px] text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Start number
            </label>
            <input
              type="number"
              min={0}
              value={startIndex}
              onChange={(e) => setStartIndex(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-24 h-9 px-3 bg-surface-300 border border-surface-500/40 rounded-md text-[13px] text-neutral-200 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Preview
            </span>
            <div className="max-h-40 overflow-y-auto rounded-md bg-surface-300/50 border border-surface-500/30 p-2 space-y-1">
              {preview.slice(0, 20).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-neutral-500 truncate flex-1 min-w-0">{p.original}</span>
                  <span className="text-neutral-400 shrink-0">→</span>
                  <span className="text-neutral-200 truncate flex-1 min-w-0">{p.newName}</span>
                </div>
              ))}
              {preview.length > 20 && (
                <p className="text-[10px] text-neutral-500 pt-1">… and {preview.length - 20} more</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-500/20">
          <button
            onClick={() => setBatchRenameOpen(false)}
            className="h-8 px-4 text-[12px] text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-surface-400/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="h-8 px-4 bg-accent text-white text-[12px] font-medium rounded-md hover:bg-accent-light disabled:opacity-40 transition-colors"
          >
            {isApplying ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  )
}
