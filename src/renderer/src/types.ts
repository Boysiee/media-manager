export type MediaSection = 'images' | 'videos' | 'audio' | 'documents'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  created: number
  extension: string
  category: 'image' | 'video' | 'audio' | 'document' | 'folder'
}

export interface FolderNode {
  name: string
  path: string
  children: FolderNode[] | null
}

export type ViewMode = 'grid' | 'list'
export type SortField = 'name' | 'date' | 'size' | 'type'
export type SortOrder = 'asc' | 'desc'

export interface MoveResult {
  source: string
  success: boolean
  error?: string
}

export interface RenameResult {
  oldPath: string
  newPath: string
  newName: string
}

export const SECTION_CONFIG: Record<
  MediaSection,
  { label: string; icon: string; color: string }
> = {
  images: { label: 'Images', icon: 'Image', color: '#f472b6' },
  videos: { label: 'Videos', icon: 'Film', color: '#818cf8' },
  audio: { label: 'Audio', icon: 'Music', color: '#34d399' },
  documents: { label: 'Documents', icon: 'FileText', color: '#fb923c' }
}
