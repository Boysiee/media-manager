import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  ArrowUpDown,
  FolderPlus,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Sun,
  Moon,
  Wrench
} from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import type { SortField, ListColumnId } from '../types'
import { LIST_COLUMN_LABELS } from '../types'
import { FAVORITES_PATH } from '../constants'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date modified' },
  { value: 'created', label: 'Date created' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
  { value: 'path', label: 'Path' },
  { value: 'duration', label: 'Duration' },
  { value: 'random', label: 'Random' }
]

export default function Toolbar() {
  const currentPath = useFileStore((s) => s.currentPath)
  const sectionRoot = useFileStore((s) => s.sectionRoot)
  const historyIndex = useFileStore((s) => s.historyIndex)
  const pathHistory = useFileStore((s) => s.pathHistory)
  const viewMode = useFileStore((s) => s.viewMode)
  const sortField = useFileStore((s) => s.sortField)
  const sortOrder = useFileStore((s) => s.sortOrder)
  const isPreviewOpen = useFileStore((s) => s.isPreviewOpen)

  const goBack = useFileStore((s) => s.goBack)
  const goForward = useFileStore((s) => s.goForward)
  const goUp = useFileStore((s) => s.goUp)
  const navigateTo = useFileStore((s) => s.navigateTo)
  const setViewMode = useFileStore((s) => s.setViewMode)
  const setSortField = useFileStore((s) => s.setSortField)
  const toggleSortOrder = useFileStore((s) => s.toggleSortOrder)
  const togglePreview = useFileStore((s) => s.togglePreview)
  const createFolder = useFileStore((s) => s.createFolder)
  const refresh = useFileStore((s) => s.refresh)
  const gridSize = useFileStore((s) => s.gridSize)
  const setGridSize = useFileStore((s) => s.setGridSize)
  const listColumns = useFileStore((s) => s.listColumns)
  const setListColumns = useFileStore((s) => s.setListColumns)
  const theme = useFileStore((s) => s.theme)
  const setTheme = useFileStore((s) => s.setTheme)
  const setDuplicatesDialogOpen = useFileStore((s) => s.setDuplicatesDialogOpen)
  const setMisplacedDialogOpen = useFileStore((s) => s.setMisplacedDialogOpen)

  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [gridSizeOpen, setGridSizeOpen] = useState(false)
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const gridSizeRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gridSizeOpen) return
    const handler = (e: MouseEvent) => {
      if (gridSizeRef.current && !gridSizeRef.current.contains(e.target as Node)) {
        setGridSizeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [gridSizeOpen])
  const sortRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!sortDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (!columnsDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [columnsDropdownOpen])

  useEffect(() => {
    if (!toolsOpen) return
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [toolsOpen])

  const ALL_LIST_COLUMNS: ListColumnId[] = ['name', 'size', 'type', 'modified', 'duration']
  const toggleListColumn = (id: ListColumnId) => {
    if (listColumns.includes(id)) {
      if (listColumns.length <= 1) return
      setListColumns(listColumns.filter((c) => c !== id))
    } else {
      const order = ALL_LIST_COLUMNS.filter((c) => listColumns.includes(c) || c === id)
      setListColumns(order)
    }
  }

  // Breadcrumbs
  const breadcrumbs: { label: string; path: string }[] = []
  if (currentPath === FAVORITES_PATH && sectionRoot) {
    breadcrumbs.push({ label: 'Root', path: sectionRoot })
    breadcrumbs.push({ label: 'Favorites', path: FAVORITES_PATH })
  } else if (currentPath && sectionRoot) {
    const relative = currentPath.slice(sectionRoot.length)
    const parts = relative.split(/[\\/]/).filter(Boolean)
    let accumulated = sectionRoot
    breadcrumbs.push({ label: 'Root', path: sectionRoot })
    for (const part of parts) {
      accumulated += '\\' + part
      breadcrumbs.push({ label: part, path: accumulated })
    }
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < pathHistory.length - 1
  const canGoUp = currentPath !== sectionRoot && (currentPath === FAVORITES_PATH || currentPath.length > sectionRoot.length)

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Sort'

  return (
    <div className="toolbar h-10 flex items-center gap-1 px-3 bg-surface-200/50 border-b border-surface-500/20 shrink-0">
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5 mr-2">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400
                     enabled:hover:bg-surface-400/40 enabled:hover:text-neutral-200
                     disabled:opacity-30 transition-colors"
          title="Back (Alt+Left)"
          aria-label="Back"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400
                     enabled:hover:bg-surface-400/40 enabled:hover:text-neutral-200
                     disabled:opacity-30 transition-colors"
          title="Forward (Alt+Right)"
          aria-label="Forward"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={goUp}
          disabled={!canGoUp}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400
                     enabled:hover:bg-surface-400/40 enabled:hover:text-neutral-200
                     disabled:opacity-30 transition-colors"
          title="Up (Alt+Up)"
          aria-label="Up one folder"
        >
          <ChevronUp size={15} />
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.path} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight size={11} className="text-neutral-700" />}
            <button
              onClick={() => navigateTo(crumb.path)}
              className={`px-1.5 py-0.5 rounded text-[12px] transition-colors
                ${i === breadcrumbs.length - 1
                  ? 'text-neutral-200 font-medium'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-400/30'
                }`}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => currentPath !== FAVORITES_PATH && createFolder('New Folder')}
          disabled={currentPath === FAVORITES_PATH}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500
                     hover:bg-surface-400/40 hover:text-neutral-200 transition-colors
                     disabled:opacity-40 disabled:pointer-events-none"
          title={currentPath === FAVORITES_PATH ? 'Not available in Favorites' : 'New Folder (Ctrl+Shift+N)'}
          aria-label="New folder"
        >
          <FolderPlus size={14} />
        </button>

        <button
          onClick={refresh}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500
                     hover:bg-surface-400/40 hover:text-neutral-200 transition-colors"
          title="Refresh (F5)"
          aria-label="Refresh"
        >
          <RefreshCw size={13} />
        </button>

        {/* Tools menu */}
        <div ref={toolsRef} className="relative">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500
                       hover:bg-surface-400/40 hover:text-neutral-200 transition-colors"
            title="Tools"
            aria-label="Tools"
            aria-expanded={toolsOpen}
            aria-haspopup="true"
          >
            <Wrench size={14} />
          </button>
          {toolsOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface-300 border border-surface-500/40 rounded-lg shadow-xl shadow-black/40 py-1 z-50 animate-scale-in">
              <button
                onClick={() => {
                  setDuplicatesDialogOpen(true)
                  setToolsOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-neutral-300 hover:bg-surface-500/40 hover:text-neutral-100 transition-colors"
              >
                Find duplicates…
              </button>
              <button
                onClick={() => {
                  setMisplacedDialogOpen(true)
                  setToolsOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-neutral-300 hover:bg-surface-500/40 hover:text-neutral-100 transition-colors"
              >
                Find misplaced files…
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-surface-500/30 mx-1" />

        {/* Custom sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className={`h-7 px-2.5 flex items-center gap-1.5 bg-surface-300 border border-surface-500/30
                       text-[12px] text-neutral-400 hover:bg-surface-400/60 hover:text-neutral-300 transition-colors
                       ${sortField === 'random' ? 'rounded-md' : 'rounded-l-md'}`}
            title="Sort by"
            aria-label="Sort by"
          >
            {currentSortLabel}
            <ChevronDown size={10} className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-surface-300 border border-surface-500/40 rounded-lg shadow-xl shadow-black/40 py-1 z-50 animate-scale-in">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortField(opt.value)
                    setSortDropdownOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px]
                             text-neutral-300 hover:bg-surface-500/40 transition-colors"
                >
                  <span>{opt.label}</span>
                  {sortField === opt.value && <Check size={11} className="text-accent-light" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {sortField !== 'random' && (
          <button
            onClick={toggleSortOrder}
            className="h-7 w-7 flex items-center justify-center bg-surface-300 border border-l-0
                       border-surface-500/30 rounded-r-md text-neutral-500
                       hover:bg-surface-400/60 hover:text-neutral-300 transition-colors"
            title={sortOrder === 'asc' ? 'Toggle sort order — Ascending (A→Z, oldest first)' : 'Toggle sort order — Descending (Z→A, newest first)'}
            aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            <ArrowUpDown size={12} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
          </button>
        )}

        <div className="w-px h-5 bg-surface-500/30 mx-1" />

        {/* Grid size (when in grid view) */}
        {viewMode === 'grid' && (
          <div ref={gridSizeRef} className="relative">
            <button
              onClick={() => setGridSizeOpen(!gridSizeOpen)}
              className="h-7 px-2.5 flex items-center gap-1 bg-surface-300 border border-surface-500/30 rounded-md
                         text-[11px] text-neutral-400 hover:bg-surface-400/60 hover:text-neutral-300 transition-colors"
              title="Thumbnail size"
              aria-label="Grid size"
            >
              {gridSize === 'small' ? 'S' : gridSize === 'large' ? 'L' : 'M'}
            </button>
            {gridSizeOpen && (
              <div className="absolute top-full right-0 mt-1 w-24 bg-surface-300 border border-surface-500/40 rounded-lg shadow-xl shadow-black/40 py-1 z-50 animate-scale-in">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setGridSize(size)
                      setGridSizeOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px]
                               text-neutral-300 hover:bg-surface-500/40 transition-colors"
                  >
                    <span>{size === 'small' ? 'Small' : size === 'large' ? 'Large' : 'Medium'}</span>
                    {gridSize === size && <Check size={11} className="text-accent-light" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List columns (when in list view) */}
        {viewMode === 'list' && (
          <div ref={columnsRef} className="relative">
            <button
              onClick={() => setColumnsDropdownOpen(!columnsDropdownOpen)}
              className="h-7 px-2.5 flex items-center gap-1 bg-surface-300 border border-surface-500/30 rounded-md
                         text-[11px] text-neutral-400 hover:bg-surface-400/60 hover:text-neutral-300 transition-colors"
              title="Choose columns"
              aria-label="List columns"
            >
              Columns
              <ChevronDown size={10} className={columnsDropdownOpen ? 'rotate-180' : ''} />
            </button>
            {columnsDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface-300 border border-surface-500/40 rounded-lg shadow-xl shadow-black/40 py-1 z-50 animate-scale-in">
                {ALL_LIST_COLUMNS.map((id) => (
                  <button
                    key={id}
                    onClick={() => toggleListColumn(id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px]
                               text-neutral-300 hover:bg-surface-500/40 transition-colors"
                  >
                    <span>{LIST_COLUMN_LABELS[id]}</span>
                    {listColumns.includes(id) && <Check size={11} className="text-accent-light" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-5 bg-surface-500/30 mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500
                     hover:bg-surface-400/40 hover:text-neutral-200 transition-colors"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="w-px h-5 bg-surface-500/30 mx-1" />

        {/* View mode */}
        <div className="flex items-center bg-surface-300 rounded-md border border-surface-500/30">
          <button
            onClick={() => setViewMode('grid')}
            className={`h-7 w-7 flex items-center justify-center rounded-l-md transition-colors
              ${viewMode === 'grid' ? 'bg-accent/20 text-accent-light' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`h-7 w-7 flex items-center justify-center rounded-r-md transition-colors
              ${viewMode === 'list' ? 'bg-accent/20 text-accent-light' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="List view"
            aria-label="List view"
          >
            <List size={13} />
          </button>
        </div>

        <button
          onClick={togglePreview}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors
            ${isPreviewOpen ? 'text-accent-light bg-accent/10' : 'text-neutral-500 hover:bg-surface-400/40 hover:text-neutral-200'}`}
          title="Toggle preview panel (Ctrl+P)"
          aria-label="Toggle preview panel"
        >
          {isPreviewOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        </button>
      </div>
    </div>
  )
}
