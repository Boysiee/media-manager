import { memo, useRef, useCallback, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useFileStore } from '../stores/fileStore'
import { getFileIcon, formatFileSize, formatDuration } from '../utils/icons'
import type { FileItem, ListColumnId } from '../types'
import { LIST_COLUMN_WIDTHS } from '../types'

interface FileListItemProps {
  file: FileItem
  listColumns: ListColumnId[]
  isSelected: boolean
  isSearchResult: boolean
  currentPath: string
  onClick: (file: FileItem, e: React.MouseEvent) => void
  onDoubleClick: (file: FileItem) => void
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void
}

const READABLE_TYPES: Record<string, string> = {
  '.pdf': 'PDF',
  '.doc': 'Word',
  '.docx': 'Word',
  '.xls': 'Excel',
  '.xlsx': 'Excel',
  '.csv': 'CSV',
  '.ppt': 'PowerPoint',
  '.pptx': 'PowerPoint',
  '.txt': 'Text',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.xml': 'XML',
  '.zip': 'ZIP Archive',
  '.rar': 'RAR Archive',
  '.7z': '7z Archive'
}

const FileListItem = memo(function FileListItem({
  file,
  listColumns,
  isSelected,
  isSearchResult,
  currentPath,
  onClick,
  onDoubleClick,
  onContextMenu
}: FileListItemProps) {
  const renamingPath = useFileStore((s) => s.renamingPath)
  const setRenamingPath = useFileStore((s) => s.setRenamingPath)
  const renameItem = useFileStore((s) => s.renameItem)
  const mediaDurations = useFileStore((s) => s.mediaDurations)

  const isRenaming = renamingPath === file.path
  const inputRef = useRef<HTMLInputElement>(null)
  const [renameValue, setRenameValue] = useState(file.name)

  const { icon: Icon, color } = getFileIcon(file.category, file.extension)

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

  const relativePath = isSearchResult
    ? file.path.replace(currentPath, '').replace(/^[\\/]/, '').replace(/[\\/][^\\/]+$/, '')
    : null

  const typeLabel = file.isDirectory
    ? 'Folder'
    : READABLE_TYPES[file.extension] ?? file.extension.slice(1).toUpperCase() ?? '—'

  const durationSeconds = (file.category === 'video' || file.category === 'audio') ? mediaDurations[file.path] : undefined

  const renderCell = (id: ListColumnId) => {
    switch (id) {
      case 'name':
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} style={{ color }} className="shrink-0" />
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
                className="rename-input text-left"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="min-w-0">
                <span className="text-[13px] text-neutral-100 truncate block">{file.name}</span>
                {relativePath && (
                  <span className="text-[11px] text-neutral-500 truncate block">{relativePath}</span>
                )}
              </div>
            )}
          </div>
        )
      case 'size':
        return (
          <span className="text-[12px] text-neutral-400">
            {file.isDirectory ? '—' : formatFileSize(file.size)}
          </span>
        )
      case 'type':
        return <span className="text-[12px] text-neutral-400">{typeLabel}</span>
      case 'modified':
        return (
          <span className="text-[12px] text-neutral-400">
            {format(new Date(file.modified), 'dd MMM yyyy, HH:mm')}
          </span>
        )
      case 'duration':
        return (
          <span className="text-[12px] text-neutral-400 tabular-nums">
            {durationSeconds != null ? formatDuration(durationSeconds) : '—'}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`grid gap-4 items-center px-3 py-1.5 rounded-md cursor-pointer
                  transition-colors duration-75 select-none
                  ${isSelected ? 'bg-accent/10 selection-ring' : 'hover:bg-surface-300/30'}`}
      style={{ gridTemplateColumns: listColumns.map((id) => LIST_COLUMN_WIDTHS[id]).join(' ') }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(file, e)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick(file)
      }}
      onContextMenu={(e) => onContextMenu(e, file)}
    >
      {listColumns.map((id) => (
        <div key={id}>{renderCell(id)}</div>
      ))}
    </div>
  )
})

export default FileListItem
