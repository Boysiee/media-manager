import { useState, useEffect } from 'react'
import { X, FolderOpen, Sun, Moon } from 'lucide-react'

async function getVersion(): Promise<string> {
  try {
    return await window.api.getAppVersion()
  } catch {
    return '1.0.0'
  }
}
import { useFileStore } from '../stores/fileStore'
import { SECTION_CONFIG, type MediaSection } from '../types'

export default function SettingsDialog() {
  const sections = useFileStore((s) => s.sections)
  const setSections = useFileStore((s) => s.setSections)
  const activeSection = useFileStore((s) => s.activeSection)
  const setActiveSection = useFileStore((s) => s.setActiveSection)
  const setSettingsOpen = useFileStore((s) => s.setSettingsOpen)
  const addNotification = useFileStore((s) => s.addNotification)
  const theme = useFileStore((s) => s.theme)
  const setTheme = useFileStore((s) => s.setTheme)

  const [paths, setPaths] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    setPaths(sections)
  }, [sections])

  useEffect(() => {
    getVersion().then(setVersion)
  }, [])

  const handleBrowse = async (sectionId: MediaSection) => {
    const currentPath = paths[sectionId] || ''
    setSaving(sectionId)
    try {
      const newPath = await window.api.pickFolder(currentPath)
      if (newPath) {
        const ok = await window.api.setSectionPath(sectionId, newPath)
        if (ok) {
          const updated = await window.api.getSections()
          setSections(updated)
          setPaths(updated)
          setActiveSection(activeSection)
          addNotification('success', `"${SECTION_CONFIG[sectionId].label}" path updated`)
        }
      }
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Failed to set path')
    } finally {
      setSaving(null)
    }
  }

  const sectionIds = Object.keys(SECTION_CONFIG) as MediaSection[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div
        className="w-[480px] max-h-[80vh] bg-surface-200 border border-surface-500/40 rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/20">
          <h2 className="text-[14px] font-semibold text-neutral-100">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-surface-400/40 transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="mb-4">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border transition-colors
                  ${theme === 'light' ? 'bg-accent/20 border-accent/50 text-accent-light' : 'bg-surface-300 border-surface-500/40 text-neutral-400 hover:text-neutral-200'}`}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border transition-colors
                  ${theme === 'dark' ? 'bg-accent/20 border-accent/50 text-accent-light' : 'bg-surface-300 border-surface-500/40 text-neutral-400 hover:text-neutral-200'}`}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>
          <p className="text-[12px] text-neutral-400 mb-4">
            Choose the folder for each library section. Paths are saved automatically.
          </p>
          <div className="space-y-4">
            {sectionIds.map((id) => (
              <div key={id} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  {SECTION_CONFIG[id].label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paths[id] ?? ''}
                    className="flex-1 h-8 px-3 bg-surface-300 border border-surface-500/40 rounded-md text-[12px] text-neutral-300 font-mono truncate"
                  />
                  <button
                    onClick={() => handleBrowse(id)}
                    disabled={saving !== null}
                    className="h-8 px-3 flex items-center gap-2 bg-surface-400/50 hover:bg-surface-500/50 text-neutral-300 rounded-md text-[12px] transition-colors disabled:opacity-50"
                    title="Browse for folder"
                  >
                    <FolderOpen size={14} />
                    {saving === id ? '...' : 'Browse'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {version && (
            <p className="mt-4 pt-4 border-t border-surface-500/20 text-[11px] text-neutral-500">
              Media Manager v{version}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
