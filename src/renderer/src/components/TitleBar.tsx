import { useState, useEffect, useRef, useCallback } from 'react'
import { Minus, Square, X, Search, Film, Settings, Filter } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { SECTION_CONFIG } from '../types'
import type { SearchFilterCategory, SearchFilterModified, SearchFilterSize } from '../types'
import { SEARCH_DEBOUNCE_MS } from '../constants'

export default function TitleBar() {
  const searchQuery = useFileStore((s) => s.searchQuery)
  const setSearchQuery = useFileStore((s) => s.setSearchQuery)
  const isSearching = useFileStore((s) => s.isSearching)
  const setSettingsOpen = useFileStore((s) => s.setSettingsOpen)
  const activeSection = useFileStore((s) => s.activeSection)
  const searchFilters = useFileStore((s) => s.searchFilters)
  const setSearchFilters = useFileStore((s) => s.setSearchFilters)
  const [isMaximized, setIsMaximized] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value)
        debounceRef.current = null
      }, SEARCH_DEBOUNCE_MS)
    },
    [setSearchQuery]
  )

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = null
    setLocalQuery('')
    setSearchQuery('')
  }, [setSearchQuery])

  useEffect(() => {
    const check = async () => {
      const max = await window.api.isMaximized()
      setIsMaximized(max)
    }
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [])

  // Ctrl+F focuses search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const categoryOptions: { value: SearchFilterCategory; label: string }[] = [
    { value: 'all', label: 'All types' },
    { value: 'folder', label: 'Folders only' },
    { value: 'image', label: 'Images only' },
    { value: 'video', label: 'Videos only' },
    { value: 'audio', label: 'Audio only' },
    { value: 'document', label: 'Documents only' }
  ]
  const modifiedOptions: { value: SearchFilterModified; label: string }[] = [
    { value: 'any', label: 'Any time' },
    { value: 'today', label: 'Modified today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'year', label: 'Last year' }
  ]
  const sizeOptions: { value: SearchFilterSize; label: string }[] = [
    { value: 'any', label: 'Any size' },
    { value: '1mb', label: '> 1 MB' },
    { value: '10mb', label: '> 10 MB' },
    { value: '100mb', label: '> 100 MB' }
  ]
  const hasActiveFilters = searchFilters.category !== 'all' || searchFilters.modified !== 'any' || searchFilters.sizeMin !== 'any'

  return (
    <div className="title-bar drag-region h-11 flex items-center bg-surface-50 border-b border-surface-500/30 shrink-0">
      {/* App title */}
      <div className="flex items-center gap-2.5 px-4 min-w-[220px]">
        <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <Film size={12} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold text-neutral-100 tracking-tight title-bar-text">
          Media Manager
        </span>
      </div>

      {/* Search bar + Filter — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-1">
        <div className="no-drag flex items-center gap-2 w-full max-w-lg">
          <div className="relative flex-1">
            <Search
              size={14}
              className="title-bar-icon absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={isSearching ? 'Indexing files...' : `Search in ${SECTION_CONFIG[activeSection].label}... (Ctrl+F)`}
              className="title-bar-search w-full h-8 pl-8 pr-3 bg-surface-300 border border-surface-500/50 rounded-md
                         text-[13px] text-neutral-100 placeholder-neutral-500
                         focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                         transition-colors"
            />
            {localQuery && (
              <button
                onClick={handleClearSearch}
                className="title-bar-icon absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={`title-bar-icon h-8 px-2.5 flex items-center gap-1.5 rounded-md border transition-colors
                ${hasActiveFilters ? 'bg-accent/15 border-accent/40 text-accent-light' : 'bg-surface-300 border-surface-500/50 text-neutral-400 hover:text-neutral-200'}`}
              title="Filter results by type, date, size"
              aria-label="Filter"
              aria-expanded={filterOpen}
            >
              <Filter size={14} />
              <span className="text-[12px]">Filter</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent-light" />}
            </button>
            {filterOpen && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-surface-300 border border-surface-500/40 rounded-lg shadow-xl shadow-black/40 py-2 z-[100] animate-scale-in">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Type</div>
                <div className="flex flex-wrap gap-1 px-2">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSearchFilters({ category: opt.value })}
                      className={`px-2 py-1 rounded text-[11px] transition-colors
                        ${searchFilters.category === opt.value ? 'bg-accent/20 text-accent-light' : 'text-neutral-300 hover:bg-surface-500/40'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-surface-500/25 my-2" />
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Modified</div>
                <div className="px-2 space-y-0.5">
                  {modifiedOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSearchFilters({ modified: opt.value })}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors
                        ${searchFilters.modified === opt.value ? 'bg-accent/20 text-accent-light' : 'text-neutral-300 hover:bg-surface-500/40'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-surface-500/25 my-2" />
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Min size</div>
                <div className="px-2 space-y-0.5">
                  {sizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSearchFilters({ sizeMin: opt.value })}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors
                        ${searchFilters.sizeMin === opt.value ? 'bg-accent/20 text-accent-light' : 'text-neutral-300 hover:bg-surface-500/40'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {isSearching && (
          <span className="title-bar-indexing text-[11px] text-neutral-500 self-center" role="status">
            Indexing your library so search stays fast
          </span>
        )}
      </div>

      {/* Settings */}
      <div className="no-drag mr-1">
        <button
          onClick={() => setSettingsOpen(true)}
          className="title-bar-icon w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center">
        <button
          onClick={() => window.api.minimizeWindow()}
          className="title-bar-icon h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-surface-400/40 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={async () => {
            await window.api.maximizeWindow()
            setIsMaximized(!isMaximized)
          }}
          className="title-bar-icon h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-surface-400/40 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.closeWindow()}
          className="title-bar-icon title-bar-close h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-red-500/80 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
