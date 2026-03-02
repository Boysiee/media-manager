/**
 * Named constants for UI and behaviour (replaces magic numbers).
 */

/** Debounce delay for search input (ms). */
export const SEARCH_DEBOUNCE_MS = 200

/** Preview panel width bounds (px). */
export const PREVIEW_PANEL_MIN_WIDTH = 240
export const PREVIEW_PANEL_MAX_WIDTH = 520

/** Sidebar width bounds (px). */
export const SIDEBAR_MIN_WIDTH = 160
export const SIDEBAR_MAX_WIDTH = 400

/** Show a performance notice when a single folder has more than this many items. */
export const LARGE_FOLDER_WARNING_COUNT = 10_000

/** Toast notification duration: with action button vs default (ms). */
export const NOTIFICATION_WITH_ACTION_MS = 8000
export const NOTIFICATION_DEFAULT_MS = 3500

/** Max concurrent video thumbnail generations in grid. */
export const VIDEO_THUMB_MAX_CONCURRENT = 3

/** Virtual path for the Favorites view in the sidebar (not a real filesystem path). */
export const FAVORITES_PATH = '__favorites__'
