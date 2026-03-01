import { useState, useEffect, useRef, useCallback } from 'react'
import { Minus, Square, X, Search, Film, Settings } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { SECTION_CONFIG } from '../types'

const SEARCH_DEBOUNCE_MS = 200

export default function TitleBar() {
  const searchQuery = useFileStore((s) => s.searchQuery)
  const setSearchQuery = useFileStore((s) => s.setSearchQuery)
  const isSearching = useFileStore((s) => s.isSearching)
  const setSettingsOpen = useFileStore((s) => s.setSettingsOpen)
  const activeSection = useFileStore((s) => s.activeSection)
  const [isMaximized, setIsMaximized] = useState(false)
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

  return (
    <div className="drag-region h-11 flex items-center bg-surface-50 border-b border-surface-500/30 shrink-0">
      {/* App title */}
      <div className="flex items-center gap-2.5 px-4 min-w-[220px]">
        <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <Film size={12} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold text-neutral-100 tracking-tight">
          Media Manager
        </span>
      </div>

      {/* Search bar — centered */}
      <div className="flex-1 flex justify-center px-4">
        <div className="no-drag relative w-full max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={isSearching ? 'Indexing files...' : `Search in ${SECTION_CONFIG[activeSection].label}... (Ctrl+F)`}
            className="w-full h-8 pl-8 pr-3 bg-surface-300 border border-surface-500/50 rounded-md
                       text-[13px] text-neutral-100 placeholder-neutral-500
                       focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                       transition-colors"
          />
          {localQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="no-drag mr-1">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
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
          className="h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-surface-400/40 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={async () => {
            await window.api.maximizeWindow()
            setIsMaximized(!isMaximized)
          }}
          className="h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-surface-400/40 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.closeWindow()}
          className="h-11 w-12 flex items-center justify-center text-neutral-500 hover:bg-red-500/80 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
