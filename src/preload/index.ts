import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getSections: (): Promise<Record<string, string>> =>
    ipcRenderer.invoke('get-sections'),
  getAppConfig: (): Promise<{ sections: Record<string, string>; uiState: Record<string, unknown> }> =>
    ipcRenderer.invoke('get-app-config'),
  setUiState: (uiState: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('set-ui-state', uiState),
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-app-version'),
  pathExists: (path: string): Promise<boolean> =>
    ipcRenderer.invoke('path-exists', path),
  setSectionPath: (sectionId: string, path: string): Promise<boolean> =>
    ipcRenderer.invoke('set-section-path', sectionId, path),

  getFavorites: (): Promise<string[]> => ipcRenderer.invoke('get-favorites'),
  setFavorites: (paths: string[]): Promise<void> => ipcRenderer.invoke('set-favorites', paths),

  getFiles: (dirPath: string) => ipcRenderer.invoke('get-files', dirPath),
  getFolderChildren: (dirPath: string) =>
    ipcRenderer.invoke('get-folder-children', dirPath),
  buildSearchIndex: (rootPath: string) =>
    ipcRenderer.invoke('build-search-index', rootPath),
  subscribeSearchIndexProgress: (callback: (count: number) => void) => {
    const handler = (_: unknown, count: number) => callback(count)
    ipcRenderer.on('search-index-progress', handler)
    return () => ipcRenderer.removeListener('search-index-progress', handler)
  },
  findDuplicates: (rootPath: string) =>
    ipcRenderer.invoke('find-duplicates', rootPath),
  moveFiles: (sources: string[], destination: string) =>
    ipcRenderer.invoke('move-files', sources, destination),
  copyFiles: (sources: string[], destination: string) =>
    ipcRenderer.invoke('copy-files', sources, destination),
  renameItem: (oldPath: string, newName: string) =>
    ipcRenderer.invoke('rename-item', oldPath, newName),
  createFolder: (parentPath: string, name: string) =>
    ipcRenderer.invoke('create-folder', parentPath, name),
  trashFiles: (paths: string[]) => ipcRenderer.invoke('trash-files', paths),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  openInExplorer: (filePath: string) =>
    ipcRenderer.invoke('open-in-explorer', filePath),
  pickFolder: (defaultPath?: string) =>
    ipcRenderer.invoke('pick-folder', defaultPath),

  // Thumbnail & metadata
  getThumbnail: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('get-thumbnail', filePath),
  getAudioMetadata: (
    filePath: string
  ): Promise<{
    title: string | null
    artist: string | null
    album: string | null
    duration: number | null
    cover: string | null
  } | null> => ipcRenderer.invoke('get-audio-metadata', filePath),
  readTextFile: (filePath: string, maxLines?: number): Promise<string | null> =>
    ipcRenderer.invoke('read-text-file', filePath, maxLines),

  // Media server
  getMediaPort: (): Promise<number> => ipcRenderer.invoke('get-media-port'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized')
} as const

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
