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
export type SortField = 'name' | 'date' | 'size' | 'type' | 'created' | 'duration' | 'path' | 'random'
export type SortOrder = 'asc' | 'desc'
export type GridSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark'

/** Filter by file category; 'all' means no filter. */
export type SearchFilterCategory = 'all' | 'image' | 'video' | 'audio' | 'document' | 'folder'

/** Modified-after presets for search filter (timestamp offset from now). */
export type SearchFilterModified = 'any' | 'today' | 'week' | 'month' | 'year'

/** Size filter presets (min size in bytes; null = no minimum). */
export type SearchFilterSize = 'any' | '1mb' | '10mb' | '100mb'

export interface SearchFilters {
  category: SearchFilterCategory
  modified: SearchFilterModified
  sizeMin: SearchFilterSize
}

/** List view column ids in display order. */
export type ListColumnId = 'name' | 'size' | 'type' | 'modified' | 'duration'

export const LIST_COLUMN_LABELS: Record<ListColumnId, string> = {
  name: 'Name',
  size: 'Size',
  type: 'Type',
  modified: 'Modified',
  duration: 'Duration'
}

export const LIST_COLUMN_WIDTHS: Record<ListColumnId, string> = {
  name: '1fr',
  size: '100px',
  type: '100px',
  modified: '140px',
  duration: '80px'
}

/** A group of duplicate files (same name + size). */
export interface DuplicateGroup {
  key: string
  files: FileItem[]
}

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

/** Category that "belongs" in each section (for misplaced-file detection). */
export const SECTION_EXPECTED_CATEGORY: Record<MediaSection, FileItem['category']> = {
  images: 'image',
  videos: 'video',
  audio: 'audio',
  documents: 'document'
}

/** Section that matches a file category (for "Move to [Section]" suggestions). */
export const CATEGORY_TO_SECTION: Record<Exclude<FileItem['category'], 'folder'>, MediaSection> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  document: 'documents'
}
