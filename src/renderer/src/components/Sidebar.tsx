import { useRef, useCallback, useState, useEffect } from 'react'
import { Image, Film, Music, FileText, FolderPlus, ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { SECTION_CONFIG, type MediaSection } from '../types'
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, FAVORITES_PATH } from '../constants'
import FolderTree from './FolderTree'

const SECTION_ICONS: Record<MediaSection, typeof Image> = {
  images: Image,
  videos: Film,
  audio: Music,
  documents: FileText
}

const SIDEBAR_COLLAPSED_WIDTH = 56

export default function Sidebar() {
  const activeSection = useFileStore((s) => s.activeSection)
  const setActiveSection = useFileStore((s) => s.setActiveSection)
  const folderTree = useFileStore((s) => s.folderTree)
  const currentPath = useFileStore((s) => s.currentPath)
  const sectionRoot = useFileStore((s) => s.sectionRoot)
  const navigateTo = useFileStore((s) => s.navigateTo)
  const expandFolder = useFileStore((s) => s.expandFolder)
  const createFolder = useFileStore((s) => s.createFolder)
  const searchIndex = useFileStore((s) => s.searchIndex)
  const sidebarCollapsed = useFileStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useFileStore((s) => s.sidebarWidth)
  const setSidebarCollapsed = useFileStore((s) => s.setSidebarCollapsed)
  const setSidebarWidth = useFileStore((s) => s.setSidebarWidth)
  const recentPaths = useFileStore((s) => s.recentPaths)
  const favorites = useFileStore((s) => s.favorites)

  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = sidebarWidth
    },
    [sidebarWidth]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const delta = e.clientX - startXRef.current
      const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startWidthRef.current + delta))
      setSidebarWidth(next)
    },
    [isResizing, setSidebarWidth]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const width = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth
  const recentInSection = recentPaths.filter((p) => p.startsWith(sectionRoot) && p !== sectionRoot).slice(0, 8)

  return (
    <div
      className="app-sidebar flex shrink-0 flex-col bg-surface-50 border-r border-surface-500/30 relative transition-[width] duration-200 ease-out"
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {/* Collapse / expand toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-md text-neutral-500 hover:bg-surface-400/40 hover:text-neutral-200 transition-colors"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>

      {/* Section navigation */}
      <div className="p-3 pt-10 space-y-1">
        <div className={`font-semibold uppercase tracking-widest text-neutral-500 px-2 mb-2 ${sidebarCollapsed ? 'text-[9px] text-center px-0' : 'text-[10px]'}`}>
          {sidebarCollapsed ? '' : 'Sections'}
        </div>
        {(Object.keys(SECTION_CONFIG) as MediaSection[]).map((section) => {
          const config = SECTION_CONFIG[section]
          const Icon = SECTION_ICONS[section]
          const isActive = activeSection === section

          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full flex items-center rounded-lg text-left transition-all duration-150 group
                ${sidebarCollapsed ? 'justify-center gap-0 px-0 py-2' : 'gap-2.5 px-2.5 py-2'}
                ${isActive
                  ? 'bg-accent/15 text-neutral-100'
                  : 'text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200'
                }`}
              title={sidebarCollapsed ? config.label : undefined}
            >
              <div
                className={`rounded-md flex items-center justify-center transition-colors shrink-0 ${
                  isActive ? 'bg-accent/20' : 'bg-surface-400/40 group-hover:bg-surface-400/60'
                } ${sidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'}`}
              >
                <Icon
                  size={sidebarCollapsed ? 16 : 14}
                  style={{ color: isActive ? config.color : undefined }}
                  className={isActive ? '' : 'text-neutral-500'}
                />
              </div>
              {!sidebarCollapsed && (
                <span className="text-[13px] font-medium truncate">
                  {config.label}
                  {activeSection === section && (
                    <span className="text-neutral-500 font-normal ml-1">
                      ({searchIndex.length.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}

        {/* Favorites */}
        <button
          onClick={() => navigateTo(FAVORITES_PATH)}
          className={`w-full flex items-center rounded-lg text-left transition-all duration-150 group mt-1
            ${sidebarCollapsed ? 'justify-center gap-0 px-0 py-2' : 'gap-2.5 px-2.5 py-2'}
            ${currentPath === FAVORITES_PATH
              ? 'bg-accent/15 text-neutral-100'
              : 'text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200'
            }`}
          title={sidebarCollapsed ? 'Favorites' : undefined}
        >
          <div className={`rounded-md flex items-center justify-center transition-colors shrink-0 ${
            currentPath === FAVORITES_PATH ? 'bg-accent/20' : 'bg-surface-400/40 group-hover:bg-surface-400/60'
          } ${sidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'}`}>
            <Star
              size={sidebarCollapsed ? 16 : 14}
              className={currentPath === FAVORITES_PATH ? 'text-amber-400' : 'text-neutral-500'}
              fill={currentPath === FAVORITES_PATH ? 'currentColor' : 'none'}
            />
          </div>
          {!sidebarCollapsed && (
            <span className="text-[13px] font-medium truncate">
              Favorites
              <span className="text-neutral-500 font-normal ml-1">
                ({favorites.size})
              </span>
            </span>
          )}
        </button>
      </div>

      {!sidebarCollapsed && (
        <>
          {/* Recent paths */}
          {recentInSection.length > 0 && (
            <>
              <div className="mx-3 border-t border-surface-500/20" />
              <div className="py-2 px-2">
                <div className="flex items-center gap-1.5 px-2 mb-1.5">
                  <Clock size={12} className="text-neutral-500 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                    Recent
                  </span>
                </div>
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                  {recentInSection.map((path) => {
                    const name = path.split(/[\\/]/).filter(Boolean).pop() ?? path
                    const isActive = currentPath === path
                    return (
                      <button
                        key={path}
                        onClick={() => navigateTo(path)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] truncate transition-colors
                          ${isActive ? 'bg-accent/15 text-neutral-100' : 'text-neutral-400 hover:bg-surface-300/40 hover:text-neutral-200'}`}
                        title={path}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="mx-3 border-t border-surface-500/20" />

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto py-3 px-2 min-h-0">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Folders
              </span>
              <button
                onClick={() => createFolder('New Folder')}
                className="text-neutral-600 hover:text-accent transition-colors"
                title="New Folder (Ctrl+Shift+N)"
              >
                <FolderPlus size={13} />
              </button>
            </div>

            <button
              onClick={() => navigateTo(sectionRoot)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors mb-0.5
                ${currentPath === sectionRoot
                  ? 'bg-accent/15 text-neutral-100'
                  : 'text-neutral-400 hover:bg-surface-300/40 hover:text-neutral-200'
                }`}
            >
              <span className="text-[12px]">
                {SECTION_CONFIG[activeSection].label} Root
              </span>
            </button>

            <div className="ml-1">
              {folderTree.map((node) => (
                <FolderTree
                  key={node.path}
                  node={node}
                  depth={0}
                  currentPath={currentPath}
                  onNavigate={navigateTo}
                  onExpand={expandFolder}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Resize handle (only when expanded) */}
      {!sidebarCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-accent/20 transition-colors group"
          title="Drag to resize"
          aria-hidden
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-surface-500/40 group-hover:bg-accent/50 rounded-full transition-colors" />
        </div>
      )}
    </div>
  )
}
