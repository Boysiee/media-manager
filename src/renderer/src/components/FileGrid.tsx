import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFileStore } from '../stores/fileStore'
import FileCard from './FileCard'
import FileListItem from './FileListItem'
import type { FileItem } from '../types'

const CARD_MIN_WIDTH = 150
const CARD_HEIGHT = 230
const GAP = 12
const LIST_ROW_HEIGHT = 40

export default function FileGrid() {
  const files = useFileStore((s) => s.files)
  const viewMode = useFileStore((s) => s.viewMode)
  const searchQuery = useFileStore((s) => s.searchQuery)
  const searchIndex = useFileStore((s) => s.searchIndex)
  const currentPath = useFileStore((s) => s.currentPath)
  const isLoading = useFileStore((s) => s.isLoading)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const selectFile = useFileStore((s) => s.selectFile)
  const navigateTo = useFileStore((s) => s.navigateTo)
  const setContextMenu = useFileStore((s) => s.setContextMenu)
  const clearSelection = useFileStore((s) => s.clearSelection)
  const openFile = useFileStore((s) => s.openFile)
  const sectionPathMissing = useFileStore((s) => s.sectionPathMissing)
  const activeSection = useFileStore((s) => s.activeSection)
  const setSettingsOpen = useFileStore((s) => s.setSettingsOpen)
  const loadError = useFileStore((s) => s.loadError)
  const loadFiles = useFileStore((s) => s.loadFiles)
  const currentPath = useFileStore((s) => s.currentPath)

  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Measure container width
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Filter by search
  const displayFiles: FileItem[] = useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return searchIndex.filter((f) => f.name.toLowerCase().includes(query))
  }, [files, searchQuery, searchIndex])

  // Grid calculations
  const columnCount = Math.max(1, Math.floor((containerWidth + GAP) / (CARD_MIN_WIDTH + GAP)))
  const rowCount = Math.ceil(displayFiles.length / columnCount)

  // Virtualizer for grid
  const gridVirtualizer = useVirtualizer({
    count: viewMode === 'grid' ? rowCount : displayFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'grid' ? CARD_HEIGHT + GAP : LIST_ROW_HEIGHT),
    overscan: 5,
    gap: viewMode === 'grid' ? GAP : 0
  })

  const handleClick = useCallback(
    (file: FileItem, e: React.MouseEvent) => {
      if (e.shiftKey) {
        selectFile(file.path, 'range')
      } else if (e.ctrlKey || e.metaKey) {
        selectFile(file.path, 'toggle')
      } else {
        selectFile(file.path, 'single')
      }
    },
    [selectFile]
  )

  const handleDoubleClick = useCallback(
    (file: FileItem) => {
      if (file.isDirectory) {
        navigateTo(file.path)
      } else {
        openFile(file.path)
      }
    },
    [navigateTo, openFile]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileItem) => {
      e.preventDefault()
      e.stopPropagation()
      if (!selectedFiles.has(file.path)) {
        selectFile(file.path, 'single')
      }
      setContextMenu({ x: e.clientX, y: e.clientY })
    },
    [selectedFiles, selectFile, setContextMenu]
  )

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      clearSelection()
      setContextMenu({ x: e.clientX, y: e.clientY })
    },
    [clearSelection, setContextMenu]
  )

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.gridBg) {
        clearSelection()
      }
    },
    [clearSelection]
  )

  if (sectionPathMissing === activeSection) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <span className="text-4xl opacity-50">📁</span>
          <p className="text-[14px] text-neutral-300">
            Path not found
          </p>
          <p className="text-[12px] text-neutral-500">
            The folder for this section doesn&apos;t exist or isn&apos;t available. Choose a folder in Settings.
          </p>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 py-2 bg-accent/20 text-accent-light text-[13px] font-medium rounded-lg hover:bg-accent/30 transition-colors"
          >
            Open Settings
          </button>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <span className="text-4xl opacity-50">⚠</span>
          <p className="text-[14px] text-neutral-300">
            Unable to load folder
          </p>
          <p className="text-[12px] text-neutral-500">
            {loadError}
          </p>
          <button
            onClick={() => loadFiles(currentPath)}
            className="px-4 py-2 bg-accent/20 text-accent-light text-[13px] font-medium rounded-lg hover:bg-accent/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-[13px] text-neutral-400">Loading files...</span>
        </div>
      </div>
    )
  }

  if (displayFiles.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        onContextMenu={handleBackgroundContextMenu}
        onClick={() => clearSelection()}
      >
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <span className="text-4xl opacity-40">
            {searchQuery ? '🔍' : '📁'}
          </span>
          <span className="text-[14px] text-neutral-300">
            {searchQuery ? 'No files match your search' : 'This folder is empty'}
          </span>
          {searchQuery && (
            <span className="text-[12px] text-neutral-500">
              Try a different name or clear search
            </span>
          )}
          {!searchQuery && (
            <span className="text-[12px] text-neutral-500">
              Press Ctrl+Shift+N to create a folder
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0"
      onContextMenu={handleBackgroundContextMenu}
      onClick={handleBackgroundClick}
    >
      {searchQuery && (
        <div className="mb-3 px-1">
          <span className="text-[12px] text-neutral-400">
            {displayFiles.length} result{displayFiles.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </span>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div
          data-grid-bg="true"
          style={{
            height: gridVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative'
          }}
        >
          {gridVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * columnCount
            const rowFiles = displayFiles.slice(startIdx, startIdx + columnCount)

            return (
              <div
                key={virtualRow.key}
                data-grid-bg="true"
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gap: GAP
                }}
              >
                {rowFiles.map((file) => (
                  <FileCard
                    key={file.path}
                    file={file}
                    isSelected={selectedFiles.has(file.path)}
                    isSearchResult={!!searchQuery}
                    currentPath={currentPath}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            height: gridVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative'
          }}
        >
          {/* List header */}
          <div className="grid grid-cols-[1fr_100px_100px_140px_80px] gap-4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-surface-500/20 sticky top-0 bg-surface-200/80 backdrop-blur-sm z-10">
            <span>Name</span>
            <span>Size</span>
            <span>Type</span>
            <span>Modified</span>
            <span>Duration</span>
          </div>

          {gridVirtualizer.getVirtualItems().map((virtualRow) => {
            const file = displayFiles[virtualRow.index]
            if (!file) return null

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: virtualRow.start + 30,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size
                }}
              >
                <FileListItem
                  file={file}
                  isSelected={selectedFiles.has(file.path)}
                  isSearchResult={!!searchQuery}
                  currentPath={currentPath}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
