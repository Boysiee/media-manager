import {
  ExternalLink,
  FolderOpen,
  Pencil,
  Move,
  Trash2,
  FolderPlus,
  Copy,
  CheckSquare
} from 'lucide-react'
import { useFileStore } from '../stores/fileStore'

export default function ContextMenu() {
  const contextMenu = useFileStore((s) => s.contextMenu)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const setContextMenu = useFileStore((s) => s.setContextMenu)
  const setRenamingPath = useFileStore((s) => s.setRenamingPath)
  const setMoveDialogOpen = useFileStore((s) => s.setMoveDialogOpen)
  const openFile = useFileStore((s) => s.openFile)
  const openInExplorer = useFileStore((s) => s.openInExplorer)
  const trashSelected = useFileStore((s) => s.trashSelected)
  const createFolder = useFileStore((s) => s.createFolder)
  const selectAll = useFileStore((s) => s.selectAll)
  const previewFile = useFileStore((s) => s.previewFile)
  const addNotification = useFileStore((s) => s.addNotification)

  if (!contextMenu) return null

  const hasSelection = selectedFiles.size > 0
  const singleSelection = selectedFiles.size === 1
  const selectedPath = singleSelection ? Array.from(selectedFiles)[0] : null

  const close = () => setContextMenu(null)

  const action = (fn: () => void) => {
    fn()
    close()
  }

  // Position the menu, keeping it on screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(contextMenu.x, window.innerWidth - 200),
    top: Math.min(contextMenu.y, window.innerHeight - 300),
    zIndex: 101
  }

  return (
    <div
      style={style}
      className="w-[200px] bg-surface-300 border border-surface-500/40 rounded-lg shadow-2xl shadow-black/40 py-1 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection ? (
        <>
          {/* File-specific actions */}
          {singleSelection && previewFile && !previewFile.isDirectory && (
            <MenuItem
              icon={<ExternalLink size={13} />}
              label="Open"
              shortcut="Enter"
              onClick={() => action(() => openFile(previewFile.path))}
            />
          )}

          {singleSelection && selectedPath && (
            <MenuItem
              icon={<FolderOpen size={13} />}
              label="Show in Explorer"
              onClick={() => action(() => openInExplorer(selectedPath))}
            />
          )}

          {hasSelection && <Divider />}

          {singleSelection && selectedPath && (
            <MenuItem
              icon={<Pencil size={13} />}
              label="Rename"
              shortcut="F2"
              onClick={() => action(() => setRenamingPath(selectedPath))}
            />
          )}

          {!singleSelection && selectedFiles.size > 0 && (
            <MenuItem
              icon={<Pencil size={13} />}
              label={`Rename ${selectedFiles.size} items…`}
              onClick={() => action(() => useFileStore.getState().setBatchRenameOpen(true))}
            />
          )}

          <MenuItem
            icon={<Move size={13} />}
            label={`Move ${selectedFiles.size > 1 ? `${selectedFiles.size} items` : ''} to...`}
            shortcut="M"
            title="Move selected items to another folder"
            onClick={() => action(() => setMoveDialogOpen(true, 'move'))}
          />

          <MenuItem
            icon={<Copy size={13} />}
            label={`Copy ${selectedFiles.size > 1 ? `${selectedFiles.size} items` : ''} to...`}
            title="Copy selected items to another folder"
            onClick={() => action(() => setMoveDialogOpen(true, 'copy'))}
          />

          {singleSelection && selectedPath && (
            <MenuItem
              icon={<Copy size={13} />}
              label="Copy Path"
              onClick={() =>
                action(() => {
                  navigator.clipboard.writeText(selectedPath)
                  addNotification('info', 'Path copied to clipboard')
                })
              }
            />
          )}

          <Divider />

          <MenuItem
            icon={<Trash2 size={13} />}
            label={`Recycle ${selectedFiles.size > 1 ? `${selectedFiles.size} items` : ''}`}
            shortcut="Del"
            title="Move selected items to Recycle Bin"
            danger
            onClick={() => action(trashSelected)}
          />
        </>
      ) : (
        <>
          {/* Background context menu (no selection) */}
          <MenuItem
            icon={<FolderPlus size={13} />}
            label="New Folder"
            shortcut="Ctrl+Shift+N"
            onClick={() => action(() => createFolder('New Folder'))}
          />

          <Divider />

          <MenuItem
            icon={<CheckSquare size={13} />}
            label="Select All"
            shortcut="Ctrl+A"
            onClick={() => action(selectAll)}
          />
        </>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  title?: string
  danger?: boolean
  onClick: () => void
}

function MenuItem({ icon, label, shortcut, title, danger, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors
        ${danger
          ? 'text-red-400/80 hover:bg-red-500/10 hover:text-red-400'
          : 'text-neutral-300 hover:bg-surface-500/40'
        }`}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="text-[12px] flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-neutral-600 shrink-0">{shortcut}</span>
      )}
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-surface-500/30" />
}
