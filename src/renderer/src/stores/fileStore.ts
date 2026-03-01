import { create } from 'zustand'
import type {
  MediaSection,
  FileItem,
  FolderNode,
  ViewMode,
  SortField,
  SortOrder
} from '../types'

interface Operation {
  type: 'move' | 'rename'
  timestamp: number
  data: Record<string, unknown>
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface FileStore {
  // Sections
  sections: Record<string, string>
  activeSection: MediaSection
  sectionRoot: string

  // Navigation
  currentPath: string
  pathHistory: string[]
  historyIndex: number

  // Request cancellation (latest-wins for async ops)
  loadId: number
  sectionLoadId: number
  refreshId: number

  // Files
  files: FileItem[]
  isLoading: boolean
  loadError: string | null

  // Folder tree
  folderTree: FolderNode[]

  // Selection
  selectedFiles: Set<string>
  lastSelectedIndex: number | null

  // Preview
  previewFile: FileItem | null
  isPreviewOpen: boolean
  previewPanelWidth: number

  // View
  viewMode: ViewMode
  sortField: SortField
  sortOrder: SortOrder
  searchQuery: string
  searchIndex: FileItem[]
  isSearching: boolean

  // Context menu
  contextMenu: { x: number; y: number } | null

  // Renaming
  renamingPath: string | null

  // Move/Copy dialog (null = closed)
  moveDialogMode: null | 'move' | 'copy'

  // Batch rename dialog
  batchRenameOpen: boolean

  // Operations history (for undo)
  operations: Operation[]

  // Notifications
  notifications: Notification[]

  // Init error (when getSections or first load fails)
  initError: string | null

  // Section path missing (e.g. drive disconnected)
  sectionPathMissing: MediaSection | null

  // Settings dialog
  isSettingsOpen: boolean

  // Media duration cache (path -> seconds), populated when video/audio loads
  mediaDurations: Record<string, number>

  // ── Actions ──────────────────────────────────────

  init: () => Promise<void>
  clearInitError: () => void
  setSections: (sections: Record<string, string>) => void
  setActiveSection: (section: MediaSection) => Promise<void>
  navigateTo: (path: string) => Promise<void>
  goBack: () => void
  goForward: () => void
  goUp: () => void
  refresh: () => Promise<void>

  loadFiles: (path: string) => Promise<void>
  loadFolderTree: (rootPath: string) => Promise<void>
  expandFolder: (folderPath: string) => Promise<void>

  selectFile: (path: string, mode: 'single' | 'toggle' | 'range') => void
  selectAll: () => void
  clearSelection: () => void

  setPreviewFile: (file: FileItem | null) => void
  togglePreview: () => void
  setPreviewPanelWidth: (width: number) => void

  setViewMode: (mode: ViewMode) => void
  setSortField: (field: SortField) => void
  toggleSortOrder: () => void
  setSearchQuery: (query: string) => void

  setContextMenu: (pos: { x: number; y: number } | null) => void
  setRenamingPath: (path: string | null) => void
  setMoveDialogOpen: (open: boolean, mode?: 'move' | 'copy') => void
  setSettingsOpen: (open: boolean) => void
  setBatchRenameOpen: (open: boolean) => void
  setMediaDuration: (path: string, duration: number) => void

  // File operations
  moveSelectedFiles: (destination: string) => Promise<void>
  copySelectedFiles: (destination: string) => Promise<void>
  renameItem: (oldPath: string, newName: string) => Promise<void>
  renameBatch: (entries: { path: string; newName: string }[]) => Promise<void>
  undoLastOperation: () => Promise<void>
  createFolder: (name: string) => Promise<void>
  trashSelected: () => Promise<void>
  openFile: (filePath: string) => void
  openInExplorer: (filePath: string) => void

  addNotification: (
    type: Notification['type'],
    message: string,
    options?: { actionLabel: string; onAction: () => void }
  ) => void
  removeNotification: (id: string) => void
  undoLastOperation: () => Promise<void>
}

function basename(p: string): string {
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return i < 0 ? p : p.slice(i + 1)
}

function dirname(p: string): string {
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return i <= 0 ? p : p.slice(0, i)
}

function pathJoin(...parts: string[]): string {
  const sep = parts[0]?.includes('/') ? '/' : '\\'
  return parts.join(sep).replace(new RegExp(sep + '+', 'g'), sep)
}

function getVisibleFiles(state: {
  files: FileItem[]
  searchQuery: string
  searchIndex: FileItem[]
}): FileItem[] {
  if (!state.searchQuery.trim()) return state.files
  const q = state.searchQuery.toLowerCase()
  return state.searchIndex.filter((f) => f.name.toLowerCase().includes(q))
}

const PERSIST_UI_DEBOUNCE_MS = 600
let persistUiTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersistUiState(get: () => FileStore): void {
  if (persistUiTimer) clearTimeout(persistUiTimer)
  persistUiTimer = setTimeout(() => {
    persistUiTimer = null
    const s = get()
    window.api.setUiState({
      viewMode: s.viewMode,
      sortField: s.sortField,
      sortOrder: s.sortOrder,
      isPreviewOpen: s.isPreviewOpen,
      previewPanelWidth: s.previewPanelWidth,
      lastSection: s.activeSection,
      lastPath: s.currentPath || ''
    })
  }, PERSIST_UI_DEBOUNCE_MS)
}

function sortFiles(files: FileItem[], field: SortField, order: SortOrder): FileItem[] {
  const sorted = [...files].sort((a, b) => {
    // Directories always first
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1

    let cmp = 0
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true })
        break
      case 'date':
        cmp = a.modified - b.modified
        break
      case 'size':
        cmp = a.size - b.size
        break
      case 'type':
        cmp = a.extension.localeCompare(b.extension)
        break
    }
    return order === 'asc' ? cmp : -cmp
  })
  return sorted
}

export const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  sections: {},
  activeSection: 'images',
  sectionRoot: '',
  currentPath: '',
  pathHistory: [],
  historyIndex: -1,
  loadId: 0,
  sectionLoadId: 0,
  refreshId: 0,
  files: [],
  isLoading: false,
  loadError: null,
  folderTree: [],
  selectedFiles: new Set(),
  lastSelectedIndex: null,
  previewFile: null,
  isPreviewOpen: true,
  previewPanelWidth: 280,
  viewMode: 'grid',
  sortField: 'name',
  sortOrder: 'asc',
  searchQuery: '',
  searchIndex: [],
  isSearching: false,
  contextMenu: null,
  renamingPath: null,
  moveDialogMode: null,
  isSettingsOpen: false,
  batchRenameOpen: false,
  operations: [],
  notifications: [],
  initError: null,
  sectionPathMissing: null,
  mediaDurations: {},

  // ── Initialization ───────────────────────────────

  init: async () => {
    try {
      set({ initError: null })
      const config = await window.api.getAppConfig()
      const { sections, uiState } = config
      set({ sections })

      if (uiState) {
        const updates: Partial<FileStore> = {}
        if (uiState.viewMode === 'grid' || uiState.viewMode === 'list') updates.viewMode = uiState.viewMode
        if (uiState.sortField === 'name' || uiState.sortField === 'date' || uiState.sortField === 'size' || uiState.sortField === 'type') updates.sortField = uiState.sortField
        if (uiState.sortOrder === 'asc' || uiState.sortOrder === 'desc') updates.sortOrder = uiState.sortOrder
        if (typeof uiState.isPreviewOpen === 'boolean') updates.isPreviewOpen = uiState.isPreviewOpen
        if (typeof uiState.previewPanelWidth === 'number' && uiState.previewPanelWidth >= 240 && uiState.previewPanelWidth <= 520) {
          updates.previewPanelWidth = uiState.previewPanelWidth
        }
        if (Object.keys(updates).length > 0) set(updates)
      }

      const state = get()
      const section = (uiState?.lastSection && state.sections[uiState.lastSection] ? uiState.lastSection : 'images') as MediaSection
      const root = state.sections[section]
      const exists = root ? await window.api.pathExists(root) : false
      if (!root || !exists) {
        set({
          activeSection: section,
          sectionRoot: root || '',
          currentPath: root || '',
          pathHistory: root ? [root] : [],
          historyIndex: 0,
          files: [],
          folderTree: [],
          searchIndex: [],
          isSearching: false,
          sectionPathMissing: root && !exists ? section : null
        })
      } else {
        set({ sectionPathMissing: null })
        await state.setActiveSection(section)
        if (uiState?.lastPath && typeof uiState.lastPath === 'string') {
          const r = get().sectionRoot
          const path = uiState.lastPath
          if (r && path.startsWith(r) && path !== r) {
            await get().navigateTo(path)
          }
        }
      }
    } catch (err) {
      set({
        initError: err instanceof Error ? err.message : 'Failed to load library'
      })
    }
  },

  clearInitError: () => set({ initError: null }),

  setSections: (sections) => set({ sections }),

  // ── Section & Navigation ─────────────────────────

  setActiveSection: async (section) => {
    const { sections } = get()
    const root = sections[section]
    if (!root) return

    const exists = await window.api.pathExists(root)
    if (!exists) {
      set({
        activeSection: section,
        sectionRoot: root,
        currentPath: root,
        pathHistory: [root],
        historyIndex: 0,
        selectedFiles: new Set(),
        previewFile: null,
        searchQuery: '',
        files: [],
        folderTree: [],
        searchIndex: [],
        isSearching: false,
        sectionPathMissing: section
      })
      return
    }

    const sectionId = get().sectionLoadId + 1
    set({
      sectionLoadId: sectionId,
      activeSection: section,
      sectionRoot: root,
      currentPath: root,
      selectedFiles: new Set(),
      previewFile: null,
      searchQuery: '',
      pathHistory: [root],
      historyIndex: 0,
      isSearching: true,
      loadError: null
    })

    const [filesResult, children, index] = await Promise.all([
      window.api.getFiles(root) as Promise<{ ok: boolean; files?: FileItem[]; error?: string }>,
      window.api.getFolderChildren(root),
      window.api.buildSearchIndex(root)
    ])

    const state = get()
    if (state.sectionLoadId !== sectionId) return
    const { sortField, sortOrder } = state
    if (!filesResult.ok || !filesResult.files) {
      set({
        files: [],
        folderTree: children ?? [],
        searchIndex: index ?? [],
        isSearching: false,
        loadError: filesResult.error ?? 'Failed to load folder'
      })
      return
    }
    set({
      files: sortFiles(filesResult.files, sortField, sortOrder),
      folderTree: children,
      searchIndex: index,
      isSearching: false,
      sectionPathMissing: null,
      loadError: null
    })
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
    schedulePersistUiState(get)
  },

  navigateTo: async (path) => {
    const { pathHistory, historyIndex } = get()
    const newHistory = pathHistory.slice(0, historyIndex + 1)
    newHistory.push(path)

    set({
      currentPath: path,
      pathHistory: newHistory,
      historyIndex: newHistory.length - 1,
      selectedFiles: new Set(),
      previewFile: null,
      searchQuery: ''
    })

    await get().loadFiles(path)
    schedulePersistUiState(get)
  },

  goBack: async () => {
    const { pathHistory, historyIndex } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const path = pathHistory[newIndex]
    set({
      currentPath: path,
      historyIndex: newIndex,
      selectedFiles: new Set(),
      previewFile: null,
      isLoading: true
    })
    const id = get().loadId + 1
    set({ loadId: id, loadError: null })
    const result = await window.api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id || state.currentPath !== path) return
    if (!result.ok || !result.files) {
      set({ files: [], isLoading: false, loadError: result.error ?? 'Failed to load folder' })
      return
    }
    set({
      files: sortFiles(result.files, state.sortField, state.sortOrder),
      isLoading: false,
      loadError: null
    })
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
  },

  goForward: async () => {
    const { pathHistory, historyIndex } = get()
    if (historyIndex >= pathHistory.length - 1) return
    const newIndex = historyIndex + 1
    const path = pathHistory[newIndex]
    set({
      currentPath: path,
      historyIndex: newIndex,
      selectedFiles: new Set(),
      previewFile: null,
      isLoading: true
    })
    const id = get().loadId + 1
    set({ loadId: id, loadError: null })
    const result = await window.api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id || state.currentPath !== path) return
    if (!result.ok || !result.files) {
      set({ files: [], isLoading: false, loadError: result.error ?? 'Failed to load folder' })
      return
    }
    set({
      files: sortFiles(result.files, state.sortField, state.sortOrder),
      isLoading: false,
      loadError: null
    })
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
  },

  goUp: () => {
    const { currentPath, sectionRoot } = get()
    if (currentPath === sectionRoot) return
    const parent = currentPath.replace(/[\\/][^\\/]+$/, '')
    // Don't navigate to empty string or if parent unchanged (e.g. Windows drive root "C:\")
    if (!parent || parent === currentPath || parent.length < sectionRoot.length) return
    get().navigateTo(parent)
  },

  refresh: async () => {
    const { currentPath, sectionRoot } = get()
    const refreshId = get().refreshId + 1
    set({ refreshId, isLoading: true, isSearching: true })

    const [files, children, index] = await Promise.all([
      window.api.getFiles(currentPath),
      window.api.getFolderChildren(sectionRoot),
      window.api.buildSearchIndex(sectionRoot)
    ])

    const state = get()
    if (state.refreshId !== refreshId) return
    set({
      files: sortFiles(files, state.sortField, state.sortOrder),
      folderTree: children,
      searchIndex: index,
      isLoading: false,
      isSearching: false
    })
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
  },

  // ── File loading ─────────────────────────────────

  loadFiles: async (path) => {
    const id = get().loadId + 1
    set({ loadId: id, isLoading: true, loadError: null })
    const result = await window.api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id) return // stale response
    if (!result.ok || !result.files) {
      set({ files: [], isLoading: false, loadError: result.error ?? 'Failed to load folder' })
      return
    }
    const nextFiles = sortFiles(result.files, state.sortField, state.sortOrder)
    set({ files: nextFiles, isLoading: false, loadError: null })
    // Clear preview if the previewed file is no longer in the current list
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
  },

  loadFolderTree: async (rootPath) => {
    const children = await window.api.getFolderChildren(rootPath)
    set({ folderTree: children })
  },

  expandFolder: async (folderPath) => {
    const children = await window.api.getFolderChildren(folderPath)

    function updateTree(nodes: FolderNode[]): FolderNode[] {
      return nodes.map((node) => {
        if (node.path === folderPath) {
          return { ...node, children }
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) }
        }
        return node
      })
    }

    set((state) => ({ folderTree: updateTree(state.folderTree) }))
  },

  // ── Selection ────────────────────────────────────

  selectFile: (path, mode) => {
    const state = get()
    const visible = getVisibleFiles(state)
    const { selectedFiles } = state
    const fileIndex = visible.findIndex((f) => f.path === path)
    const file = visible.find((f) => f.path === path) ?? null

    if (mode === 'single') {
      set({
        selectedFiles: new Set([path]),
        lastSelectedIndex: fileIndex,
        previewFile: file
      })
    } else if (mode === 'toggle') {
      const next = new Set(selectedFiles)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      set({
        selectedFiles: next,
        lastSelectedIndex: fileIndex,
        previewFile: next.size > 0 ? file : null
      })
    } else if (mode === 'range') {
      const { lastSelectedIndex } = get()
      const validAnchor =
        lastSelectedIndex !== null &&
        lastSelectedIndex >= 0 &&
        lastSelectedIndex < visible.length
      if (!validAnchor) {
        set({
          selectedFiles: new Set([path]),
          lastSelectedIndex: fileIndex,
          previewFile: file
        })
        return
      }
      const start = Math.min(lastSelectedIndex!, fileIndex)
      const end = Math.max(lastSelectedIndex!, fileIndex)
      const next = new Set(selectedFiles)
      for (let i = start; i <= end; i++) {
        next.add(visible[i].path)
      }
      set({
        selectedFiles: next,
        previewFile: file
      })
    }
  },

  selectAll: () => {
    const visible = getVisibleFiles(get())
    set({ selectedFiles: new Set(visible.map((f) => f.path)) })
  },

  clearSelection: () => {
    set({ selectedFiles: new Set(), previewFile: null, lastSelectedIndex: null })
  },

  // ── Preview ──────────────────────────────────────

  setPreviewFile: (file) => set({ previewFile: file }),

  togglePreview: () => {
    set((s) => ({ isPreviewOpen: !s.isPreviewOpen }))
    schedulePersistUiState(get)
  },

  setPreviewPanelWidth: (width) => {
    set({ previewPanelWidth: Math.max(240, Math.min(520, width)) })
    schedulePersistUiState(get)
  },

  // ── View settings ────────────────────────────────

  setViewMode: (mode) => {
    set({ viewMode: mode })
    schedulePersistUiState(get)
  },

  setSortField: (field) => {
    const { files, sortOrder } = get()
    set({ sortField: field, files: sortFiles(files, field, sortOrder) })
    schedulePersistUiState(get)
  },

  toggleSortOrder: () => {
    const { files, sortField, sortOrder } = get()
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    set({ sortOrder: newOrder, files: sortFiles(files, sortField, newOrder) })
    schedulePersistUiState(get)
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── UI state ─────────────────────────────────────

  setContextMenu: (pos) => set({ contextMenu: pos }),
  setRenamingPath: (path) => set({ renamingPath: path }),
  setMoveDialogOpen: (open, mode) =>
    set({ moveDialogMode: open ? mode ?? 'move' : null }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setBatchRenameOpen: (open) => set({ batchRenameOpen: open }),
  setMediaDuration: (path, duration) =>
    set((s) => ({
      mediaDurations: { ...s.mediaDurations, [path]: duration }
    })),


  // ── File operations ──────────────────────────────

  moveSelectedFiles: async (destination) => {
    const { selectedFiles, currentPath, sectionRoot } = get()
    const sources = Array.from(selectedFiles)
    if (sources.length === 0) return

    const results = await window.api.moveFiles(sources, destination)
    const failures = results.filter((r: { success: boolean }) => !r.success)

    if (failures.length > 0) {
      get().addNotification(
        'error',
        `Failed to move ${failures.length} file(s)`
      )
    } else {
      get().addNotification(
        'success',
        `Moved ${sources.length} file(s) to ${basename(destination)}`,
        { actionLabel: 'Undo', onAction: () => get().undoLastOperation() }
      )
    }

    set({
      selectedFiles: new Set(),
      previewFile: null,
      moveDialogMode: null,
      operations: [
        ...get().operations,
        {
          type: 'move',
          timestamp: Date.now(),
          data: { sources, destination, results }
        }
      ]
    })

    await Promise.all([
      get().loadFiles(currentPath),
      get().loadFolderTree(sectionRoot)
    ])
  },

  copySelectedFiles: async (destination) => {
    const { selectedFiles, currentPath, sectionRoot } = get()
    const sources = Array.from(selectedFiles)
    if (sources.length === 0) return

    const results = await window.api.copyFiles(sources, destination)
    const failures = results.filter((r: { success: boolean }) => !r.success)

    if (failures.length > 0) {
      get().addNotification(
        'error',
        `Failed to copy ${failures.length} file(s)`
      )
    } else {
      get().addNotification(
        'success',
        `Copied ${sources.length} file(s) successfully`
      )
    }

    set({ moveDialogMode: null })

    await Promise.all([
      get().loadFiles(currentPath),
      get().loadFolderTree(sectionRoot)
    ])
  },

  renameItem: async (oldPath, newName) => {
    try {
      await window.api.renameItem(oldPath, newName)
      get().addNotification('success', `Renamed to "${newName}"`, {
        actionLabel: 'Undo',
        onAction: () => get().undoLastOperation()
      })

      set({
        renamingPath: null,
        operations: [
          ...get().operations,
          {
            type: 'rename',
            timestamp: Date.now(),
            data: { oldPath, newName }
          }
        ]
      })

      const { currentPath, sectionRoot } = get()
      await Promise.all([
        get().loadFiles(currentPath),
        get().loadFolderTree(sectionRoot)
      ])
    } catch (err) {
      get().addNotification(
        'error',
        err instanceof Error ? err.message : 'Rename failed'
      )
    }
  },

  renameBatch: async (entries) => {
    const { currentPath, sectionRoot } = get()
    let done = 0
    const failed: string[] = []
    for (const { path, newName } of entries) {
      try {
        await window.api.renameItem(path, newName)
        done++
      } catch {
        failed.push(basename(path))
      }
    }
    if (failed.length > 0) {
      get().addNotification('error', `Failed to rename: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`)
    }
    if (done > 0) {
      get().addNotification('success', `Renamed ${done} file${done !== 1 ? 's' : ''}`)
    }
    set({ batchRenameOpen: false })
    await Promise.all([
      get().loadFiles(currentPath),
      get().loadFolderTree(sectionRoot)
    ])
  },

  createFolder: async (name) => {
    const { currentPath, sectionRoot } = get()
    try {
      const newPath = await window.api.createFolder(currentPath, name)
      get().addNotification('success', `Created folder "${name}"`)

      await Promise.all([
        get().loadFiles(currentPath),
        get().loadFolderTree(sectionRoot)
      ])

      // Start renaming the new folder so user can customize the name
      set({ renamingPath: newPath })
    } catch (err) {
      get().addNotification(
        'error',
        err instanceof Error ? err.message : 'Failed to create folder'
      )
    }
  },

  trashSelected: async () => {
    const { selectedFiles, currentPath, sectionRoot } = get()
    const paths = Array.from(selectedFiles)
    if (paths.length === 0) return

    const results = await window.api.trashFiles(paths)
    const failures = results.filter((r: { success: boolean }) => !r.success)

    if (failures.length > 0) {
      get().addNotification(
        'error',
        `Failed to recycle ${failures.length} file(s)`
      )
    } else {
      get().addNotification(
        'success',
        `Sent ${paths.length} file(s) to recycle bin`
      )
    }

    set({ selectedFiles: new Set(), previewFile: null })
    await Promise.all([
      get().loadFiles(currentPath),
      get().loadFolderTree(sectionRoot)
    ])
  },

  openFile: (filePath) => {
    window.api.openFile(filePath)
  },

  openInExplorer: (filePath) => {
    window.api.openInExplorer(filePath)
  },

  undoLastOperation: async () => {
    const state = get()
    const ops = state.operations
    if (ops.length === 0) return

    const last = ops[ops.length - 1]
    set({ operations: ops.slice(0, -1) })

    try {
      if (last.type === 'move') {
        const { sources, destination } = last.data as { sources: string[]; destination: string }
        const currentPaths = sources.map((s) => pathJoin(destination, basename(s)))
        const originalParent = dirname(sources[0])
        const results = await window.api.moveFiles(currentPaths, originalParent)
        const failures = results.filter((r: { success: boolean }) => !r.success)
        if (failures.length > 0) {
          get().addNotification('error', `Undo failed for ${failures.length} file(s)`)
        } else {
          get().addNotification('success', 'Move undone')
          const { currentPath, sectionRoot } = get()
          await Promise.all([get().loadFiles(currentPath), get().loadFolderTree(sectionRoot)])
        }
      } else if (last.type === 'rename') {
        const { oldPath, newName } = last.data as { oldPath: string; newName: string }
        const newPath = pathJoin(dirname(oldPath), newName)
        await window.api.renameItem(newPath, basename(oldPath))
        get().addNotification('success', 'Rename undone')
        const { currentPath, sectionRoot } = get()
        await Promise.all([get().loadFiles(currentPath), get().loadFolderTree(sectionRoot)])
      }
    } catch (err) {
      get().addNotification('error', err instanceof Error ? err.message : 'Undo failed')
    }
  },

  // ── Notifications ────────────────────────────────

  addNotification: (type, message, options) => {
    const id = crypto.randomUUID()
    set((s) => ({
      notifications: [
        ...s.notifications,
        { id, type, message, actionLabel: options?.actionLabel, onAction: options?.onAction }
      ]
    }))
    setTimeout(() => get().removeNotification(id), options?.onAction ? 8000 : 3500)
  },

  removeNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id)
    }))
  }
}))
