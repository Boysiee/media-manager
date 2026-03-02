# Look & Feel, UX, and Layout Guide

This document is based on the **actual current implementation**:
`tailwind.config.js`, `index.css`, `App.tsx`, `TitleBar.tsx`, `Sidebar.tsx`,
`Toolbar.tsx`, `FileGrid.tsx`, `FileCard.tsx`, `FileListItem.tsx`,
`PreviewPanel.tsx`, `StatusBar.tsx`, `ContextMenu.tsx`, `MoveDialog.tsx`,
`FolderTree.tsx`, `Notifications.tsx`, and `AudioPlayer.tsx`.

The goal is to make the app **clean, professional, modern, stylish, easy to
read and navigate**, and easy to understand *what things do* without clutter.

**Legend:** [x] = completed (so we don't redo in a new chat).

---

## 1. Current Look & Feel Snapshot

- **Theme**
  - Dark theme using custom `surface` colors (50–900) and `accent` indigo.
  - Main background: `bg-surface-100` and `bg-surface-50` in many places.
  - Many labels use `text-neutral-500/600/700` on dark surfaces.

- **Typography**
  - Widespread use of **small sizes** (`text-[10px]`, `text-[11px]`, `text-[12px]`).
  - File names in grid: `text-[11px]`.
  - Metadata and labels are often `text-[10px]` or `11px`.

- **Layout**
  - Fixed 220px sidebar, custom title bar, top toolbar, main panel with grid/list
    + optional preview, bottom status bar.
  - Spacing generally tight: small paddings and gaps; compact rows and cards.

- **Clarity / affordances**
  - Most icon buttons have tooltips or obvious meaning (e.g. folder, trash).
  - Some controls (sort dropdown, sort order, view toggle) rely heavily on icons
    with small text and subtle states.
  - Empty states exist but use small text and emoji.

---

## 2. Problems to Address

1. **Low text contrast in several places**
   - Using `text-neutral-600/700/800` on `surface-50/100` (very dark) makes text
     feel washed out or hard to read.

2. **Text is generally too small**
   - 10–11px is used for many primary labels and file names; this requires
     squinting on typical monitors.

3. **Information hierarchy is weak**
   - Primary vs secondary vs tertiary text often share similar size and color.
   - Selections and active elements sometimes don’t stand out strongly.

4. **Some controls are not self-explanatory**
   - Sort dropdown + arrow, grid/list toggle, preview toggle and some toolbar
     icons could use clearer visual states and targeted tooltips.

5. **Spacing is tight**
   - Grid cards, list rows, and panel sections could use slightly more padding
     and gaps to feel “designed” rather than “crammed”.

---

## 3. Color System Improvements

### 3.1. Roles and Contrast

Use **semantic roles** on top of your existing palette:

- **App background**
  - Title bar / sidebar: `surface-50` or `surface-100`.
  - Main content: `surface-200` / `surface-300` (slightly lighter than sidebar).

- **Text**
  - Primary (file names, section names, current breadcrumb, preview file name):
    - `text-neutral-100` or `text-neutral-200`.
  - Secondary (metadata labels, secondary text in status bar, helper text):
    - `text-neutral-400/500`.
  - Muted (disabled text, subtle hints): `text-neutral-600`.
  - Avoid `text-neutral-700/800` on dark surfaces for anything important.

- **Selection / focus**
  - Background: use `bg-accent/20` for selected rows/cards and active sidebar
    items.
  - Outline: `shadow-[0_0_0_1px_rgba(99,102,241,0.9)]` instead of thick outer
    glow to keep things sharp but not blurry.

- **Accent / semantic**
  - Keep `accent` (indigo) as primary.
  - Use emerald/red/blue for success/error/info consistently across
    notifications, inline badges, and helper labels.

### 3.2. Component-Specific Color Tweaks

- **TitleBar**
  - Background: keep `bg-surface-50`.
  - App name: `text-neutral-100` / `200`.
  - Search input: `bg-surface-300`, `border-surface-500/60`, `text-neutral-100`,
    placeholder `text-neutral-500`.

- **Sidebar**
  - Background: `bg-surface-50`, clear right border: `border-surface-500/40`.
  - Section buttons:
    - Active: `bg-accent/15`, icon tinted with `SECTION_CONFIG[section].color`,
      text `neutral-100`.
    - Inactive: `text-neutral-400`, `hover:bg-surface-300/50`,
      `hover:text-neutral-200`.

- **Grid / List**
  - Card containers: `bg-surface-300/30` with hover `bg-surface-300/60`.
  - File names: `text-neutral-100`.
  - Sizes / extra info: `text-neutral-500`.

---

## 4. Typography System

### 4.1. Recommended Scale

Define a **simple text scale** and stick to it:

- **14px (`text-sm` or `text-[14px]`)**
  - Primary text in most places: file names, section titles, context menu labels,
    preview file title.

- **13px (`text-[13px]`)**
  - Secondary important text: toolbar button labels (if any), sidebar section
    labels, breadcrumb labels, file names in tighter layouts.

- **12px (`text-xs` or `text-[12px]`)**
  - Metadata values and most UI labels (Size, Type, Modified), status bar text.

- **10–11px (`text-[10px]`, `text-[11px]`)**
  - Only for: tiny badges, captions, group headers (“SECTIONS”, “FOLDERS”),
    keyboard shortcut hints.

### 4.2. Concrete Changes by Component

- **FileGrid / FileCard**
  - File name: change from `text-[11px]` → **`text-[13px]`**.
  - File size under name: `text-[12px] text-neutral-500`.
  - Search result path snippet: `text-[11px] text-neutral-500`.

- **Sidebar**
  - Section labels: `text-[13px] font-medium text-neutral-100`.
  - “Sections” / “Folders” headers: keep `text-[10px]` but use
    `text-neutral-500` and letterspacing for readability.

- **PreviewPanel**
  - File name: `text-[14px] font-medium text-neutral-100`.
  - Metadata values: `text-[12px] text-neutral-300`, labels `text-[11px] neutral-500`.
  - Path: `text-[11px]` but higher contrast background so it reads clearly.

- **Toolbar / StatusBar**
  - Toolbar labels and crumb text: `text-[12px]`–`13px` with good contrast.
  - Status bar text: `text-[12px]` for counts and total size.

---

## 5. Layout, Spacing, and Breathing Room

### 5.1. Global

- Increase default paddings/gaps slightly:
  - Grid card gap: 10px → **12–14px**.
  - List row height: ~36px → **40px** for easier scanning.
  - Section between toolbar and grid: keep as is but ensure grid has `p-3` and
    enough vertical space.

### 5.2. Component Notes

- **FileGrid (grid mode)**
  - Maintain aspect ratio for thumbnails but add a bit more bottom padding so
    text isn’t cramped under the image.
  - Ensure at least `gap-3` or `gap-4` between cards.

- **FileGrid (list mode)**
  - ✓ Increase row height and add zebra or hover highlight to make scanning
    across columns easier. *(Done: zebra striping on odd rows; LIST_ROW_HEIGHT 40px.)*
  - ✓ Keep header row sticky (already done) but give it a slightly darker
    background and clearer border. *(Done: bg-surface-300/90, border-surface-500/40, h-9.)*

- **PreviewPanel**
  - ✓ Consistent padding: outer `p-4`, inner sections with `space-y-3`.
    *(Done: content wrapper p-4 space-y-3; section dividers.)*
  - ✓ Clear section dividers: subtle `border-t border-surface-500/25` between
    preview media, metadata, path, and actions. *(Done.)*

- **MoveDialog**
  - ✓ Slightly increase vertical spacing between folder options; keep
    scrollable area but respect comfortable click targets (~32–36px height).
    *(Done: min-h-[36px] py-2 on FolderOption.)*

---

## 6. UX Clarity, Tooltips, and Explanations

### 6.1. What Gets Tooltips (And What Doesn’t)

**Use tooltips for icons whose meaning is not immediately obvious:**

- Toolbar:
  - ✓ Back / Forward / Up (with shortcut in tooltip). *(Done.)*
  - Sort dropdown: “Sort by…” and list items (Name, Date, Size, Type).
  - Sort order toggle: “Toggle sort order (Ascending/Descending)”.
  - Grid / List toggle: “Grid view” / “List view”.
  - Preview toggle: “Toggle preview panel (Ctrl+P)”.

- File/Folder actions:
  - “Move to…”: “Move selected items to another folder”.
  - “Recycle”: “Move selected items to Recycle Bin”.

- Player:
  - Volume button: “Mute / Unmute”.
  - Seek bar (optional): “Click or drag to seek”.

**Avoid tooltips where the label already explains itself:**

- Buttons that already say “New Folder” or “Rename”.
- Context menu items with clear text.

### 6.2. Small Contextual Explanations

Add short, **one-line helpers** in places where users might not know what’s
going on:

- Search results:
  - Already show: “X results for \"term\"”.
  - Add subtle helper when no results: small gray text: “Try a different name
    or clear search”.

- Empty folder:
  - Current text is fine, but ensure size and contrast are comfortable
    (`text-[13px] text-neutral-300`) and keep the shortcut hint
    (“Press Ctrl+Shift+N to create a folder”).

- Indexing:
  - Status bar shows “Indexing…”.
  - Consider adding a small info badge near search: “Indexing your library so
    search stays fast”.

---

## 7. Component-by-Component Checklist

### TitleBar

- [x] Swap the Copy icon for a media-related icon or simple logo.
- [x] Increase search input contrast and font size; ensure placeholder is easy
      to read.
- [x] Ensure title text is `text-[13–14px]` with high contrast.

### Sidebar

- [x] Active section: strong visual state (accent background + bright text).
- [x] Section labels: 13px text, not 11px.
- [x] Folder tree entries: comfortable row height, clear active state, good
      contrast between normal and hovered.

### FileGrid / FileList

- [x] Increase font size of file names.
- [x] Adjust card/list spacing for breathing room.
- [x] Ensure selected items are clearly visible without being garish.
- [x] Make hover backgrounds consistent and subtle but visible.

### PreviewPanel

- [x] Bigger file title with clear hierarchy.
- [x] Stronger contrast on path block and metadata values.
- [x] Clean section separation with thin borders and spacing.

### MoveDialog / ContextMenu / Notifications

- [x] Ensure text is at least 12–13px.
- [x] Maintain consistent use of semantic colors (green for success, red for
      danger, blue for info).
- [x] Provide tooltips only where icon meaning might be ambiguous.

---

## 8. Implementation Order (High Impact First)

1. ✓ **Increase core font sizes** (file names, sidebar labels, preview titles,
   toolbar labels) and fix low-contrast text.
2. ✓ **Strengthen selection states** and active folder/section highlighting.
3. ✓ **Tighten color roles** (primary vs secondary text, semantic colors).
4. ✓ **Slightly increase grid/list spacing** for a more breathable layout.
5. ✓ **Add targeted tooltips** to non-obvious icons and a few short helper lines
   where users might be confused.

Once these are in place, the app will feel **cleaner, more professional, and
much easier to read and understand** without drowning the user in text or
tooltips.

---

## 9. Completed in This Pass (Look & Feel)

- **§5.2 FileGrid (list mode):** Zebra striping on odd rows; list header with darker background (`bg-surface-300/90`), clearer border (`border-surface-500/40`), fixed height `h-9`.
- **§5.2 PreviewPanel:** Outer `p-4`, inner `space-y-3`; section dividers `border-t border-surface-500/25`; path block higher contrast (`text-[11px] text-neutral-400`, `bg-surface-300/50`).
- **§5.2 MoveDialog:** Folder options `min-h-[36px] py-2` for comfortable click targets.
- **§6.1 Tooltips:** Sort dropdown title "Sort by (Name, Date, Size, Type)"; sort order "Toggle sort order — Ascending/Descending"; preview "Toggle preview panel (Ctrl+P)"; ContextMenu Move/Recycle/Copy items have `title` tooltips.
- **§6.2 Indexing:** TitleBar shows "Indexing your library so search stays fast" when `isSearching`.
- **§6.2 Empty folder:** Empty state main message `text-[13px] text-neutral-300`.

*Items marked [x] or ✓ in §§7–8 were implemented in prior sessions.*

