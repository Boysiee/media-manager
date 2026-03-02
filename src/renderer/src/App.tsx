import { useEffect, useState } from 'react'
import { useFileStore } from './stores/fileStore'
import { setApiErrorNotifier } from './api'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import FileGrid from './components/FileGrid'
import PreviewPanel from './components/PreviewPanel'
import StatusBar from './components/StatusBar'
import ContextMenu from './components/ContextMenu'
import MoveDialog from './components/MoveDialog'
import BatchRenameDialog from './components/BatchRenameDialog'
import DuplicatesDialog from './components/DuplicatesDialog'
import MisplacedFilesDialog from './components/MisplacedFilesDialog'
import SettingsDialog from './components/SettingsDialog'
import Notifications from './components/Notifications'
import KeyboardShortcutHelp from './components/KeyboardShortcutHelp'

export default function App() {
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const init = useFileStore((s) => s.init)
  const initError = useFileStore((s) => s.initError)
  const clearInitError = useFileStore((s) => s.clearInitError)
  const isPreviewOpen = useFileStore((s) => s.isPreviewOpen)
  const contextMenu = useFileStore((s) => s.contextMenu)
  const setContextMenu = useFileStore((s) => s.setContextMenu)
  const clearSelection = useFileStore((s) => s.clearSelection)
  const moveDialogMode = useFileStore((s) => s.moveDialogMode)
  const batchRenameOpen = useFileStore((s) => s.batchRenameOpen)
  const isSettingsOpen = useFileStore((s) => s.isSettingsOpen)
  const isDuplicatesDialogOpen = useFileStore((s) => s.isDuplicatesDialogOpen)
  const isMisplacedDialogOpen = useFileStore((s) => s.isMisplacedDialogOpen)

  useEffect(() => {
    setApiErrorNotifier((message) => {
      useFileStore.getState().addNotification('error', message)
    })
    return () => setApiErrorNotifier(null)
  }, [])

  useEffect(() => {
    init()
  }, [init])

  // Global keyboard shortcuts — must run before any conditional return (hooks rule)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const store = useFileStore.getState()

      // Escape: close context menu, cancel rename, close move dialog, clear selection
      if (e.key === 'Escape') {
        if (showShortcutHelp) {
          setShowShortcutHelp(false)
          return
        }
        if (store.contextMenu) {
          store.setContextMenu(null)
          return
        }
        if (store.renamingPath) {
          store.setRenamingPath(null)
          return
        }
        if (store.moveDialogMode) {
          store.setMoveDialogOpen(false)
          return
        }
        if (store.batchRenameOpen) {
          store.setBatchRenameOpen(false)
          return
        }
        if (store.isSettingsOpen) {
          store.setSettingsOpen(false)
          return
        }
        if (store.isDuplicatesDialogOpen) {
          store.setDuplicatesDialogOpen(false)
          return
        }
        if (store.isMisplacedDialogOpen) {
          store.setMisplacedDialogOpen(false)
          return
        }
        store.clearSelection()
        return
      }

      // Don't trigger shortcuts when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // ? or Ctrl+/: keyboard shortcut help
      if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcutHelp((v) => !v)
        return
      }

      // Ctrl+A: select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        store.selectAll()
        return
      }

      // F2: rename selected
      if (e.key === 'F2') {
        e.preventDefault()
        const selected = Array.from(store.selectedFiles)
        if (selected.length === 1) {
          store.setRenamingPath(selected[0])
        }
        return
      }

      // Ctrl+Shift+N: new folder
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        store.createFolder('New Folder')
        return
      }

      // Delete: trash selected
      if (e.key === 'Delete' && store.selectedFiles.size > 0) {
        e.preventDefault()
        store.trashSelected()
        return
      }

      // M: open move dialog
      if (e.key === 'm' && store.selectedFiles.size > 0) {
        e.preventDefault()
        store.setMoveDialogOpen(true, 'move')
        return
      }

      // Ctrl+Z: undo last move/rename
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        if (store.operations.length > 0) store.undoLastOperation()
        return
      }

      // Backspace or Alt+Left: go back
      if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault()
        store.goBack()
        return
      }

      // Alt+Right: go forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        store.goForward()
        return
      }

      // Alt+Up: go up
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault()
        store.goUp()
        return
      }

      // Ctrl+P: toggle preview
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        store.togglePreview()
        return
      }

      // F5: refresh
      if (e.key === 'F5') {
        e.preventDefault()
        store.refresh()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showShortcutHelp])

  const theme = useFileStore((s) => s.theme)

  if (initError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-100 p-8">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <h1 className="text-lg font-semibold text-neutral-100">
            Failed to load library
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {initError}
          </p>
          <button
            onClick={() => {
              clearInitError()
              init()
            }}
            className="px-4 py-2.5 bg-accent/20 text-accent-light text-sm font-medium rounded-lg
                       hover:bg-accent/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${theme === 'light' ? 'light-theme' : ''}`}
      data-theme={theme}
    >
      <div className="h-full w-full flex flex-col bg-surface-100 overflow-hidden">
        <TitleBar />

        <div className="flex flex-1 min-h-0">
          <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <FileGrid />
          <StatusBar />
        </div>

        {isPreviewOpen && <PreviewPanel />}
      </div>

      {/* Overlays */}
      {contextMenu && (
        <div
          className="context-menu-backdrop"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu(null)
          }}
        >
          <ContextMenu />
        </div>
      )}

      {moveDialogMode && <MoveDialog mode={moveDialogMode} />}
      {batchRenameOpen && <BatchRenameDialog />}
      {isDuplicatesDialogOpen && <DuplicatesDialog />}
      {isMisplacedDialogOpen && <MisplacedFilesDialog />}
      {isSettingsOpen && <SettingsDialog />}
      {showShortcutHelp && <KeyboardShortcutHelp onClose={() => setShowShortcutHelp(false)} />}

      <Notifications />
      </div>
    </div>
  )
}
