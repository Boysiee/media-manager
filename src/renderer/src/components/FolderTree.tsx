import { useState, useCallback } from 'react'
import { ChevronRight, Folder, FolderOpen, Loader2 } from 'lucide-react'
import type { FolderNode } from '../types'
import { useFileStore } from '../stores/fileStore'

interface FolderTreeProps {
  node: FolderNode
  depth: number
  currentPath: string
  onNavigate: (path: string) => void
  onExpand: (path: string) => Promise<void>
}

export default function FolderTree({
  node,
  depth,
  currentPath,
  onNavigate,
  onExpand
}: FolderTreeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const moveSelectedFiles = useFileStore((s) => s.moveSelectedFiles)

  const isActive = currentPath === node.path
  const hasChildren = node.children === null || node.children.length > 0

  const handleToggle = useCallback(async () => {
    if (!isExpanded && node.children === null) {
      setIsExpanded(true)
      setIsLoading(true)
      try {
        await onExpand(node.path)
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsExpanded(!isExpanded)
    }
  }, [isExpanded, node.children, node.path, onExpand])

  const handleClick = useCallback(() => {
    onNavigate(node.path)
    if (!isExpanded) {
      handleToggle()
    }
  }, [node.path, onNavigate, isExpanded, handleToggle])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedFiles.size > 0) {
        setIsDropTarget(true)
      }
    },
    [selectedFiles]
  )

  const handleDragLeave = useCallback(() => {
    setIsDropTarget(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDropTarget(false)
      if (selectedFiles.size > 0) {
        await moveSelectedFiles(node.path)
      }
    },
    [selectedFiles, moveSelectedFiles, node.path]
  )

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer transition-all duration-100 group
          ${isActive ? 'bg-accent/15 text-neutral-100' : 'text-neutral-400 hover:bg-surface-300/40 hover:text-neutral-200'}
          ${isDropTarget ? 'drop-target-active' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform duration-150
            ${hasChildren ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronRight
            size={11}
            className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

        {isExpanded ? (
          <FolderOpen size={13} className="shrink-0 text-accent-light" />
        ) : (
          <Folder size={13} className="shrink-0" />
        )}

        <span className="text-[12px] truncate">{node.name}</span>
      </div>

      {isExpanded && (
        <div className="tree-line" style={{ marginLeft: `${depth * 14 + 14}px` }}>
          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-1.5 text-[11px] text-neutral-500">
              <Loader2 size={12} className="animate-spin shrink-0" />
              Loading...
            </div>
          ) : node.children ? (
            <>
              {node.children.map((child) => (
                <FolderTree
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  onExpand={onExpand}
                />
              ))}
              {node.children.length === 0 && (
                <div className="text-[11px] text-neutral-500 px-6 py-1 italic">
                  Empty
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
