import { useFileStore } from '../stores/fileStore'

function formatTotalSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0)} ${units[i]}`
}

export default function StatusBar() {
  const files = useFileStore((s) => s.files)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const searchQuery = useFileStore((s) => s.searchQuery)
  const searchIndex = useFileStore((s) => s.searchIndex)
  const isSearching = useFileStore((s) => s.isSearching)

  const displayFiles = searchQuery
    ? searchIndex.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files

  const fileCount = displayFiles.filter((f) => !f.isDirectory).length
  const folderCount = displayFiles.filter((f) => f.isDirectory).length
  const totalSize = displayFiles.reduce((sum, f) => sum + (f.isDirectory ? 0 : f.size), 0)
  const selectedCount = selectedFiles.size

  // Selected files total size
  const selectedSize = displayFiles
    .filter((f) => selectedFiles.has(f.path))
    .reduce((sum, f) => sum + (f.isDirectory ? 0 : f.size), 0)

  return (
    <div className="h-7 flex items-center justify-between px-4 bg-surface-50 border-t border-surface-500/20 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-neutral-400">
          {folderCount > 0 && (
            <span>
              {folderCount} folder{folderCount !== 1 ? 's' : ''}
              {fileCount > 0 ? ', ' : ''}
            </span>
          )}
          {fileCount > 0 && (
            <span>
              {fileCount.toLocaleString()} file{fileCount !== 1 ? 's' : ''}
            </span>
          )}
        </span>

        {selectedCount > 0 && (
          <>
            <span className="text-neutral-600">·</span>
            <span className="text-[12px] text-accent-light">
              {selectedCount} selected
              {selectedSize > 0 && ` (${formatTotalSize(selectedSize)})`}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isSearching && (
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-400">
            <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" aria-hidden />
            Indexing…
          </span>
        )}
        <span className="text-[12px] text-neutral-400">
          {formatTotalSize(totalSize)}
        </span>
      </div>
    </div>
  )
}
