# Media Manager

A desktop app for browsing, searching, and managing your media files (images, videos, audio, documents). Built with Electron, React, and TypeScript.

## Features

- **Sections**: Images, Videos, Audio, Documents — each with a configurable root folder (Settings).
- **Grid & list views** with sort (name, size, date, type) and search.
- **Preview panel**: Resizable; video/audio playback with theater/fullscreen; image and document preview.
- **File actions**: Open, Reveal in folder, Copy path, Move, Batch rename.
- **Persistence**: View mode, sort, preview width, last section/path, and section roots are saved and restored.
- **Keyboard shortcuts**: Search, refresh, toggle preview, open settings, and more (see in-app help).

## Tech Stack

- **Electron** — desktop shell
- **Vite** (electron-vite) — build and dev server
- **React 18** + **TypeScript**
- **Tailwind CSS** — styling
- **Zustand** — state
- **Lucide React** — icons

## Requirements

- **Node.js** 18+ (LTS recommended)
- **npm** (or yarn/pnpm)

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Type check (no emit)
npm run check-types
```

After `npm run build`, the output is in the `out/` directory. The main process entry is `out/main/index.js`.

## Project Structure

```
├── src/
│   ├── main/          # Electron main process (IPC, fs, config)
│   ├── preload/       # Preload scripts (context bridge)
│   └── renderer/      # React app (Vite)
│       ├── src/
│       │   ├── components/
│       │   ├── stores/
│       │   ├── utils/
│       │   └── ...
│       └── index.html
├── docs/              # UX guide, roadmap, production notes
├── electron.vite.config.ts
├── package.json
└── README.md
```

## Documentation

- **`docs/IMPROVEMENTS-AND-ROADMAP.md`** — UI/UX and feature ideas, with completion notes.
- **`docs/LOOK-AND-FEEL-UX-GUIDE.md`** — Visual and interaction guidelines.
- **`docs/PRODUCTION-READINESS-AND-PROFESSIONALISM.md`** — Checklist for release readiness.

## License

MIT (or your chosen license).
