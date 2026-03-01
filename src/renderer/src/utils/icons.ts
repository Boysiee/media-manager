import {
  Folder,
  Image,
  Film,
  Music,
  FileText,
  File,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  FileJson,
  type LucideIcon
} from 'lucide-react'

interface IconInfo {
  icon: LucideIcon
  color: string
}

const DOC_ICONS: Record<string, IconInfo> = {
  '.pdf': { icon: FileText, color: '#ef4444' },
  '.doc': { icon: FileText, color: '#3b82f6' },
  '.docx': { icon: FileText, color: '#3b82f6' },
  '.xls': { icon: FileSpreadsheet, color: '#22c55e' },
  '.xlsx': { icon: FileSpreadsheet, color: '#22c55e' },
  '.csv': { icon: FileSpreadsheet, color: '#22c55e' },
  '.ppt': { icon: File, color: '#f97316' },
  '.pptx': { icon: File, color: '#f97316' },
  '.txt': { icon: FileText, color: '#a3a3a3' },
  '.md': { icon: FileCode, color: '#a78bfa' },
  '.rtf': { icon: FileText, color: '#a3a3a3' },
  '.json': { icon: FileJson, color: '#eab308' },
  '.xml': { icon: FileCode, color: '#f97316' },
  '.yaml': { icon: FileCode, color: '#a78bfa' },
  '.yml': { icon: FileCode, color: '#a78bfa' },
  '.html': { icon: FileCode, color: '#f472b6' },
  '.htm': { icon: FileCode, color: '#f472b6' },
  '.css': { icon: FileCode, color: '#38bdf8' },
  '.js': { icon: FileCode, color: '#eab308' },
  '.ts': { icon: FileCode, color: '#3b82f6' },
  '.py': { icon: FileCode, color: '#22c55e' },
  '.zip': { icon: FileArchive, color: '#eab308' },
  '.rar': { icon: FileArchive, color: '#eab308' },
  '.7z': { icon: FileArchive, color: '#eab308' },
  '.tar': { icon: FileArchive, color: '#eab308' },
  '.gz': { icon: FileArchive, color: '#eab308' }
}

export function getFileIcon(category: string, extension: string): IconInfo {
  if (category === 'folder') return { icon: Folder, color: '#818cf8' }
  if (category === 'image') return { icon: Image, color: '#f472b6' }
  if (category === 'video') return { icon: Film, color: '#818cf8' }
  if (category === 'audio') return { icon: Music, color: '#34d399' }

  return DOC_ICONS[extension] ?? { icon: File, color: '#fb923c' }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
