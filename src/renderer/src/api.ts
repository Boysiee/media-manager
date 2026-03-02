/**
 * Centralized API layer over window.api.
 * Catches rejections and reports them via a configurable notifier so the UI
 * can show toasts instead of failing silently. Set the notifier from App.tsx
 * so this module does not depend on the store.
 */

type ErrorNotifier = (message: string) => void

let errorNotifier: ErrorNotifier | null = null

export function setApiErrorNotifier(notifier: ErrorNotifier | null): void {
  errorNotifier = notifier
}

function notify(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  errorNotifier?.(message)
}

async function wrap<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (err) {
    notify(err)
    throw err
  }
}

// Re-export typed wrappers for all IPC calls that can fail and should show a toast
export const api = {
  getAppConfig: (): Promise<{ sections: Record<string, string>; uiState: Record<string, unknown>; mediaServerPort?: number }> =>
    wrap(window.api.getAppConfig()),

  getAppVersion: (): Promise<string> =>
    wrap(window.api.getAppVersion()),

  pathExists: (path: string): Promise<boolean> =>
    wrap(window.api.pathExists(path)),

  setUiState: (uiState: Record<string, unknown>): Promise<void> =>
    wrap(window.api.setUiState(uiState)),

  setSectionPath: (sectionId: string, path: string): Promise<boolean> =>
    wrap(window.api.setSectionPath(sectionId, path)),

  getFavorites: (): Promise<string[]> =>
    typeof window.api?.getFavorites === 'function'
      ? wrap(window.api.getFavorites())
      : Promise.resolve([]),

  setFavorites: (paths: string[]): Promise<void> =>
    typeof window.api?.setFavorites === 'function'
      ? wrap(window.api.setFavorites(paths))
      : Promise.resolve(),

  getFiles: (dirPath: string): Promise<{ ok: boolean; files?: import('./types').FileItem[]; error?: string }> =>
    wrap(window.api.getFiles(dirPath)),

  getFolderChildren: (
    dirPath: string
  ): Promise<
    | { ok: true; children: import('./types').FolderNode[] }
    | { ok: false; error: string }
  > => wrap(window.api.getFolderChildren(dirPath)),

  buildSearchIndex: (
    rootPath: string
  ): Promise<
    | { ok: true; files: import('./types').FileItem[] }
    | { ok: false; error: string }
  > => wrap(window.api.buildSearchIndex(rootPath)),

  findDuplicates: (
    rootPath: string
  ): Promise<
    | { ok: true; groups: { key: string; files: import('./types').FileItem[] }[] }
    | { ok: false; error: string }
  > => wrap(window.api.findDuplicates(rootPath)),

  moveFiles: (sources: string[], destination: string): Promise<{ source: string; success: boolean; error?: string }[]> =>
    wrap(window.api.moveFiles(sources, destination)),

  copyFiles: (sources: string[], destination: string): Promise<{ source: string; success: boolean; error?: string }[]> =>
    wrap(window.api.copyFiles(sources, destination)),

  renameItem: (oldPath: string, newName: string): Promise<void> =>
    wrap(window.api.renameItem(oldPath, newName)),

  createFolder: (parentPath: string, name: string): Promise<string> =>
    wrap(window.api.createFolder(parentPath, name)),

  trashFiles: (paths: string[]): Promise<{ path: string; success: boolean; error?: string }[]> =>
    wrap(window.api.trashFiles(paths)),

  openFile: (filePath: string): Promise<void> =>
    wrap(window.api.openFile(filePath)),

  openInExplorer: (filePath: string): Promise<void> =>
    wrap(window.api.openInExplorer(filePath)),

  pickFolder: (defaultPath?: string): Promise<string | null> =>
    wrap(window.api.pickFolder(defaultPath)),

  getThumbnail: (filePath: string): Promise<string | null> =>
    wrap(window.api.getThumbnail(filePath)),

  getAudioMetadata: (
    filePath: string
  ): Promise<{ title: string | null; artist: string | null; album: string | null; duration: number | null; cover: string | null } | null> =>
    wrap(window.api.getAudioMetadata(filePath)),

  readTextFile: (filePath: string, maxLines?: number): Promise<string | null> =>
    wrap(window.api.readTextFile(filePath, maxLines)),

  getMediaPort: (): Promise<number> =>
    wrap(window.api.getMediaPort())
}

// Window controls and isMaximized are less critical for global error toasts; keep using window.api where needed
// or add here if you want them to go through the same notifier on failure
