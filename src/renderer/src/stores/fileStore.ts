import { create } from 'zustand'
import type {
  MediaSection,
  FileItem,
  FolderNode,
  DuplicateGroup,
  ViewMode,
  SortField,
  SortOrder,
  GridSize,
  Theme,
  SearchFilters,
  SearchFilterCategory,
  SearchFilterModified,
  SearchFilterSize,
  ListColumnId
} from '../types'
import { api } from '../api'
import {
  PREVIEW_PANEL_MIN_WIDTH,
  PREVIEW_PANEL_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  LARGE_FOLDER_WARNING_COUNT,
  NOTIFICATION_DEFAULT_MS,
  NOTIFICATION_WITH_ACTION_MS,
  FAVORITES_PATH
} from '../constants'

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
  gridSize: GridSize
  theme: Theme
  searchQuery: string
  searchIndex: FileItem[]
  isSearching: boolean
  /** When indexing, number of files indexed so far (for status bar progress). */
  indexProgress: number | null
  searchFilters: SearchFilters
  listColumns: ListColumnId[]

  // Sidebar
  sidebarCollapsed: boolean
  sidebarWidth: number
  recentPaths: string[]

  // Context menu
  contextMenu: { x: number; y: number } | null

  // Renaming
  renamingPath: string | null

  // Move/Copy dialog (null = closed)
  moveDialogMode: null | 'move' | 'copy'

  // Batch rename dialog
  batchRenameOpen: boolean

  // Duplicates dialog (Find duplicates tool)
  isDuplicatesDialogOpen: boolean
  duplicateGroups: DuplicateGroup[]
  isScanningDuplicates: boolean

  // Misplaced files dialog (files in wrong section folder)
  isMisplacedDialogOpen: boolean

  // When set, MoveDialog uses these sources instead of selectedFiles (e.g. from Duplicates dialog)
  moveDialogOverrideSources: string[] | null

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

  // Local media server port for video/audio streaming with range request support
  mediaServerPort: number

  // Media duration cache (path -> seconds), populated when video/audio loads
  mediaDurations: Record<string, number>

  // Favorites (paths), persisted via main process
  favorites: Set<string>

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
  setGridSize: (size: GridSize) => void
  setTheme: (theme: Theme) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setSearchQuery: (query: string) => void
  setSearchFilters: (filters: Partial<SearchFilters>) => void
  setListColumns: (columns: ListColumnId[]) => void
  addRecentPath: (path: string) => void

  setContextMenu: (pos: { x: number; y: number } | null) => void
  setRenamingPath: (path: string | null) => void
  setMoveDialogOpen: (open: boolean, mode?: 'move' | 'copy', overrideSources?: string[]) => void
  setDuplicatesDialogOpen: (open: boolean) => void
  setMisplacedDialogOpen: (open: boolean) => void
  runFindDuplicates: () => Promise<void>
  setSettingsOpen: (open: boolean) => void
  setBatchRenameOpen: (open: boolean) => void
  moveFilesToDestination: (sources: string[], destination: string) => Promise<void>
  setMediaDuration: (path: string, duration: number) => void
  setFavorite: (path: string, isFavorite: boolean) => void

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

function getModifiedCutoffMs(modified: SearchFilterModified): number | null {
  if (modified === 'any') return null
  const now = Date.now()
  const day = 86400000
  if (modified === 'today') return new Date().setHours(0, 0, 0, 0)
  if (modified === 'week') return now - 7 * day
  if (modified === 'month') return now - 30 * day
  if (modified === 'year') return now - 365 * day
  return null
}

function getSizeMinBytes(sizePreset: SearchFilterSize): number | null {
  if (sizePreset === 'any') return null
  if (sizePreset === '1mb') return 1024 * 1024
  if (sizePreset === '10mb') return 10 * 1024 * 1024
  if (sizePreset === '100mb') return 100 * 1024 * 1024
  return null
}

function categoryMatches(category: SearchFilterCategory, file: FileItem): boolean {
  if (category === 'all') return true
  if (category === 'folder') return file.isDirectory
  return file.category === category
}

/** Returns the visible file list for the grid/list (search query + filters). Used by store and by FileGrid. */
export function getVisibleFilesFromState(state: {
  files: FileItem[]
  searchQuery: string
  searchIndex: FileItem[]
  searchFilters: SearchFilters
}): FileItem[] {
  const { files, searchQuery, searchIndex, searchFilters } = state
  let list: FileItem[]
  if (!searchQuery.trim()) {
    list = files
  } else {
    const q = searchQuery.toLowerCase()
    list = searchIndex.filter((f) => f.name.toLowerCase().includes(q))
  }
  if (searchFilters.category !== 'all') {
    list = list.filter((f) => categoryMatches(searchFilters.category, f))
  }
  const modifiedCutoff = getModifiedCutoffMs(searchFilters.modified)
  if (modifiedCutoff != null) {
    list = list.filter((f) => f.modified >= modifiedCutoff)
  }
  const sizeMin = getSizeMinBytes(searchFilters.sizeMin)
  if (sizeMin != null) {
    list = list.filter((f) => f.isDirectory || f.size >= sizeMin)
  }
  return list
}

function getVisibleFiles(state: FileStore): FileItem[] {
  return getVisibleFilesFromState(state)
}

const PERSIST_UI_DEBOUNCE_MS = 600
let persistUiTimer: ReturnType<typeof setTimeout> | null = null

const MAX_RECENT_PATHS = 10

/** In-flight expand folder requests: path -> promise. Reused so duplicate expands don't fire duplicate IPC. */
const expandingFolderPromises = new Map<string, Promise<void>>()

function schedulePersistUiState(get: () => FileStore): void {
  if (persistUiTimer) clearTimeout(persistUiTimer)
  persistUiTimer = setTimeout(() => {
    persistUiTimer = null
    const s = get()
    api.setUiState({
      viewMode: s.viewMode,
      sortField: s.sortField,
      sortOrder: s.sortOrder,
      isPreviewOpen: s.isPreviewOpen,
      previewPanelWidth: s.previewPanelWidth,
      lastSection: s.activeSection,
      lastPath: s.currentPath || '',
      sidebarCollapsed: s.sidebarCollapsed,
      sidebarWidth: s.sidebarWidth,
      gridSize: s.gridSize,
      theme: s.theme,
      recentPaths: s.recentPaths,
      searchFilters: s.searchFilters,
      listColumns: s.listColumns
    })
  }, PERSIST_UI_DEBOUNCE_MS)
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function sortFiles(
  files: FileItem[],
  field: SortField,
  order: SortOrder,
  durationByPath?: Record<string, number>
): FileItem[] {
  if (field === 'random') {
    const dirs = files.filter((f) => f.isDirectory)
    const rest = files.filter((f) => !f.isDirectory)
    return [...dirs, ...shuffleArray(rest)]
  }

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
      case 'created':
        cmp = a.created - b.created
        break
      case 'size':
        cmp = a.size - b.size
        break
      case 'type':
        cmp = a.extension.localeCompare(b.extension)
        break
      case 'path':
        cmp = a.path.localeCompare(b.path)
        break
      case 'duration': {
        const da = durationByPath?.[a.path] ?? 0
        const db = durationByPath?.[b.path] ?? 0
        cmp = da - db
        break
      }
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
  gridSize: 'medium',
  theme: 'dark',
  searchQuery: '',
  searchIndex: [],
  isSearching: false,
  indexProgress: null,
  searchFilters: { category: 'all', modified: 'any', sizeMin: 'any' },
  listColumns: ['name', 'size', 'type', 'modified', 'duration'],
  sidebarCollapsed: false,
  sidebarWidth: 220,
  recentPaths: [],
  contextMenu: null,
  renamingPath: null,
  moveDialogMode: null,
  moveDialogOverrideSources: null,
  isDuplicatesDialogOpen: false,
  duplicateGroups: [],
  isScanningDuplicates: false,
  isMisplacedDialogOpen: false,
  isSettingsOpen: false,
  batchRenameOpen: false,
  operations: [],
  notifications: [],
  initError: null,
  sectionPathMissing: null,
  mediaServerPort: 0,
  mediaDurations: {},
  favorites: new Set(),

  // ── Initialization ───────────────────────────────

  init: async () => {
    try {
      set({ initError: null })
      const config = await api.getAppConfig()
      const { sections, uiState } = config
      if (config.mediaServerPort) {
        set({ mediaServerPort: config.mediaServerPort })
      }
      set({ sections })

      const favs = await api.getFavorites()
      set({ favorites: new Set(Array.isArray(favs) ? favs : []) })

      if (uiState) {
        const updates: Partial<FileStore> = {}
        if (uiState.viewMode === 'grid' || uiState.viewMode === 'list') updates.viewMode = uiState.viewMode
        const validSortFields: SortField[] = ['name', 'date', 'size', 'type', 'created', 'duration', 'path', 'random']
        if (validSortFields.includes(uiState.sortField as SortField)) updates.sortField = uiState.sortField as SortField
        if (uiState.sortOrder === 'asc' || uiState.sortOrder === 'desc') updates.sortOrder = uiState.sortOrder
        if (typeof uiState.isPreviewOpen === 'boolean') updates.isPreviewOpen = uiState.isPreviewOpen
        if (typeof uiState.previewPanelWidth === 'number' && uiState.previewPanelWidth >= PREVIEW_PANEL_MIN_WIDTH && uiState.previewPanelWidth <= PREVIEW_PANEL_MAX_WIDTH) {
          updates.previewPanelWidth = uiState.previewPanelWidth
        }
        if (uiState.gridSize === 'small' || uiState.gridSize === 'medium' || uiState.gridSize === 'large') updates.gridSize = uiState.gridSize
        if (uiState.theme === 'light' || uiState.theme === 'dark') updates.theme = uiState.theme
        if (typeof uiState.sidebarCollapsed === 'boolean') updates.sidebarCollapsed = uiState.sidebarCollapsed
        if (typeof uiState.sidebarWidth === 'number' && uiState.sidebarWidth >= SIDEBAR_MIN_WIDTH && uiState.sidebarWidth <= SIDEBAR_MAX_WIDTH) updates.sidebarWidth = uiState.sidebarWidth
        if (Array.isArray(uiState.recentPaths)) updates.recentPaths = uiState.recentPaths.filter((p): p is string => typeof p === 'string').slice(0, MAX_RECENT_PATHS)
        const uFilters = uiState.searchFilters as Partial<SearchFilters> | undefined
        if (uFilters && typeof uFilters === 'object') {
          const validCategory: SearchFilterCategory[] = ['all', 'image', 'video', 'audio', 'document', 'folder']
          const validModified: SearchFilterModified[] = ['any', 'today', 'week', 'month', 'year']
          const validSize: SearchFilterSize[] = ['any', '1mb', '10mb', '100mb']
          const current = get().searchFilters
          updates.searchFilters = {
            category: validCategory.includes(uFilters.category as SearchFilterCategory) ? (uFilters.category as SearchFilterCategory) : current.category,
            modified: validModified.includes(uFilters.modified as SearchFilterModified) ? (uFilters.modified as SearchFilterModified) : current.modified,
            sizeMin: validSize.includes(uFilters.sizeMin as SearchFilterSize) ? (uFilters.sizeMin as SearchFilterSize) : current.sizeMin
          }
        }
        const uCols = uiState.listColumns as unknown
        if (Array.isArray(uCols) && uCols.length > 0) {
          const validIds: ListColumnId[] = ['name', 'size', 'type', 'modified', 'duration']
          const cols = uCols.filter((c): c is ListColumnId => typeof c === 'string' && validIds.includes(c as ListColumnId))
          if (cols.length > 0) updates.listColumns = [...new Set(cols)]
        }
        if (Object.keys(updates).length > 0) set(updates)
      }

      const state = get()
      const section = (uiState?.lastSection && state.sections[uiState.lastSection] ? uiState.lastSection : 'images') as MediaSection
      const root = state.sections[section]
      const exists = root ? await api.pathExists(root) : false
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
          if (path === FAVORITES_PATH) {
            set({
              currentPath: FAVORITES_PATH,
              pathHistory: [get().sectionRoot, FAVORITES_PATH],
              historyIndex: 1,
              selectedFiles: new Set(),
              previewFile: null,
              searchQuery: ''
            })
          } else if (r && path.startsWith(r) && path !== r) {
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

    const exists = await api.pathExists(root)
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
      indexProgress: 0,
      loadError: null
    })

    let unsubProgress: (() => void) | undefined
    if (typeof (window as { api?: { subscribeSearchIndexProgress?: (cb: (count: number) => void) => () => void } }).api?.subscribeSearchIndexProgress === 'function') {
      unsubProgress = (window as { api: { subscribeSearchIndexProgress: (cb: (count: number) => void) => () => void } }).api.subscribeSearchIndexProgress((count) => set({ indexProgress: count }))
    }

    try {
      const [filesResult, childrenResult, indexResult] = await Promise.all([
        api.getFiles(root) as Promise<{ ok: boolean; files?: FileItem[]; error?: string }>,
        api.getFolderChildren(root),
        api.buildSearchIndex(root)
      ])

      const state = get()
      if (state.sectionLoadId !== sectionId) return
      const { sortField, sortOrder } = state
      const folderTree = childrenResult.ok ? childrenResult.children : []
      const searchIndex = indexResult.ok ? indexResult.files : []
      if (!filesResult.ok || !filesResult.files) {
        const err = filesResult.error ?? 'Failed to load folder'
        const pathMissing = /does not exist|not found|not allowed|Path not allowed/i.test(err)
        set({
          files: [],
          folderTree,
          searchIndex,
          isSearching: false,
          indexProgress: null,
          loadError: err,
          sectionPathMissing: pathMissing ? section : null
        })
        return
      }
      if (!indexResult.ok && indexResult.error) {
        set({
          files: sortFiles(filesResult.files, sortField, sortOrder, sortField === 'duration' ? state.mediaDurations : undefined),
          folderTree,
          searchIndex: [],
          isSearching: false,
          indexProgress: null,
          sectionPathMissing: null,
          loadError: null
        })
        return
      }
      set({
        files: sortFiles(filesResult.files, sortField, sortOrder, sortField === 'duration' ? state.mediaDurations : undefined),
        folderTree,
        searchIndex,
        isSearching: false,
        indexProgress: null,
        sectionPathMissing: null,
        loadError: null
      })
      const after = get()
      const visible = getVisibleFiles(after)
      if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
        set({ previewFile: null })
      }
      schedulePersistUiState(get)
    } finally {
      unsubProgress?.()
      set({ indexProgress: null })
    }
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

    if (path === FAVORITES_PATH) {
      schedulePersistUiState(get)
      return
    }

    get().addRecentPath(path)
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
      isLoading: path !== FAVORITES_PATH
    })
    if (path === FAVORITES_PATH) return
    const id = get().loadId + 1
    set({ loadId: id, loadError: null })
    const result = await api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id || state.currentPath !== path) return
    if (!result.ok || !result.files) {
      set({ files: [], isLoading: false, loadError: result.error ?? 'Failed to load folder' })
      return
    }
    set({
      files: sortFiles(result.files, state.sortField, state.sortOrder, state.sortField === 'duration' ? state.mediaDurations : undefined),
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
      isLoading: path !== FAVORITES_PATH
    })
    if (path === FAVORITES_PATH) return
    const id = get().loadId + 1
    set({ loadId: id, loadError: null })
    const result = await api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id || state.currentPath !== path) return
    if (!result.ok || !result.files) {
      set({ files: [], isLoading: false, loadError: result.error ?? 'Failed to load folder' })
      return
    }
    set({
      files: sortFiles(result.files, state.sortField, state.sortOrder, state.sortField === 'duration' ? state.mediaDurations : undefined),
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
    if (currentPath === FAVORITES_PATH) {
      get().navigateTo(sectionRoot)
      return
    }
    if (currentPath === sectionRoot) return
    const parent = currentPath.replace(/[\\/][^\\/]+$/, '')
    // Don't navigate to empty string or if parent unchanged (e.g. Windows drive root "C:\")
    if (!parent || parent === currentPath || parent.length < sectionRoot.length) return
    get().navigateTo(parent)
  },

  refresh: async () => {
    const { currentPath, sectionRoot } = get()
    if (currentPath === FAVORITES_PATH) {
      const favs = await api.getFavorites()
      set({ favorites: new Set(Array.isArray(favs) ? favs : []) })
      return
    }
    const refreshId = get().refreshId + 1
    set({ refreshId, isLoading: true, isSearching: true, indexProgress: 0, loadError: null })

    let unsubProgress: (() => void) | undefined
    if (typeof (window as { api?: { subscribeSearchIndexProgress?: (cb: (count: number) => void) => () => void } }).api?.subscribeSearchIndexProgress === 'function') {
      unsubProgress = (window as { api: { subscribeSearchIndexProgress: (cb: (count: number) => void) => () => void } }).api.subscribeSearchIndexProgress((count) => set({ indexProgress: count }))
    }

    try {
      const [filesResult, childrenResult, indexResult] = await Promise.all([
        api.getFiles(currentPath) as Promise<{ ok: boolean; files?: FileItem[]; error?: string }>,
        api.getFolderChildren(sectionRoot),
        api.buildSearchIndex(sectionRoot)
      ])

      const state = get()
      if (state.refreshId !== refreshId) return
      const folderTree = childrenResult.ok ? childrenResult.children : state.folderTree
      const searchIndex = indexResult.ok ? indexResult.files : state.searchIndex
      if (!filesResult.ok || !filesResult.files) {
        set({
          files: [],
          folderTree,
          searchIndex,
          isLoading: false,
          isSearching: false,
          indexProgress: null,
          loadError: filesResult.error ?? 'Failed to load folder'
        })
      } else {
        set({
          files: sortFiles(filesResult.files, state.sortField, state.sortOrder, state.sortField === 'duration' ? state.mediaDurations : undefined),
          folderTree,
          searchIndex,
          isLoading: false,
          isSearching: false,
          indexProgress: null,
          loadError: null
        })
      }
    } finally {
      unsubProgress?.()
      set({ indexProgress: null })
    }
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
    const result = await api.getFiles(path) as { ok: boolean; files?: FileItem[]; error?: string }
    const state = get()
    if (state.loadId !== id) return // stale response
    if (!result.ok || !result.files) {
      const err = result.error ?? 'Failed to load folder'
      const pathMissing = /does not exist|not found|not allowed|Path not allowed/i.test(err)
      set({
        files: [],
        isLoading: false,
        loadError: err,
        sectionPathMissing: pathMissing && path === state.sectionRoot ? state.activeSection : state.sectionPathMissing
      })
      return
    }
    const nextFiles = sortFiles(result.files, state.sortField, state.sortOrder, state.sortField === 'duration' ? state.mediaDurations : undefined)
    set({ files: nextFiles, isLoading: false, loadError: null })
    // Clear preview if the previewed file is no longer in the current list
    const after = get()
    const visible = getVisibleFiles(after)
    if (after.previewFile && !visible.some((f) => f.path === after.previewFile!.path)) {
      set({ previewFile: null })
    }
  },

  loadFolderTree: async (rootPath) => {
    const result = await api.getFolderChildren(rootPath)
    if (result.ok) set({ folderTree: result.children })
  },

  expandFolder: async (folderPath) => {
    let promise = expandingFolderPromises.get(folderPath)
    if (promise) return promise

    promise = (async () => {
      try {
        const result = await api.getFolderChildren(folderPath)
        const children = result.ok ? result.children : []
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
      } finally {
        expandingFolderPromises.delete(folderPath)
      }
    })()

    expandingFolderPromises.set(folderPath, promise)
    return promise
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
    set({ previewPanelWidth: Math.max(PREVIEW_PANEL_MIN_WIDTH, Math.min(PREVIEW_PANEL_MAX_WIDTH, width)) })
    schedulePersistUiState(get)
  },

  // ── View settings ────────────────────────────────

  setViewMode: (mode) => {
    set({ viewMode: mode })
    schedulePersistUiState(get)
  },

  // Sort runs only here and when loading files; store holds sorted list so no re-sort on unrelated updates (good for 10k+).
  setSortField: (field) => {
    const { files, sortOrder, mediaDurations } = get()
    set({
      sortField: field,
      files: sortFiles(files, field, sortOrder, field === 'duration' ? mediaDurations : undefined)
    })
    schedulePersistUiState(get)
  },

  toggleSortOrder: () => {
    const { files, sortField, sortOrder, mediaDurations } = get()
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    set({
      sortOrder: newOrder,
      files: sortFiles(files, sortField, newOrder, sortField === 'duration' ? mediaDurations : undefined)
    })
    schedulePersistUiState(get)
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchFilters: (filters) => {
    set((s) => ({
      searchFilters: {
        ...s.searchFilters,
        ...filters
      }
    }))
    schedulePersistUiState(get)
  },

  setListColumns: (columns) => {
    set({ listColumns: columns })
    schedulePersistUiState(get)
  },

  setGridSize: (size) => {
    set({ gridSize: size })
    schedulePersistUiState(get)
  },

  setTheme: (theme) => {
    set({ theme })
    schedulePersistUiState(get)
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    schedulePersistUiState(get)
  },

  setSidebarWidth: (width) => {
    set({ sidebarWidth: Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width)) })
    schedulePersistUiState(get)
  },

  addRecentPath: (path) => {
    if (!path || path === get().sectionRoot) return
    set((s) => {
      const next = [path, ...s.recentPaths.filter((p) => p !== path)].slice(0, MAX_RECENT_PATHS)
      return { recentPaths: next }
    })
    schedulePersistUiState(get)
  },

  // ── UI state ─────────────────────────────────────

  setContextMenu: (pos) => set({ contextMenu: pos }),
  setRenamingPath: (path) => set({ renamingPath: path }),
  setMoveDialogOpen: (open, mode, overrideSources) =>
    set({
      moveDialogMode: open ? mode ?? 'move' : null,
      moveDialogOverrideSources: open ? (overrideSources ?? null) : null
    }),
  setDuplicatesDialogOpen: (open) =>
    set({ isDuplicatesDialogOpen: open, ...(open ? {} : { duplicateGroups: [] }) }),
  setMisplacedDialogOpen: (open) => set({ isMisplacedDialogOpen: open }),
  runFindDuplicates: async () => {
    const { sectionRoot } = get()
    if (!sectionRoot) {
      get().addNotification('error', 'No section folder set. Open Settings to choose a folder.')
      return
    }
    set({ isScanningDuplicates: true, duplicateGroups: [] })
    try {
      const result = await api.findDuplicates(sectionRoot)
      if (result.ok) {
        set({ duplicateGroups: result.groups, isScanningDuplicates: false })
      } else {
        get().addNotification('error', result.error)
        set({ isScanningDuplicates: false })
      }
    } catch {
      set({ isScanningDuplicates: false })
    }
  },
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setBatchRenameOpen: (open) => set({ batchRenameOpen: open }),
  moveFilesToDestination: async (sources, destination) => {
    if (sources.length === 0) return
    const { currentPath, sectionRoot } = get()
    const results = await api.moveFiles(sources, destination)
    const failures = results.filter((r: { success: boolean }) => !r.success)
    if (failures.length > 0) {
      get().addNotification('error', `Failed to move ${failures.length} file(s)`)
    } else {
      get().addNotification(
        'success',
        `Moved ${sources.length} file(s) to ${basename(destination)}`,
        { actionLabel: 'Undo', onAction: () => get().undoLastOperation() }
      )
    }
    set({
      moveDialogMode: null,
      moveDialogOverrideSources: null,
      operations: [
        ...get().operations,
        { type: 'move', timestamp: Date.now(), data: { sources, destination, results } }
      ]
    })
    await Promise.all([
      get().loadFiles(currentPath),
      get().loadFolderTree(sectionRoot)
    ])
  },
  setMediaDuration: (path, duration) =>
    set((s) => ({
      mediaDurations: { ...s.mediaDurations, [path]: duration }
    })),

  setFavorite: (path, isFavorite) => {
    const next = new Set(get().favorites)
    if (isFavorite) next.add(path)
    else next.delete(path)
    set({ favorites: next })
    api.setFavorites(Array.from(next))
  },

  // ── File operations ──────────────────────────────

  moveSelectedFiles: async (destination) => {
    const { selectedFiles, currentPath, sectionRoot } = get()
    const sources = Array.from(selectedFiles)
    if (sources.length === 0) return

    const results = await api.moveFiles(sources, destination)
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

    const results = await api.copyFiles(sources, destination)
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
      await api.renameItem(oldPath, newName)
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
        await api.renameItem(path, newName)
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
      const newPath = await api.createFolder(currentPath, name)
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

    const results = await api.trashFiles(paths)
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
    api.openFile(filePath)
  },

  openInExplorer: (filePath) => {
    api.openInExplorer(filePath)
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
        const results = await api.moveFiles(currentPaths, originalParent)
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
        await api.renameItem(newPath, basename(oldPath))
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
    setTimeout(() => get().removeNotification(id), options?.onAction ? NOTIFICATION_WITH_ACTION_MS : NOTIFICATION_DEFAULT_MS)
  },

  removeNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id)
    }))
  }
}))
