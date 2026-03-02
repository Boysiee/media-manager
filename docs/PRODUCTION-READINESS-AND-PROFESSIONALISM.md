# Production Readiness & Professionalism

A focused review on **speed**, **logic**, **responsiveness**, **professionalism**, and **overall production readiness** so the app meets a modern professional standard in every aspect.

**Legend:** ✓ = completed (so we don't redo in a new chat).

---

## 1. Speed & Performance

### Store & Data Flow

- ✓ **Search query**: `setSearchQuery` updates on every keystroke. _(Done: 200ms debounce in TitleBar.)_ Filtering runs in renderer over `searchIndex`. For large indexes (10k+ files), debounce search input by 150–300 ms and/or move filtering to a Web Worker so the main thread stays responsive.
- **Sort**: Re-sorting on every `setSortField` / `toggleSortOrder` is fine for typical list sizes. If you ever support 10k+ items in a single folder, consider memoizing sorted list (e.g. `useMemo` in the component that consumes it) so you don’t re-sort on unrelated store updates.

### Async & Main Process

- ✓ **loadFiles**: No request cancellation. If the user navigates quickly (A → B → C), three `loadFiles` calls run; whichever finishes last wins and can overwrite the correct state. Use a “request id” or “path version”: each navigation increments a counter and only the latest response updates `files` (e.g. `let loadId = 0; loadFiles: async (path) => { const id = ++loadId; const files = await ...; if (id !== loadId) return; set({ files, ... }) }`).
- ✓ **setActiveSection**: Same pattern: building the search index can take a long time. If the user switches section before index finishes, the old index can overwrite the new section’s state. Tie index build to `section` (e.g. only apply result if `activeSection === section` when resolve).
- ✓ **expandFolder / getFolderChildren**: Multiple rapid expands on the same folder can fire duplicate requests. Debounce or track “loading” per path and ignore duplicate in-flight requests. _(Done: in-flight map in fileStore; duplicate expand reuses same promise.)_

### Thumbnails & Heavy Work

- ✓ **Thumbnail cache**: Main process cache is in-memory only; it grows unbounded. Add a max size (e.g. LRU, 500 entries) and/or evict by age so long sessions don’t OOM.
- ✓ **Video thumbnails in renderer**: Each card creates a `<video>` and seeks to generate a frame. Many visible cards = many concurrent decodes. Consider limiting concurrent video thumb generation (e.g. queue, max 3 at a time) or doing it in main process once and caching. _(Done: videoThumbQueue.ts with max 3 concurrent; FileCard requests/releases slot.)_
- ✓ **Audio metadata**: Same idea—main process caches, but no limit. Add LRU or cap.

### Virtual List

- **FileGrid**: You use `@tanstack/react-virtual`; that’s good. Ensure `getScrollElement` is stable (ref to the scroll container). Overscan of 5 is reasonable; for very large lists you can tune.

---

## 2. Logic & Correctness

### Race Conditions

- ✓ **loadFiles(path)** (above): Late responses overwriting state.
- ✓ **goBack / goForward**: They call `get().loadFiles(path)` without awaiting and don’t set `isLoading`. So `files` and `currentPath` update immediately, but `files` may still show old content until load completes. Set `isLoading: true` when going back/forward and clear it when load completes (and only apply result if still the active path).
- ✓ **refresh**: Same as loadFiles—if user triggers refresh twice, second completion can overwrite first. Use a refresh id or ignore stale results.

### Selection & Preview

- ✓ **selectAll**: Uses current `files`; in search mode `displayFiles` is different. So “Select All” in the grid selects from `files`, but the grid shows `displayFiles`. Either make selectAll use the same source as the grid (e.g. pass displayFiles or derive selected from displayFiles), or document that “Select All” applies to the current folder, not search results. Prefer: selectAll selects all items in the _visible_ list (search results or current folder).
- ✓ **previewFile**: When multiple selected, preview shows one file; that’s fine. When selection is cleared by navigation, preview clears—good. Ensure preview doesn’t show a file that’s no longer in the current list (e.g. after refresh or navigate); if `previewFile` is not in `files`/displayFiles, set preview to null. _(Done: clear when not in visible list after load/refresh/navigate.)_

### Path & FS Assumptions

- ✓ **goUp**: `currentPath.replace(/[\\/][^\\/]+$/, '')` assumes path has a trailing segment. For roots like `C:\` or `D:\` this can behave oddly; validate or handle root so you don’t navigate to an empty string.
- ✓ **Section roots**: If a section path doesn’t exist (e.g. `E:\Media\Videos` missing), init still runs. Consider checking `pathExists(sectionRoot)` and showing a friendly “Path not found” or “Choose folder” for that section instead of empty content. _(Done: sectionPathMissing state; "Path not found" + Open Settings in FileGrid.)_
- ✓ **Rename**: You prevent overwrite by checking `pathExists(newPath)`. Good. Ensure `newName` is sanitized (no `..`, no path separators) so user can’t rename to `../../elsewhere/file`.

### Move Dialog

- ✓ **Move to same folder**: Disable Move Here when same folder and show a message. If allowed, it’s a no-op; if disallowed, disable “Move Here” when `selectedFolder === currentPath` and selected files are all under current path.
- ✓ **New folder in MoveDialog**: After creating a folder, you refresh tree from `sectionRoot`; the new folder might be nested. Either expand the path to the new folder and select it, or refresh the tree from `selectedFolder` so the new folder appears in view. _(Done: new folder path is selected after create.)_

---

## 3. Responsiveness & UX

### Loading States

- ✓ **loadFiles**: Sets `isLoading` true/false—good. Ensure every path that updates `files` also sets `isLoading` (e.g. goBack/goForward, refresh).
- ✓ **Folder tree expand**: No loading indicator when expanding. Show a small spinner or “Loading…” next to the folder until `getFolderChildren` resolves.
- **Search index**: “Indexing…” in status bar is good. If possible, show progress (e.g. “Indexing… 45%”) so the user knows it’s not stuck.
- ✓ **Move**: “Moving...” on the button is good. Disable the dialog content (e.g. overlay) so user doesn’t change selection or close during move. _(Done: overlay + spinner.)_

### Error States

- ✓ **init()**: If `getSections()` or first `setActiveSection` fails (e.g. no disk access), the app stays empty with no message. Add a top-level error state: “Failed to load library” with retry and/or “Open settings to set folders.”
- ✓ **loadFiles**: On failure, main returns { ok, files } or { ok: false, error }; renderer shows error + Retry. _(Done.)_ `{ ok: true, files }` or `{ ok: false, error }`; renderer shows “Unable to load folder” + error and retry.
- **Thumbnail / metadata**: Failures are silent (empty or fallback icon). Acceptable, but consider logging in dev so you can spot bad paths or formats.

### Blocking the UI

- **Heavy work on main**: Building search index and reading directories run in main process; they’re async so they don’t freeze the window, but they can make IPC slow. Keep UI feedback clear (indexing indicator, loading states).
- **Synchronous work in renderer**: Filtering `searchIndex` for every keypress on a huge array can jank. Debounce + optional worker (see Speed).

### Accessibility & Input

- ✓ **Focus management**: After opening Move dialog, focus the first focusable element (e.g. first folder or “Cancel”). After closing context menu, restore focus to the item that had it. When renaming, focus is set—good.
- **Keyboard**: You cover main shortcuts. Ensure Tab order is logical (sidebar → toolbar → grid → preview). Escape closes things—good.
- ✓ **Screen readers**: Add `aria-label` on icon-only buttons (back, forward, sort, grid/list, refresh, etc.) and `role="list"` / `role="listitem"` where appropriate so the app is navigable by screen reader. _(Done: aria-labels on Toolbar.)_

---

## 4. Professionalism & Consistency

### Error Handling

- ✓ **Centralized API layer**: All `window.api.`_ calls are ad hoc. Consider a thin wrapper that catches rejections and turns them into notifications or a global error handler, so you don’t have to remember try/catch everywhere. _(Done: api.ts with setApiErrorNotifier; store uses api._; App sets notifier to addNotification.)_
- **Main process**: IPC handlers use try/catch and return errors in result objects (e.g. move, trash). Good. For `get-files`, `get-folder-children`, `build-search-index`, you return [] or empty on error; consider returning `{ error: string }` for critical paths so the UI can show “Failed to load” instead of “Empty folder.”
- **Logging**: No structured logging. In production, use a small logger (e.g. levels: error/warn/info) and log to a file or devtools; avoid console in production for sensitive paths. In dev, log IPC errors and failed file ops.

### Security

- ✓ **Path validation**: Main process receives paths from renderer. Validate that resolved paths stay under the configured section roots (and app user data) so a compromised renderer can’t ask for `C:\Windows\System32`. Use `path.resolve` and check `path.startsWith(sectionRoot)` or similar.
- ✓ **media-file protocol**: You decode path from URL and pass to `pathToFileURL` and fetch. Ensure the decoded path is under allowed roots before serving.
- **Context isolation**: You have contextIsolation: true and preload—good. Only expose the minimal API you need.

### Code Quality

- **Types**: Shared `FileItem`, `FolderNode` in types.ts; main has its own duplicate interfaces. Consider a shared types package or single source of truth so main and renderer stay in sync.
- **Constants**: Section roots and extension sets live in main; section labels/colors in renderer. If you add a settings screen, section config (id, label, default path, extensions) could live in one place (e.g. a config module used by both).
- ✓ **Magic numbers**: Replace with named constants (e.g. THUMBNAIL*MAX_DIM = 200, SEARCH_DEBOUNCE_MS = 200, MAX_THUMB_CACHE = 500). *(Done: renderer constants.ts — SEARCH*DEBOUNCE_MS, PREVIEW_PANEL*_, SIDEBAR\__, LARGE*FOLDER_WARNING_COUNT, NOTIFICATION*\*; main THUMBNAIL*MAX_DIM.)*

---

## 5. Production Readiness

### Configuration

- ✓ **Section paths**: Hardcoded in main. For production, load from user config (e.g. `electron-store` or JSON in `app.getPath('userData')`). First run: use defaults or show “Set up library” wizard.
- ✓ **Persistence**: Persist view state (sort, view mode, preview open/closed, preview width, last section/path). _(Done: config uiState.)_

### Reliability

- ✓ **Unhandled rejections**: Add `process.on('unhandledRejection', ...)` in main and a global handler in renderer (e.g. React error boundary + window.onunhandledrejection) so a single failed promise doesn’t leave the app in a broken state; log and show “Something went wrong” with retry where possible.
- ✓ **React Error Boundary**: Wrap the main app (or at least the file grid + preview) in an error boundary so a render error in one component doesn’t blank the whole window; show “Something went wrong” and a reload button.

### Updates & Packaging

- **Updates**: If you ship to users, consider `electron-updater` (or equivalent) for auto-updates and a “Check for updates” entry.
- **Packaging**: Ensure `asar` and build scripts exclude or handle native modules (e.g. `music-metadata` if it has natives). Test the built app on a clean machine.
- ✓ **Version**: Expose app version in the UI (Settings footer). _(Done: get-app-version, Settings shows "Media Manager v1.0.0".)_

### User Data & Edge Cases

- ✓ **Very large folders**: 50k files in one folder: list might be slow to sort/filter; virtual list helps. Consider warning or pagination if count exceeds e.g. 10k. _(Done: status bar shows "Large folder (N items)" when display count ≥ 10k; LARGE_FOLDER_WARNING_COUNT constant.)_
- **Long paths**: Windows MAX_PATH is 260; longer paths can fail. Consider enabling long path support in Node/Electron if needed and document for users.
- **Removable drives**: If section root is on a removable drive that gets disconnected, subsequent operations will fail. Handle “path not found” and show “Drive not available” and optionally offer to remove or change the section path.

---

## 6. Summary Checklist

| Done | Area                | Priority | Action                                                                         |
| ---- | ------------------- | -------- | ------------------------------------------------------------------------------ |
| ✓    | **Speed**           | High     | Request cancellation / “latest wins” for loadFiles, setActiveSection, refresh. |
| ✓    | **Speed**           | Medium   | Debounce search input; optional Web Worker for filter.                         |
| ✓    | **Speed**           | Medium   | Bounded thumbnail and audio metadata caches (LRU/cap).                         |
| ✓    | **Logic**           | High     | Fix selectAll to use visible list (search vs folder).                          |
| ✓    | **Logic**           | High     | goBack/goForward set isLoading and only apply result if still current path.    |
| ✓    | **Logic**           | Medium   | Validate paths in main (stay under section roots); sanitize rename newName.    |
| ✓    | **Responsiveness**  | High     | Loading indicator for folder tree expand; error state for init/loadFiles.      |
| ✓    | **Responsiveness**  | Medium   | Focus management in dialogs; aria-labels on icon buttons.                      |
| ✓    | **Professionalism** | High     | Path validation and scope restriction in main + media-file protocol.           |
| ✓    | **Professionalism** | Medium   | Centralized API error handling; React Error Boundary; optional logger.         |
| ✓    | **Production**      | High     | Configurable section paths with persistence; persist view/sort/preview state.  |
| ✓    | **Production**      | High     | Unhandled rejection + Error Boundary so one failure doesn’t blank the app.     |
| ✓    | **Production**      | Medium   | App version in UI; optional auto-updater; test packaged app.                   |

Implementing the high-priority items will make the app faster, correct under rapid use, and safe for production use; the rest will bring it to a consistently professional standard.

---

_Document created from codebase review. Rows/items marked ✓ were implemented in a prior session. Last updated: March 2025 (magic numbers → constants, very large folder warning)._
