# Video Manager – Improvement Ideas (UI, Features, Expansion)

A concrete list of improvements: UI widgets, features, look and feel, and expansion. No generic best-practices—only actionable suggestions.

**Legend:** ✓ = completed (so we don’t redo in a new chat).

---

## 1. UI & Look and Feel

### Title Bar
- ✓ **Wrong icon**: The title bar uses a Copy icon in the logo box; swap it for something media-related (Film, FolderOpen, LayoutGrid) or a small custom logo so it reads as "Media Manager". *(Done: Film icon.)*
- ✓ **Search placeholder**: When a section is active, show "Search in [Section]" or "Search in Videos" in the placeholder so users know what's being searched. *(Done.)*

### Sidebar
- ✓ **Section counts**: Show file count per section next to each label (e.g. "Videos (1,234)") so users see library size at a glance. *(Done: count shown for active section.)*
- **Collapsible sidebar**: Add a chevron/button to collapse the sidebar to icons-only (or a thin strip), with a resize handle so users can drag the width.

### File Grid / List
- ✓ **Video duration on cards**: Show duration on video thumbnails (e.g. bottom-left badge "3:42"). *(Done: duration from video element + store; badge on video/audio cards.)*
- ✓ **Video hover play icon**: On hover, show a small play icon overlay on video thumbnails so it's obvious they're playable. *(Done.)*
- ✓ **List view duration column**: Add an optional Duration column for video/audio (alongside Type, Size). *(Done: Duration column, same store as cards.)*
- **Grid density / thumbnail size**: Add a thumbnail size control (small/medium/large) that changes card size and column count so power users can fit more on screen.

### Preview Panel
- ✓ **Resizable**: Make the right preview panel resizable (drag left edge), with a min width (e.g. 240px) and optionally persist width in settings. *(Done: drag handle, 240–520px.)*
- ✓ **Video fullscreen/theater**: For video preview, add a fullscreen or theater mode button so users can watch in-app without opening the system player. *(Done: Theater/Fullscreen button + overlay; Escape to close.)*
- ✓ **Video metadata**: Show duration and resolution (e.g. 1920×1080) in the preview metadata block for video files. *(Done.)*

### Status Bar
- ✓ **Indexing progress**: When `isSearching` is true, show a progress indicator (e.g. "Indexing… 45%" or a thin progress bar) if the main process can report progress; otherwise keep "Indexing…" but style it as a small loading indicator. *(Done: spinner + "Indexing…" in status bar.)*

### Empty States
- ✓ When the current folder is empty or search has no results, add a proper empty state (icon + message like "No files here" or "No results for 'xyz'") instead of a bare empty grid. *(Done: improved contrast, "Try a different name or clear search".)*

### Theme
- Add a light theme (or a toggle) and persist the preference so the app doesn't feel dark-only. Your existing `surface`/`accent` setup can be mirrored with a light palette.

---

## 2. Features That Are Missing or Underused

### Settings Screen
- ✓ **Section paths**: Section roots configurable via Settings; paths persisted in user data. *(Done.)*
- ✓ **Persistence**: Persist view mode, sort field/order, preview open/closed, preview width, last section and path; restore on reopen. *(Done: get-app-config / set-ui-state, config JSON.)*

### Video
- ✓ **In-app fullscreen/theater**: In the preview panel, add "Fullscreen" (or "Theater") so the video opens in a fullscreen overlay. *(Done.)*
- ✓ **Duration in UI**: Use one place (main or renderer) to get video duration (e.g. `<video>.duration` after metadata load) and expose it to: grid card badge, list column, preview panel. *(Done: grid card badge + list column via mediaDurations store; preview panel optional.)*

### Undo
- ✓ **Undo**: Undo for move/rename with toast and Ctrl+Z. *(Done per Quick Wins.)*

### Batch Rename
- ✓ **Batch Rename**: When multiple files are selected, "Rename N items…" opens a dialog with pattern (e.g. "Clip {n}"), start number, and preview. *(Done: BatchRenameDialog.)*

### Copy (Not Just Move)
- ✓ **Copy to…**: Same UX as Move but copy; context menu and preview. *(Done per Quick Wins.)*

### Keyboard Shortcut Help
- ✓ **Keyboard shortcut help**: `?` or `Ctrl+/` to open a small overlay listing main shortcuts (Ctrl+F, Ctrl+P, F2, Delete, M, etc.). *(Done: KeyboardShortcutHelp overlay.)*

### Recent / Quick Access
- "Recent folders" or "Pinned paths": a short list (e.g. 5–10) of recently visited folders or user-pinned paths, in the sidebar or under a "Recent" section, for quick jump-back.

---

## 3. Expansion Ideas

### Search
- **Filters**: Besides name search, add optional filters: file type (e.g. "Videos only"), date range (modified after X), size range. These can be chips or a small "Filter" dropdown next to the search bar; search runs on the existing index plus these filters.

### Tags / Favorites
- Optional tags or favorites: store path + tags (or "favorite" flag) in a local JSON/SQLite. In the sidebar, "Favorites" shows tagged/favorite items; in the grid, a star icon toggles favorite. Improves "Video manager" as a real library tool.

### Duplicate Detection
- "Find duplicates": by filename + size (or hash for robustness) within a section, list groups of duplicates and let the user delete or move duplicates. Can live under a "Tools" or "…" menu.

### Thumbnails
- **Image thumbnails**: You already have thumbnails; consider a thumbnail size in grid (small/medium/large) as above.
- **PDF thumbnails**: If you add a PDF thumb generator (e.g. first page via a small native or JS library), show it in the grid for documents.

### List View
- **Configurable columns**: Let users choose which columns to show (Name, Size, Type, Date modified, Duration, etc.) and optionally reorder them.

### Multi-Window / Tabs
- New window or tabs: "Open in new window" for the current folder, or a simple tab bar (e.g. "Videos", "Documents") so power users can keep two locations open.

---

## 4. Quick Wins (High Impact, Low Effort)

1. ✓ **Fix title bar icon** – Swap Copy for Film/FolderOpen/LayoutGrid. *(Done.)*
2. ✓ **Video duration on cards** – Get duration when generating video thumb (or in a small effect), show badge on `FileCard` for `category === 'video'`. *(Done: video/audio duration badge + list column.)*
3. ✓ **Preview panel resize** – Resizable right panel + optional persist of width. *(Done: drag handle, 240–520px.)*
4. ✓ **Settings + section paths** – One settings screen using `pickFolder` and persisting paths (and optionally view/sort/preview state). *(Done: Settings dialog, config JSON in userData, set-section-path IPC.)*
5. ✓ **Undo for move/rename** – Wire `operations` to an Undo action and a toast with "Undo". *(Done: Undo button in toast, Ctrl+Z, undoLastOperation.)*
6. ✓ **Copy to…** – Same as Move dialog but copy instead of move. *(Done: copy-files IPC, Copy Here dialog, context menu + preview.)*
7. ✓ **Duration column in list view** – For video/audio in `FileListItem`, add a duration column (same source as card badge). *(Done.)*

---

---

*Document created from codebase review. Items marked ✓ were implemented in prior sessions. Last updated: March 2025.*
