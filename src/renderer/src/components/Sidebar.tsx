import { Image, Film, Music, FileText, FolderPlus } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { SECTION_CONFIG, type MediaSection } from '../types'
import FolderTree from './FolderTree'

const SECTION_ICONS: Record<MediaSection, typeof Image> = {
  images: Image,
  videos: Film,
  audio: Music,
  documents: FileText
}

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

  return (
    <div className="w-[220px] min-w-[220px] bg-surface-50 border-r border-surface-500/30 flex flex-col">
      {/* Section navigation */}
      <div className="p-3 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 px-2 mb-2">
          Sections
        </div>
        {(Object.keys(SECTION_CONFIG) as MediaSection[]).map((section) => {
          const config = SECTION_CONFIG[section]
          const Icon = SECTION_ICONS[section]
          const isActive = activeSection === section

          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group
                ${isActive
                  ? 'bg-accent/15 text-neutral-100'
                  : 'text-neutral-400 hover:bg-surface-300/50 hover:text-neutral-200'
                }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  isActive ? 'bg-accent/20' : 'bg-surface-400/40 group-hover:bg-surface-400/60'
                }`}
              >
                <Icon
                  size={14}
                  style={{ color: isActive ? config.color : undefined }}
                  className={isActive ? '' : 'text-neutral-500'}
                />
              </div>
              <span className="text-[13px] font-medium">
                {config.label}
                {activeSection === section && (
                  <span className="text-neutral-500 font-normal ml-1">
                    ({searchIndex.length.toLocaleString()})
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

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

        {/* Root entry */}
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

        {/* Tree */}
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
    </div>
  )
}
