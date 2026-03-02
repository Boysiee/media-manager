import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  protocol,
  nativeImage,
  dialog
} from 'electron'
import { createHash } from 'crypto'
import { join, basename, extname, dirname, resolve, normalize, sep } from 'path'
import { platform } from 'os'
import { readdir, stat, rename, mkdir, access, readFile, copyFile, writeFile } from 'fs/promises'
import { createReadStream, statSync } from 'fs'
import { createInterface } from 'readline'
import { createServer, type Server } from 'http'

// ---------------------------------------------------------------------------
// Constants & config
// ---------------------------------------------------------------------------

const MEDIA_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.m4v': 'video/mp4', '.ts': 'video/mp2t',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.avif': 'image/avif', '.ico': 'image/x-icon'
}

let mediaServer: Server | null = null
let mediaServerPort = 0

const DEFAULT_SECTIONS: Record<string, string> = {
  images: 'E:\\Media\\Images',
  videos: 'E:\\Media\\Videos',
  audio: 'E:\\Media\\Audio',
  documents: 'E:\\Media\\Documents'
}

const CONFIG_FILENAME = 'media-manager-config.json'
const FAVORITES_FILENAME = 'media-manager-favorites.json'

let MEDIA_SECTIONS: Record<string, string> = { ...DEFAULT_SECTIONS }

interface SearchFiltersState {
  category?: string
  modified?: string
  sizeMin?: string
}

interface UiState {
  viewMode?: 'grid' | 'list'
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  isPreviewOpen?: boolean
  previewPanelWidth?: number
  lastSection?: string
  lastPath?: string
  sidebarCollapsed?: boolean
  sidebarWidth?: number
  gridSize?: 'small' | 'medium' | 'large'
  theme?: 'light' | 'dark'
  recentPaths?: string[]
  searchFilters?: SearchFiltersState
  listColumns?: string[]
}

const DEFAULT_UI_STATE: UiState = {
  viewMode: 'grid',
  sortField: 'name',
  sortOrder: 'asc',
  isPreviewOpen: true,
  previewPanelWidth: 280,
  lastSection: 'images',
  lastPath: '',
  sidebarCollapsed: false,
  sidebarWidth: 220,
  gridSize: 'medium',
  theme: 'dark',
  recentPaths: []
}

let UI_STATE: UiState = { ...DEFAULT_UI_STATE }

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILENAME)
}

async function loadConfig(): Promise<void> {
  try {
    const configPath = getConfigPath()
    const data = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(data) as {
      sections?: Record<string, string>
      uiState?: Partial<UiState>
    }
    if (parsed.sections && typeof parsed.sections === 'object') {
      for (const key of Object.keys(DEFAULT_SECTIONS)) {
        if (typeof parsed.sections[key] === 'string') {
          MEDIA_SECTIONS[key] = parsed.sections[key]
        }
      }
    }
    if (parsed.uiState && typeof parsed.uiState === 'object') {
      const u = parsed.uiState
      UI_STATE = {
        ...DEFAULT_UI_STATE,
        ...parsed.uiState,
        sidebarWidth: typeof u.sidebarWidth === 'number' && u.sidebarWidth >= 160 && u.sidebarWidth <= 400 ? u.sidebarWidth : DEFAULT_UI_STATE.sidebarWidth,
        recentPaths: Array.isArray(u.recentPaths) ? u.recentPaths.filter((p): p is string => typeof p === 'string').slice(0, 10) : DEFAULT_UI_STATE.recentPaths,
        searchFilters: u.searchFilters && typeof u.searchFilters === 'object' ? u.searchFilters : undefined,
        listColumns: Array.isArray(u.listColumns) ? u.listColumns.filter((c): c is string => typeof c === 'string') : undefined
      }
    }
  } catch {
    // use defaults
  }
}

function getFavoritesPath(): string {
  return join(app.getPath('userData'), FAVORITES_FILENAME)
}

async function loadFavorites(): Promise<string[]> {
  try {
    const path = getFavoritesPath()
    const data = await readFile(path, 'utf-8')
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => typeof p === 'string')
    }
  } catch {
    // no file or invalid
  }
  return []
}

async function saveFavorites(paths: string[]): Promise<void> {
  const path = getFavoritesPath()
  await writeFile(path, JSON.stringify(paths, null, 2), 'utf-8')
}

async function saveConfig(): Promise<void> {
  try {
    const configPath = getConfigPath()
    const data = JSON.stringify(
      { sections: MEDIA_SECTIONS, uiState: UI_STATE },
      null,
      2
    )
    await writeFile(configPath, data, 'utf-8')
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}

const IMAGE_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
  '.tiff', '.tif', '.avif', '.jfif'
])
const VIDEO_EXT = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
  '.mpg', '.mpeg', '.ts', '.3gp'
])
const AUDIO_EXT = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.alac'
])
const TEXT_EXT = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.log',
  '.ini', '.cfg', '.conf', '.rtf', '.html', '.htm', '.css', '.js',
  '.ts', '.py', '.java', '.c', '.cpp', '.h', '.sh', '.bat', '.ps1'
])

// Files/extensions to hide from grid and search (system/config clutter)
const HIDDEN_EXT = new Set([
  '.ini', '.cfg', '.conf', '.bak', '.tmp', '.temp', '.cache',
  '.crdownload', '.part', '.dmp', '.log', '.old', '.swp', '.swo'
])
const HIDDEN_NAMES = new Set([
  'desktop.ini', 'thumbs.db', '.ds_store', '.spotlight-v100',
  '.trashes', '.fseventsd', '.volumeicon.icns', '.directory',
  'ehthumbs.db', 'folder.htt'
])

function isHiddenFile(name: string, ext: string): boolean {
  const lower = name.toLowerCase()
  if (HIDDEN_NAMES.has(lower)) return true
  if (HIDDEN_EXT.has(ext.toLowerCase())) return true
  if (lower.startsWith('.')) return true // Unix hidden files
  return false
}

/** Allowed roots (section paths). Paths from renderer must stay under one of these. Never empty: fall back to defaults. */
function getAllowedRoots(): string[] {
  const fromConfig = Object.values(MEDIA_SECTIONS)
    .filter((p) => p && String(p).trim() !== '')
    .map((p) => normalize(resolve(p)))
  if (fromConfig.length > 0) return fromConfig
  return Object.values(DEFAULT_SECTIONS).map((p) => normalize(resolve(p)))
}

/** Case-insensitive path comparison on Windows (drive letter / folder names can differ in case). */
function pathEquals(a: string, b: string): boolean {
  if (platform() === 'win32') return a.toLowerCase() === b.toLowerCase()
  return a === b
}

/** True if path is under one of the allowed section roots. */
function isPathUnderRoot(filePath: string): boolean {
  if (!filePath || String(filePath).trim() === '') return false
  const resolved = normalize(resolve(filePath))
  const roots = getAllowedRoots()
  if (roots.length === 0) return false
  return roots.some((root) => {
    const same = pathEquals(resolved, root)
    const under = resolved.length > root.length && (resolved.startsWith(root + sep) || (platform() === 'win32' && resolved.toLowerCase().startsWith((root + sep).toLowerCase())))
    return same || under
  })
}

/** Sanitize rename newName: no path separators, no '..'. */
function sanitizeRenameName(newName: string): boolean {
  if (newName.includes('..') || newName.includes('/') || newName.includes('\\')) return false
  if (newName.trim() === '') return false
  return true
}

// ---------------------------------------------------------------------------
// Protocol
// ---------------------------------------------------------------------------

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-file',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      secure: true
    }
  }
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileCategory(ext: string): 'image' | 'video' | 'audio' | 'document' {
  const lower = ext.toLowerCase()
  if (IMAGE_EXT.has(lower)) return 'image'
  if (VIDEO_EXT.has(lower)) return 'video'
  if (AUDIO_EXT.has(lower)) return 'audio'
  return 'document'
}

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  created: number
  extension: string
  category: 'image' | 'video' | 'audio' | 'document' | 'folder'
}

interface FolderNode {
  name: string
  path: string
  children: FolderNode[] | null
}

// Batched file reading — process 50 at a time to avoid overwhelming the FS
async function readDirectoryContents(dirPath: string): Promise<FileItem[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const items: FileItem[] = []
    const BATCH = 50

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH)
      const results = await Promise.all(
        batch.map(async (entry) => {
          try {
            const fullPath = join(dirPath, entry.name)
            const ext = entry.isDirectory() ? '' : extname(entry.name)
            if (!entry.isDirectory() && isHiddenFile(entry.name, ext)) return null
            const fileStat = await stat(fullPath)
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: fileStat.size,
              modified: fileStat.mtimeMs,
              created: fileStat.birthtimeMs,
              extension: ext.toLowerCase(),
              category: entry.isDirectory() ? 'folder' : getFileCategory(ext)
            } as FileItem
          } catch {
            return null
          }
        })
      )
      items.push(...results.filter((r): r is FileItem => r !== null))
    }

    return items
  } catch (err) {
    throw err
  }
}

async function getFolderChildren(dirPath: string): Promise<FolderNode[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        name: e.name,
        path: join(dirPath, e.name),
        children: null
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

// Batched recursive walk for search index; optional onProgress(count) called after each batch
async function buildSearchIndex(
  rootPath: string,
  onProgress?: (count: number) => void
): Promise<FileItem[]> {
  const results: FileItem[] = []
  const BATCH = 50

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      const subdirs: string[] = []

      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries.slice(i, i + BATCH)
        const batchResults = await Promise.all(
          batch.map(async (entry) => {
            const fullPath = join(dir, entry.name)
            const ext = entry.isDirectory() ? '' : extname(entry.name)
            if (!entry.isDirectory() && isHiddenFile(entry.name, ext)) return null
            try {
              const fileStat = await stat(fullPath)
              if (entry.isDirectory()) subdirs.push(fullPath)
              return {
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                size: fileStat.size,
                modified: fileStat.mtimeMs,
                created: fileStat.birthtimeMs,
                extension: ext.toLowerCase(),
                category: entry.isDirectory() ? 'folder' : getFileCategory(ext)
              } as FileItem
            } catch {
              return null
            }
          })
        )
        results.push(...batchResults.filter((r): r is FileItem => r !== null))
        onProgress?.(results.length)
      }

      // Walk subdirectories sequentially to avoid overwhelming FS
      for (const subdir of subdirs) {
        await walk(subdir)
      }
    } catch {
      // Skip inaccessible
    }
  }

  await walk(rootPath)
  return results
}

/** Duplicate group: same content (verified by hash). */
interface DuplicateGroup {
  key: string
  files: FileItem[]
}

const DUPLICATE_HASH_CHUNK = 256 * 1024 // 256KB chunks for streaming

/** Stream file and compute hash without loading into memory. */
function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath, { highWaterMark: DUPLICATE_HASH_CHUNK })
    stream.on('data', (chunk: Buffer) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/** Yield to event loop so IPC and UI stay responsive. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((r) => setImmediate(r))
}

/**
 * Find duplicates: group by name + size (fast), then verify by content hash.
 * Only returns groups where at least two files have identical content. Yields between
 * hashing each file so the UI does not freeze.
 */
async function findDuplicates(rootPath: string): Promise<DuplicateGroup[]> {
  const allFiles = await buildSearchIndex(rootPath)
  const filesOnly = allFiles.filter((f) => !f.isDirectory)
  const byNameAndSize = new Map<string, FileItem[]>()
  for (const f of filesOnly) {
    const key = `${f.name}\t${f.size}`
    let list = byNameAndSize.get(key)
    if (!list) {
      list = []
      byNameAndSize.set(key, list)
    }
    list.push(f)
  }

  const groups: DuplicateGroup[] = []
  for (const [key, candidates] of byNameAndSize.entries()) {
    if (candidates.length < 2) continue
    const byHash = new Map<string, FileItem[]>()
    for (const file of candidates) {
      await yieldToEventLoop()
      try {
        const hash = await hashFile(file.path)
        let list = byHash.get(hash)
        if (!list) {
          list = []
          byHash.set(hash, list)
        }
        list.push(file)
      } catch {
        // Skip file if unreadable (deleted, permission, etc.)
      }
    }
    for (const [, files] of byHash.entries()) {
      if (files.length >= 2) groups.push({ key, files })
    }
  }
  return groups
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Thumbnail cache (LRU cap)
// ---------------------------------------------------------------------------

const MAX_THUMB_CACHE = 500
const THUMBNAIL_MAX_DIM = 200
const thumbnailCache = new Map<string, string>()

function evictThumbnailIfNeeded(): void {
  if (thumbnailCache.size >= MAX_THUMB_CACHE) {
    const first = thumbnailCache.keys().next()
    if (!first.done) thumbnailCache.delete(first.value)
  }
}

async function generateThumbnail(filePath: string): Promise<string | null> {
  if (thumbnailCache.has(filePath)) {
    return thumbnailCache.get(filePath)!
  }
  try {
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null

    const size = image.getSize()
    const scale = Math.min(THUMBNAIL_MAX_DIM / size.width, THUMBNAIL_MAX_DIM / size.height, 1)

    const resized = scale < 1
      ? image.resize({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
          quality: 'good'
        })
      : image

    const jpeg = resized.toJPEG(70)
    const result = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    evictThumbnailIfNeeded()
    thumbnailCache.set(filePath, result)
    return result
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Audio metadata cache (LRU cap)
// ---------------------------------------------------------------------------

const MAX_AUDIO_META_CACHE = 300
const audioMetaCache = new Map<string, object | null>()

function evictAudioMetaIfNeeded(): void {
  if (audioMetaCache.size >= MAX_AUDIO_META_CACHE) {
    const first = audioMetaCache.keys().next()
    if (!first.done) audioMetaCache.delete(first.value)
  }
}

async function getAudioMetadata(filePath: string) {
  if (audioMetaCache.has(filePath)) {
    return audioMetaCache.get(filePath)
  }
  try {
    const mm = require('music-metadata')
    const metadata = await mm.parseFile(filePath, { skipCovers: false })
    const picture = metadata.common.picture?.[0]
    const result = {
      title: metadata.common.title ?? null,
      artist: metadata.common.artist ?? null,
      album: metadata.common.album ?? null,
      duration: metadata.format.duration ?? null,
      cover: picture
        ? `data:${picture.format};base64,${picture.data.toString('base64')}`
        : null
    }
    evictAudioMetaIfNeeded()
    audioMetaCache.set(filePath, result)
    return result
  } catch {
    evictAudioMetaIfNeeded()
    audioMetaCache.set(filePath, null)
    return null
  }
}

// ---------------------------------------------------------------------------
// Local HTTP media server (enables reliable Range requests for video/audio)
// ---------------------------------------------------------------------------

function startMediaServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    mediaServer = createServer((req, res) => {
      if (!req.url || req.method !== 'GET') {
        res.writeHead(405)
        res.end()
        return
      }

      let filePath: string
      try {
        filePath = decodeURIComponent(req.url.slice(1))
      } catch {
        res.writeHead(400)
        res.end('Bad Request')
        return
      }

      if (!isPathUnderRoot(filePath)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }

      let fileSize: number
      try {
        fileSize = statSync(filePath).size
      } catch {
        res.writeHead(404)
        res.end('Not Found')
        return
      }

      const ext = extname(filePath).toLowerCase()
      const contentType = MEDIA_MIME_TYPES[ext] || 'application/octet-stream'
      const rangeHeader = req.headers.range

      if (rangeHeader) {
        const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
        if (!match) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
          res.end()
          return
        }
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
        if (start >= fileSize || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
          res.end()
          return
        }
        const chunkSize = end - start + 1
        res.writeHead(206, {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        })
        createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        })
        createReadStream(filePath).pipe(res)
      }
    })

    mediaServer.listen(0, '127.0.0.1', () => {
      const addr = mediaServer!.address()
      if (addr && typeof addr === 'object') {
        mediaServerPort = addr.port
        resolve(mediaServerPort)
      } else {
        reject(new Error('Failed to start media server'))
      }
    })

    mediaServer.on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  protocol.handle('media-file', async (request) => {
    const raw = request.url.slice('media-file:///'.length)
    const filePath = decodeURIComponent(raw)
    if (!isPathUnderRoot(filePath)) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = await readFile(filePath)
      const ext = extname(filePath).toLowerCase()
      const contentType = MEDIA_MIME_TYPES[ext] || 'application/octet-stream'
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': contentType, 'Content-Length': String(data.length) }
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  ipcMain.handle('get-sections', () => ({ ...MEDIA_SECTIONS }))

  ipcMain.handle('get-app-config', () => ({
    sections: { ...MEDIA_SECTIONS },
    uiState: { ...UI_STATE },
    mediaServerPort
  }))

  ipcMain.handle('get-media-port', () => mediaServerPort)

  ipcMain.handle(
    'set-ui-state',
    async (_event, uiState: Partial<UiState>) => {
      if (uiState && typeof uiState === 'object') {
        UI_STATE = { ...UI_STATE, ...uiState }
        await saveConfig()
      }
    }
  )

  ipcMain.handle('path-exists', async (_event, path: string) => {
    if (!path || typeof path !== 'string') return false
    const roots = getAllowedRoots()
    const resolved = normalize(resolve(path))
    const isUnderRoot = roots.some(
      (r) => pathEquals(resolved, r) || (resolved.length > r.length && (resolved.startsWith(r + sep) || (platform() === 'win32' && resolved.toLowerCase().startsWith((r + sep).toLowerCase()))))
    )
    if (!isUnderRoot) return false
    return pathExists(path)
  })

  ipcMain.handle('get-app-version', () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require(join(app.getAppPath(), 'package.json'))
      return pkg?.version ?? '1.0.0'
    } catch {
      return '1.0.0'
    }
  })

  ipcMain.handle(
    'set-section-path',
    async (_event, sectionId: string, path: string) => {
      if (!(sectionId in DEFAULT_SECTIONS)) return false
      const normalized = normalize(resolve(path))
      MEDIA_SECTIONS[sectionId] = normalized
      await saveConfig()
      return true
    }
  )

  ipcMain.handle('get-favorites', async () => loadFavorites())
  ipcMain.handle('set-favorites', async (_event, paths: string[]) => {
    const valid = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
    await saveFavorites(valid)
  })

  ipcMain.handle('get-files', async (_event, dirPath: string) => {
    if (!dirPath || String(dirPath).trim() === '') {
      return { ok: false as const, error: 'No folder path set. Open Settings to choose a folder for this section.' }
    }
    const normalizedPath = normalize(resolve(dirPath))
    if (!isPathUnderRoot(normalizedPath)) {
      return { ok: false as const, error: 'Path not allowed. The folder may be outside your library—check Settings.' }
    }
    try {
      const files = await readDirectoryContents(normalizedPath)
      return { ok: true as const, files }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
      let message = err instanceof Error ? err.message : 'Failed to read folder'
      if (code === 'ENOENT') message = 'This folder does not exist. Open Settings to choose a valid folder.'
      else if (code === 'EACCES') message = 'Access denied to this folder. Check permissions or choose another in Settings.'
      return { ok: false as const, error: message }
    }
  })

  ipcMain.handle('get-folder-children', async (_event, dirPath: string) => {
    if (!dirPath || String(dirPath).trim() === '') {
      return { ok: false as const, error: 'No folder path set.' }
    }
    const normalizedPath = normalize(resolve(dirPath))
    if (!isPathUnderRoot(normalizedPath)) {
      return { ok: false as const, error: 'Path not allowed. The folder may be outside your library.' }
    }
    try {
      const children = await getFolderChildren(normalizedPath)
      return { ok: true as const, children }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
      let message = err instanceof Error ? err.message : 'Failed to read folder'
      if (code === 'ENOENT') message = 'This folder does not exist.'
      else if (code === 'EACCES') message = 'Access denied to this folder.'
      return { ok: false as const, error: message }
    }
  })

  ipcMain.handle('build-search-index', async (_event, rootPath: string) => {
    if (!rootPath || String(rootPath).trim() === '') {
      return { ok: false as const, error: 'No folder path set.' }
    }
    const normalizedPath = normalize(resolve(rootPath))
    if (!isPathUnderRoot(normalizedPath)) {
      return { ok: false as const, error: 'Path not allowed. The folder may be outside your library.' }
    }
    try {
      await access(normalizedPath).catch(() => {
        throw new Error('This folder does not exist or is not accessible.')
      })
      const files = await buildSearchIndex(normalizedPath, (count) => {
        mainWindow?.webContents.send('search-index-progress', count)
      })
      return { ok: true as const, files }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : ''
      let message = err instanceof Error ? err.message : 'Failed to build search index'
      if (code === 'ENOENT') message = 'This folder does not exist. Open Settings to choose a valid folder.'
      else if (code === 'EACCES') message = 'Access denied to this folder.'
      return { ok: false as const, error: message }
    }
  })

  ipcMain.handle('find-duplicates', async (_event, rootPath: string) => {
    if (!rootPath || String(rootPath).trim() === '') {
      return { ok: false as const, error: 'No folder path set. Open Settings to choose a folder for this section.' }
    }
    const normalizedPath = normalize(resolve(rootPath))
    if (!isPathUnderRoot(normalizedPath)) {
      return { ok: false as const, error: 'Path not allowed. The folder may be outside your library—check Settings.' }
    }
    try {
      const groups = await findDuplicates(normalizedPath)
      return { ok: true as const, groups }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan for duplicates'
      return { ok: false as const, error: message }
    }
  })

  // Thumbnail generation (resized, cached)
  ipcMain.handle('get-thumbnail', async (_event, filePath: string) => {
    if (!isPathUnderRoot(filePath)) return null
    return generateThumbnail(filePath)
  })

  // Audio metadata with embedded cover art
  ipcMain.handle('get-audio-metadata', async (_event, filePath: string) => {
    if (!isPathUnderRoot(filePath)) return null
    return getAudioMetadata(filePath)
  })

  // Read text file content for preview
  ipcMain.handle(
    'read-text-file',
    async (_event, filePath: string, maxLines: number = 150) => {
      if (!isPathUnderRoot(filePath)) return null
      const ext = extname(filePath).toLowerCase()
      if (!TEXT_EXT.has(ext) && ext !== '.pdf') return null

      try {
        return new Promise<string>((resolve) => {
          const lines: string[] = []
          const rl = createInterface({
            input: createReadStream(filePath, { encoding: 'utf-8' }),
            crlfDelay: Infinity
          })

          rl.on('line', (line) => {
            lines.push(line)
            if (lines.length >= maxLines) rl.close()
          })

          rl.on('close', () => resolve(lines.join('\n')))
          rl.on('error', () => resolve(''))
        })
      } catch {
        return null
      }
    }
  )

  // Move files
  ipcMain.handle(
    'move-files',
    async (_event, sources: string[], destination: string) => {
      if (!isPathUnderRoot(destination)) {
        return sources.map((s) => ({ source: s, success: false, error: 'Destination not allowed' }))
      }
      const results: { source: string; success: boolean; error?: string }[] = []

      for (const source of sources) {
        if (!isPathUnderRoot(source)) {
          results.push({ source, success: false, error: 'Path not allowed' })
          continue
        }
        const fileName = basename(source)
        const destPath = join(destination, fileName)

        try {
          if (await pathExists(destPath)) {
            const ext = extname(fileName)
            const nameWithoutExt = ext ? fileName.slice(0, -ext.length) : fileName
            let counter = 1
            let newDestPath = destPath
            while (await pathExists(newDestPath)) {
              newDestPath = join(destination, `${nameWithoutExt} (${counter})${ext}`)
              counter++
            }
            await rename(source, newDestPath)
          } else {
            await rename(source, destPath)
          }
          results.push({ source, success: true })
        } catch (err) {
          results.push({
            source,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      return results
    }
  )

  // Copy files (same UX as move; only regular files, not directories)
  ipcMain.handle(
    'copy-files',
    async (_event, sources: string[], destination: string) => {
      if (!isPathUnderRoot(destination)) {
        return sources.map((s) => ({ source: s, success: false, error: 'Destination not allowed' }))
      }
      const results: { source: string; success: boolean; error?: string }[] = []

      for (const source of sources) {
        if (!isPathUnderRoot(source)) {
          results.push({ source, success: false, error: 'Path not allowed' })
          continue
        }
        const fileStat = await stat(source).catch(() => null)
        if (!fileStat || fileStat.isDirectory()) {
          results.push({ source, success: false, error: 'Copy supports files only' })
          continue
        }
        const fileName = basename(source)
        let destPath = join(destination, fileName)

        try {
          if (await pathExists(destPath)) {
            const ext = extname(fileName)
            const nameWithoutExt = ext ? fileName.slice(0, -ext.length) : fileName
            let counter = 1
            while (await pathExists(destPath)) {
              destPath = join(destination, `${nameWithoutExt} (${counter})${ext}`)
              counter++
            }
          }
          await copyFile(source, destPath)
          results.push({ source, success: true })
        } catch (err) {
          results.push({
            source,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      return results
    }
  )

  ipcMain.handle(
    'rename-item',
    async (_event, oldPath: string, newName: string) => {
      if (!isPathUnderRoot(oldPath)) {
        throw new Error('Path not allowed')
      }
      if (!sanitizeRenameName(newName)) {
        throw new Error('Invalid name: cannot contain .. or path separators')
      }
      const dir = dirname(oldPath)
      const newPath = join(dir, newName)

      if (await pathExists(newPath)) {
        throw new Error(`"${newName}" already exists in this folder`)
      }

      await rename(oldPath, newPath)
      return { oldPath, newPath, newName }
    }
  )

  ipcMain.handle(
    'create-folder',
    async (_event, parentPath: string, name: string) => {
      if (!isPathUnderRoot(parentPath)) {
        throw new Error('Path not allowed')
      }
      if (!sanitizeRenameName(name)) {
        throw new Error('Invalid name: cannot contain .. or path separators')
      }
      const folderPath = join(parentPath, name)

      if (await pathExists(folderPath)) {
        throw new Error(`"${name}" already exists`)
      }

      await mkdir(folderPath, { recursive: true })
      return folderPath
    }
  )

  ipcMain.handle('trash-files', async (_event, paths: string[]) => {
    const results: { path: string; success: boolean; error?: string }[] = []
    for (const filePath of paths) {
      if (!isPathUnderRoot(filePath)) {
        results.push({ path: filePath, success: false, error: 'Path not allowed' })
        continue
      }
      try {
        await shell.trashItem(filePath)
        results.push({ path: filePath, success: true })
      } catch (err) {
        results.push({
          path: filePath,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }
    return results
  })

  ipcMain.handle('open-file', async (_event, filePath: string) => {
    if (!isPathUnderRoot(filePath)) return
    await shell.openPath(filePath)
  })

  ipcMain.handle('open-in-explorer', (_event, filePath: string) => {
    if (!isPathUnderRoot(filePath)) return
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('pick-folder', async (_event, defaultPath?: string) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window-close', () => mainWindow?.close())
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

app.whenReady().then(async () => {
  await loadConfig()
  await startMediaServer()
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
