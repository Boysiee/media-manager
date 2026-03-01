import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Folder, FolderOpen, ChevronRight, FolderPlus } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import type { FolderNode } from '../types'

interface MoveDialogProps {
  mode: 'move' | 'copy'
}

export default function MoveDialog({ mode }: MoveDialogProps) {
  const sectionRoot = useFileStore((s) => s.sectionRoot)
  const currentPath = useFileStore((s) => s.currentPath)
  const selectedFiles = useFileStore((s) => s.selectedFiles)
  const setMoveDialogOpen = useFileStore((s) => s.setMoveDialogOpen)
  const moveSelectedFiles = useFileStore((s) => s.moveSelectedFiles)
  const copySelectedFiles = useFileStore((s) => s.copySelectedFiles)
  const activeSection = useFileStore((s) => s.activeSection)
  const addNotification = useFileStore((s) => s.addNotification)

  const [tree, setTree] = useState<FolderNode[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(sectionRoot)
  const [isMoving, setIsMoving] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // Focus first focusable when dialog opens
  useEffect(() => {
    const t = setTimeout(() => firstFocusableRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  // Load initial tree
  useEffect(() => {
    async function load() {
      const children = await window.api.getFolderChildren(sectionRoot)
      setTree(children)
    }
    load()
  }, [sectionRoot])

  const selectedPaths = Array.from(selectedFiles)
  const norm = (s: string) => s.replace(/\\/g, '/')
  const parentOf = (p: string) => p.replace(/[\\/][^\\/]+$/, '')
  const isSameFolder =
    selectedFolder === currentPath &&
    selectedPaths.length > 0 &&
    selectedPaths.every((p) => norm(parentOf(p)) === norm(currentPath))

  const handleConfirm = useCallback(async () => {
    if (!selectedFolder) return
    setIsMoving(true)
    if (mode === 'move') {
      await moveSelectedFiles(selectedFolder)
    } else {
      await copySelectedFiles(selectedFolder)
    }
    setIsMoving(false)
    setMoveDialogOpen(false)
  }, [selectedFolder, mode, moveSelectedFiles, copySelectedFiles, setMoveDialogOpen])

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim()
    if (!name) return
    const parent = selectedFolder ?? sectionRoot
    try {
      await window.api.createFolder(parent, name)
      addNotification('success', `Created "${name}"`)
      // Refresh tree so the new folder appears: refresh from sectionRoot and, if parent is not root, refresh that parent's children in the tree
      const children = await window.api.getFolderChildren(sectionRoot)
      setTree(children)
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (err) {
      addNotification(
        'error',
        err instanceof Error ? err.message : 'Failed to create folder'
      )
    }
  }, [newFolderName, selectedFolder, sectionRoot, addNotification])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div
        className="relative w-[420px] max-h-[500px] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {isMoving && (
          <div
            className="absolute inset-0 rounded-xl bg-surface-900/60 flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-200">
              {mode === 'move' ? 'Move' : 'Copy'} {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
            </h2>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Choose a destination folder in {activeSection}
            </p>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={() => setMoveDialogOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Folder tree */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[200px]">
          {/* Root option */}
          <FolderOption
            label={`${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Root`}
            path={sectionRoot}
            isSelected={selectedFolder === sectionRoot}
            onSelect={setSelectedFolder}
            depth={0}
          />

          {/* Tree */}
          {tree.map((node) => (
            <MoveTreeNode
              key={node.path}
              node={node}
              depth={1}
              selectedFolder={selectedFolder}
              onSelect={setSelectedFolder}
            />
          ))}
        </div>

        {/* New folder */}
        <div className="px-4 pb-3">
          {showNewFolder ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') setShowNewFolder(false)
                }}
                className="flex-1 h-8 px-3 bg-surface-300 border border-surface-500/40 rounded-md
                           text-[12px] text-neutral-300 placeholder-neutral-600
                           focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={handleCreateFolder}
                className="h-8 px-3 bg-accent/20 text-accent-light text-[12px] rounded-md
                           hover:bg-accent/30 transition-colors"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 text-[12px] text-neutral-500 hover:text-accent transition-colors"
            >
              <FolderPlus size={13} />
              New folder in selected directory
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-surface-500/20">
          {isSameFolder && mode === 'move' && (
            <p className="text-[11px] text-neutral-500">Already in this folder</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setMoveDialogOpen(false)}
              className="h-8 px-4 text-[12px] text-neutral-400 hover:text-neutral-200 rounded-md
                         hover:bg-surface-400/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFolder || isMoving || (mode === 'move' && isSameFolder)}
              className="h-8 px-4 bg-accent text-white text-[12px] font-medium rounded-md
                         hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isMoving ? (mode === 'move' ? 'Moving...' : 'Copying...') : mode === 'move' ? 'Move Here' : 'Copy Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tree node for move dialog ────────────────────────

interface MoveTreeNodeProps {
  node: FolderNode
  depth: number
  selectedFolder: string | null
  onSelect: (path: string) => void
}

function MoveTreeNode({ node, depth, selectedFolder, onSelect }: MoveTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [children, setChildren] = useState<FolderNode[] | null>(node.children)

  const handleExpand = async () => {
    if (!isExpanded && children === null) {
      const loaded = await window.api.getFolderChildren(node.path)
      setChildren(loaded)
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div>
      <FolderOption
        label={node.name}
        path={node.path}
        isSelected={selectedFolder === node.path}
        onSelect={onSelect}
        depth={depth}
        hasChildren={children === null || (children && children.length > 0)}
        isExpanded={isExpanded}
        onToggle={handleExpand}
      />

      {isExpanded && children && (
        <div>
          {children.map((child) => (
            <MoveTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFolder={selectedFolder}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single folder option ─────────────────────────────

interface FolderOptionProps {
  label: string
  path: string
  isSelected: boolean
  onSelect: (path: string) => void
  depth: number
  hasChildren?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}

function FolderOption({
  label,
  path,
  isSelected,
  onSelect,
  depth,
  hasChildren,
  isExpanded,
  onToggle
}: FolderOptionProps) {
  return (
    <div
      className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors
        ${isSelected ? 'bg-accent/15 text-neutral-200' : 'text-neutral-400 hover:bg-surface-300/50'}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onSelect(path)}
    >
      {onToggle ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 ${hasChildren ? '' : 'opacity-0'}`}
        >
          <ChevronRight
            size={11}
            className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <div className="w-4" />
      )}

      {isExpanded ? (
        <FolderOpen size={14} className="shrink-0 text-accent-light" />
      ) : (
        <Folder size={14} className="shrink-0" />
      )}

      <span className="text-[12px] truncate">{label}</span>
    </div>
  )
}
