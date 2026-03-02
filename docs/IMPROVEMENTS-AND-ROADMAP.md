# Video Manager – Improvement Ideas (UI, Features, Expansion)

A concrete list of improvements: UI widgets, features, look and feel, and expansion. No generic best-practices—only actionable suggestions.

**Legend:** ✓ = completed (so we don’t redo in a new chat).

---

## 1. UI & Look and Feel

### Title Bar

- ✓ **Wrong icon**: The title bar uses a Copy icon in the logo box; swap it for something media-related (Film, FolderOpen, LayoutGrid) or a small custom logo so it reads as "Media Manager". _(Done: Film icon.)_
- ✓ **Search placeholder**: When a section is active, show "Search in [Section]" or "Search in Videos" in the placeholder so users know what's being searched. _(Done.)_

### Sidebar

- ✓ **Section counts**: Show file count per section next to each label (e.g. "Videos (1,234)") so users see library size at a glance. _(Done: count shown for active section.)_
- ✓ **Collapsible sidebar**: Add a chevron/button to collapse the sidebar to icons-only (or a thin strip), with a resize handle so users can drag the width. _(Done: collapse to 56px icons-only; resize 160–400px; state persisted.)_

### File Grid / List

- ✓ **Video duration on cards**: Show duration on video thumbnails (e.g. bottom-left badge "3:42"). _(Done: duration from video element + store; badge on video/audio cards.)_
- ✓ **Video hover play icon**: On hover, show a small play icon overlay on video thumbnails so it's obvious they're playable. _(Done.)_
- ✓ **List view duration column**: Add an optional Duration column for video/audio (alongside Type, Size). _(Done: Duration column, same store as cards.)_
- ✓ **Grid density / thumbnail size**: Add a thumbnail size control (small/medium/large) that changes card size and column count so power users can fit more on screen. _(Done: S/M/L in toolbar when in grid view; persisted.)_

### Preview Panel

- ✓ **Resizable**: Make the right preview panel resizable (drag left edge), with a min width (e.g. 240px) and optionally persist width in settings. _(Done: drag handle, 240–520px.)_
- ✓ **Video fullscreen/theater**: For video preview, add a fullscreen or theater mode button so users can watch in-app without opening the system player. _(Done: Theater/Fullscreen button + overlay; Escape to close.)_
- ✓ **Video metadata**: Show duration and resolution (e.g. 1920×1080) in the preview metadata block for video files. _(Done.)_

### Status Bar

- ✓ **Indexing progress**: When `isSearching` is true, show a progress indicator (e.g. "Indexing… 45%" or a thin progress bar) if the main process can report progress; otherwise keep "Indexing…" but style it as a small loading indicator. _(Done: spinner + "Indexing…" in status bar.)_

### Empty States

- ✓ When the current folder is empty or search has no results, add a proper empty state (icon + message like "No files here" or "No results for 'xyz'") instead of a bare empty grid. _(Done: improved contrast, "Try a different name or clear search".)_

### Theme

- ✓ Add a light theme (or a toggle) and persist the preference so the app doesn't feel dark-only. Your existing `surface`/`accent` setup can be mirrored with a light palette. _(Done: Light/Dark toggle in toolbar and Settings; preference persisted.)_

---

## 2. Features That Are Missing or Underused

### Settings Screen

- ✓ **Section paths**: Section roots configurable via Settings; paths persisted in user data. _(Done.)_
- ✓ **Persistence**: Persist view mode, sort field/order, preview open/closed, preview width, last section and path; restore on reopen. _(Done: get-app-config / set-ui-state, config JSON.)_

### Video

- ✓ **In-app fullscreen/theater**: In the preview panel, add "Fullscreen" (or "Theater") so the video opens in a fullscreen overlay. _(Done.)_
- ✓ **Duration in UI**: Use one place (main or renderer) to get video duration (e.g. `<video>.duration` after metadata load) and expose it to: grid card badge, list column, preview panel. _(Done: grid card badge + list column via mediaDurations store; preview panel optional.)_

### Undo

- ✓ **Undo**: Undo for move/rename with toast and Ctrl+Z. _(Done per Quick Wins.)_

### Batch Rename

- ✓ **Batch Rename**: When multiple files are selected, "Rename N items…" opens a dialog with pattern (e.g. "Clip {n}"), start number, and preview. _(Done: BatchRenameDialog.)_

### Copy (Not Just Move)

- ✓ **Copy to…**: Same UX as Move but copy; context menu and preview. _(Done per Quick Wins.)_

### Keyboard Shortcut Help

- ✓ **Keyboard shortcut help**: `?` or `Ctrl+/` to open a small overlay listing main shortcuts (Ctrl+F, Ctrl+P, F2, Delete, M, etc.). _(Done: KeyboardShortcutHelp overlay.)_

### Recent / Quick Access

- ✓ "Recent folders" or "Pinned paths": a short list (e.g. 5–10) of recently visited folders or user-pinned paths, in the sidebar or under a "Recent" section, for quick jump-back. _(Done: "Recent" section in sidebar, up to 8 paths per section; persisted.)_

---

## 3. Expansion Ideas

### Search

- ✓ **Filters**: Besides name search, add optional filters: file type (e.g. "Videos only"), date range (modified after X), size range. These can be chips or a small "Filter" dropdown next to the search bar; search runs on the existing index plus these filters. _(Done: Filter button next to search in TitleBar; Type / Modified / Min size; persisted in uiState.)_

### Tags / Favorites

- ✓ **Favorites**: Store favorite paths in a local JSON file (userData). In the sidebar, "Favorites" shows favorited items (from search index); in the grid, a star icon on each card toggles favorite. Persisted via main process; Favorites view is a virtual folder. _(Done: favorites.json, get/set-favorites IPC, star on FileCard, Favorites in sidebar, empty state "Star items to add them here".)_

### Duplicate Detection

- ✓ **Find duplicates**: By name + size, then verified by content hash (SHA-256) within a section; list groups of true duplicates and let the user delete (Recycle Bin) or move. Lives under the Tools menu. _(Done: find-duplicates IPC with hash verification, yields between files so UI stays responsive; DuplicatesDialog with scan, expandable groups, Move to… and Move to Recycle Bin.)_

### Thumbnails

- **Image thumbnails**: You already have thumbnails; consider a thumbnail size in grid (small/medium/large) as above.
- **PDF thumbnails**: If you add a PDF thumb generator (e.g. first page via a small native or JS library), show it in the grid for documents.

### List View

- ✓ **Configurable columns**: Let users choose which columns to show (Name, Size, Type, Date modified, Duration, etc.) and optionally reorder them. _(Done: "Columns" dropdown in toolbar when in list view; show/hide columns; order preserved; persisted in uiState.)_

### Multi-Window / Tabs

- New window or tabs: "Open in new window" for the current folder, or a simple tab bar (e.g. "Videos", "Documents") so power users can keep two locations open.

---

## 4. Quick Wins (High Impact, Low Effort)

1. ✓ **Fix title bar icon** – Swap Copy for Film/FolderOpen/LayoutGrid. _(Done.)_
2. ✓ **Video duration on cards** – Get duration when generating video thumb (or in a small effect), show badge on `FileCard` for `category === 'video'`. _(Done: video/audio duration badge + list column.)_
3. ✓ **Preview panel resize** – Resizable right panel + optional persist of width. _(Done: drag handle, 240–520px.)_
4. ✓ **Settings + section paths** – One settings screen using `pickFolder` and persisting paths (and optionally view/sort/preview state). _(Done: Settings dialog, config JSON in userData, set-section-path IPC.)_
5. ✓ **Undo for move/rename** – Wire `operations` to an Undo action and a toast with "Undo". _(Done: Undo button in toast, Ctrl+Z, undoLastOperation.)_
6. ✓ **Copy to…** – Same as Move dialog but copy instead of move. _(Done: copy-files IPC, Copy Here dialog, context menu + preview.)_
7. ✓ **Duration column in list view** – For video/audio in `FileListItem`, add a duration column (same source as card badge). _(Done.)_

---

---

_Document created from codebase review. Items marked ✓ were implemented in prior sessions. Last updated: March 2025 (duplicate detection; favorites, constants, large-folder warning)._
