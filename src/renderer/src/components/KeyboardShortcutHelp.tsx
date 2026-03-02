import { X } from 'lucide-react'

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Ctrl+F', description: 'Focus search' },
  { keys: 'Ctrl+P', description: 'Toggle preview panel' },
  { keys: 'Ctrl+A', description: 'Select all' },
  { keys: 'Ctrl+Z', description: 'Undo last move/rename' },
  { keys: 'Ctrl+Shift+N', description: 'New folder' },
  { keys: 'F2', description: 'Rename selected' },
  { keys: 'Delete', description: 'Move selected to Recycle Bin' },
  { keys: 'M', description: 'Move selected to…' },
  { keys: 'Alt+Left', description: 'Back' },
  { keys: 'Alt+Right', description: 'Forward' },
  { keys: 'Alt+Up', description: 'Up one folder' },
  { keys: 'F5', description: 'Refresh' },
  { keys: 'Escape', description: 'Close dialog / clear selection' },
  { keys: '? or Ctrl+/', description: 'Show this help' },
  { keys: 'Tools menu', description: 'Find duplicates…' },
  { keys: 'Tools menu', description: 'Find misplaced files…' }
]

interface KeyboardShortcutHelpProps {
  onClose: () => void
}

export default function KeyboardShortcutHelp({ onClose }: KeyboardShortcutHelpProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        className="w-[380px] max-h-[85vh] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20">
          <h2 id="shortcut-help-title" className="text-[14px] font-semibold text-neutral-100">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <ul className="space-y-2" role="list">
            {SHORTCUTS.map(({ keys, description }) => (
              <li
                key={keys}
                className="flex items-center justify-between gap-4 text-[13px]"
                role="listitem"
              >
                <span className="text-neutral-300">{description}</span>
                <kbd className="px-2 py-0.5 bg-surface-400/50 border border-surface-500/40 rounded text-[11px] font-mono text-neutral-200 shrink-0">
                  {keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
