import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useFileStore } from '../stores/fileStore'
import { getVisibleFilesFromState } from '../stores/fileStore'
import FileCard from './FileCard'
import FileListItem from './FileListItem'
import type { FileItem } from '../types'
import { LIST_COLUMN_LABELS, LIST_COLUMN_WIDTHS } from '../types'
import { FAVORITES_PATH } from '../constants'

const GRID_SIZES = {
  small: { minWidth: 100, gap: 10, textAreaHeight: 76 },
  medium: { minWidth: 150, gap: 14, textAreaHeight: 84 },
  large: { minWidth: 200, gap: 16, textAreaHeight: 92 }
} as const

/** Extra row height when showing search results (path line under filename) so cards stay uniform */
const SEARCH_EXTRA_ROW_HEIGHT = 20

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
  const gridSize = useFileStore((s) => s.gridSize)
  const searchFilters = useFileStore((s) => s.searchFilters)
  const listColumns = useFileStore((s) => s.listColumns)
  const favorites = useFileStore((s) => s.favorites)

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

  // Base file list: normal folder or Favorites (from search index)
  const baseFiles = useMemo(() => {
    if (currentPath === FAVORITES_PATH) {
      return searchIndex.filter((f) => favorites.has(f.path))
    }
    return files
  }, [currentPath, files, searchIndex, favorites])

  // Filter by search query + filters (category, modified, size)
  const displayFiles: FileItem[] = useMemo(
    () => getVisibleFilesFromState({ files: baseFiles, searchQuery, searchIndex: baseFiles, searchFilters }),
    [baseFiles, searchQuery, searchFilters]
  )

  const gridConfig = GRID_SIZES[gridSize]
  const columnCount = Math.max(1, Math.floor((containerWidth + gridConfig.gap) / (gridConfig.minWidth + gridConfig.gap)))
  const columnWidth = (containerWidth - gridConfig.gap * (columnCount - 1)) / columnCount
  /* Row height = square thumbnail (columnWidth) + padding + text + vertical gap so cards never overlap */
  const baseRowHeight = Math.max(gridConfig.minWidth + gridConfig.textAreaHeight, columnWidth + gridConfig.textAreaHeight)
  const gridRowHeight = searchQuery.trim()
    ? baseRowHeight + SEARCH_EXTRA_ROW_HEIGHT
    : baseRowHeight
  const rowCount = Math.ceil(displayFiles.length / columnCount)

  const gridVirtualizer = useVirtualizer({
    count: viewMode === 'grid' ? rowCount : displayFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'grid' ? gridRowHeight : LIST_ROW_HEIGHT),
    overscan: 5,
    gap: viewMode === 'grid' ? gridConfig.gap : 0
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
    const isPathError =
      loadError.includes('Path not allowed') ||
      loadError.includes('No folder path set') ||
      loadError.includes('does not exist') ||
      loadError.includes('Access denied')
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFiles(currentPath)}
              className="px-4 py-2 bg-accent/20 text-accent-light text-[13px] font-medium rounded-lg hover:bg-accent/30 transition-colors"
            >
              Retry
            </button>
            {isPathError && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-surface-400/60 text-neutral-200 text-[13px] font-medium rounded-lg hover:bg-surface-500/60 transition-colors"
              >
                Open Settings
              </button>
            )}
          </div>
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
            {currentPath === FAVORITES_PATH ? '⭐' : searchQuery ? '🔍' : '📁'}
          </span>
          <span className="text-[13px] text-neutral-300">
            {currentPath === FAVORITES_PATH && !searchQuery
              ? 'No favorites yet'
              : searchQuery
                ? 'No files match your search'
                : 'This folder is empty'}
          </span>
          {searchQuery && (
            <span className="text-[12px] text-neutral-500">
              Try a different name or clear search
            </span>
          )}
          {!searchQuery && currentPath !== FAVORITES_PATH && (
            <span className="text-[12px] text-neutral-500">
              Press Ctrl+Shift+N to create a folder
            </span>
          )}
          {!searchQuery && currentPath === FAVORITES_PATH && (
            <span className="text-[12px] text-neutral-500">
              Star items in the grid to add them here
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
                  gridTemplateRows: '1fr',
                  gap: gridConfig.gap,
                  alignItems: 'stretch',
                  minHeight: 0
                }}
              >
                {rowFiles.map((file) => (
                  <FileCard
                    key={file.path}
                    file={file}
                    isSelected={selectedFiles.has(file.path)}
                    isSearchResult={!!searchQuery}
                    currentPath={currentPath}
                    gridSize={gridSize}
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
          {/* List header — columns from listColumns */}
          <div
            className="grid gap-4 px-3 h-9 items-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-surface-500/40 sticky top-0 bg-surface-300/90 backdrop-blur-sm z-10"
            style={{ gridTemplateColumns: listColumns.map((id) => LIST_COLUMN_WIDTHS[id]).join(' ') }}
          >
            {listColumns.map((id) => (
              <span key={id}>{LIST_COLUMN_LABELS[id]}</span>
            ))}
          </div>

          {gridVirtualizer.getVirtualItems().map((virtualRow) => {
            const file = displayFiles[virtualRow.index]
            if (!file) return null

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: virtualRow.start + 36,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size
                }}
                className={virtualRow.index % 2 === 1 ? 'bg-surface-300/20' : ''}
              >
                <FileListItem
                  file={file}
                  listColumns={listColumns}
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
