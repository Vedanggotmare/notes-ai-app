# Notes AI — Developer Guide

AI-powered desktop notes app built with Electron, React, TypeScript, Vite, and Tailwind. Features voice dictation via Whisper, AI categorisation via Claude, a knowledge graph, and a tasks panel.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-time setup](#2-first-time-setup)
3. [Running the app](#3-running-the-app)
4. [Project structure — every file explained](#4-project-structure--every-file-explained)
5. [Architecture & data flow](#5-architecture--data-flow)
6. [The storage layer](#6-the-storage-layer)
7. [The AI layer (Claude)](#7-the-ai-layer-claude)
8. [The dictation system (Whisper)](#8-the-dictation-system-whisper)
9. [The Electron shell](#9-the-electron-shell)
10. [Styling conventions](#10-styling-conventions)
11. [What to freely change](#11-what-to-freely-change)
12. [What NOT to touch without reading this first](#12-what-not-to-touch-without-reading-this-first)
13. [Building for distribution](#13-building-for-distribution)
14. [Known issues & workarounds](#14-known-issues--workarounds)
15. [Adding new features — patterns to follow](#15-adding-new-features--patterns-to-follow)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18 LTS or 20 LTS | **Do not use Node 22+** — Electron 42's native module rebuild (`@electron/rebuild`) has compatibility issues with Node 24 on some machines. Node 20 is the safest choice. |
| npm | comes with Node | No Yarn/pnpm — the lockfile is `package-lock.json` |
| Git | any | — |
| Anthropic API key | — | Get one at [console.anthropic.com](https://console.anthropic.com). Only needed for AI categorisation — the app runs without it. |

---

## 2. First-time setup

```bash
git clone <your-repo-url>
cd notes-ai
npm install
cp .env.example .env
# Edit .env and paste your Anthropic API key
```

`.env` contents (never commit this file):
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

The `VITE_` prefix is mandatory — Vite only exposes env vars with that prefix to the browser/renderer process. Without it, `import.meta.env.VITE_ANTHROPIC_API_KEY` returns `undefined`.

---

## 3. Running the app

### Development (hot-reload)
```bash
npm run electron:dev
```
This runs Vite dev server on `http://127.0.0.1:5173` and Electron simultaneously using `concurrently`. Electron waits for the Vite server to be ready via `wait-on` before opening the window.

### Vite only (browser, no Electron)
```bash
npm run dev
```
Opens in your browser. The `window.electronAPI` object won't exist but otherwise works. Useful for rapid UI iteration.

### Production preview (no installer)
```bash
npm run electron:preview
```
Builds the Vite bundle first, then launches Electron loading `dist/index.html` directly (no dev server).

### Build installer
```bash
npm run electron:build
```
Produces a Windows NSIS installer in `release/`. See [§13 Building for distribution](#13-building-for-distribution) for the known network caveat.

---

## 4. Project structure — every file explained

```
notes-ai/
│
├── electron/                   ← Electron main process (Node.js, not bundled by Vite)
│   ├── main.cjs                ← Entry point for the Electron process
│   └── preload.cjs             ← Context bridge between Node and renderer
│
├── src/                        ← React renderer (TypeScript, bundled by Vite)
│   ├── main.tsx                ← React root — mounts <App />, calls initSeeds()
│   ├── App.tsx                 ← Top-level layout, owns all shared state via useNotes()
│   ├── index.css               ← Global CSS: font imports (Google Fonts), Tailwind base
│   │
│   ├── components/
│   │   ├── Sidebar.tsx         ← Left nav: notebooks, categories, tags, view switcher
│   │   ├── NoteList.tsx        ← Middle column: scrollable list of note cards
│   │   ├── NoteEditor.tsx      ← Right panel: title, content, toolbar, highlight overlay
│   │   ├── KnowledgeGraph.tsx  ← Full-screen graph view (react-force-graph-2d)
│   │   ├── TodoPanel.tsx       ← Tasks & Reminders panel (independent of notes)
│   │   ├── CategoryBadge.tsx   ← Tiny coloured pill used in NoteList and NoteEditor
│   │   ├── DictationButton.tsx ← Standalone mic button (not currently used in the main UI;
│   │   │                          the mic is inline in NoteEditor's toolbar)
│   │   └── PomodoroTimer.tsx   ← Floating focus timer, bottom-right corner overlay
│   │
│   ├── hooks/
│   │   ├── useNotes.ts         ← Central state hub for all note + notebook + category data
│   │   └── useDictation.ts     ← Microphone → Whisper worker → transcript text
│   │
│   ├── lib/
│   │   ├── types.ts            ← All TypeScript interfaces (Note, Notebook, Category, …)
│   │   ├── storage.ts          ← localStorage CRUD for notes, notebooks, categories
│   │   ├── todo-storage.ts     ← localStorage CRUD for todos and reminders
│   │   ├── claude.ts           ← Single function that calls Claude API for categorisation
│   │   └── seeds.ts            ← 20 pre-written sample notes loaded on first run
│   │
│   └── workers/
│       └── transcribe.worker.ts ← Web Worker: downloads & runs Whisper (Xenova/whisper-tiny.en)
│
├── scripts/
│   └── generate-icon.cjs       ← Electron script to render the app icon SVG → PNG → ICO
│
├── build/
│   ├── icon.png                ← 512×512 app icon (generated, committed to repo)
│   └── icon.ico                ← Multi-size ICO (generated, committed to repo)
│
├── .env                        ← Your API key. NEVER commit. In .gitignore.
├── .env.example                ← Safe to commit. Template for contributors.
├── .gitignore
├── package.json
├── tsconfig.json               ← Strict TypeScript; includes vite/client for import.meta.env
├── tsconfig.node.json          ← Separate tsconfig for Vite config file itself
├── vite.config.ts              ← Vite config: React plugin, dev server, worker format
├── tailwind.config.js
└── postcss.config.js
```

### Files that don't exist but you might expect

- **No `src/api/` or `src/server/`** — there is no backend. Everything runs client-side or via the Electron process.
- **No database** — all persistence is `localStorage` (Electron's Chromium instance). See §6.
- **No Redux / Zustand / React Context for global state** — `useNotes()` in `App.tsx` is the single source of truth, passed down as props.
- **No React Router** — navigation is a `ViewMode` state string (`'notes' | 'graph' | 'todo'`).

---

## 5. Architecture & data flow

```
┌─────────────────────────────────────────────────────────────┐
│  Electron main process (electron/main.cjs)                  │
│  • Creates BrowserWindow                                    │
│  • Sets up microphone permissions                           │
│  • Detects dev vs prod by checking dist/index.html exists   │
│  • In dev → loads http://127.0.0.1:5173                     │
│  • In prod → loads file:///dist/index.html                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC (minimal — only platform info via preload)
┌──────────────────────────▼──────────────────────────────────┐
│  Renderer process (React app)                               │
│                                                             │
│  App.tsx                                                    │
│    └── useNotes() hook  ◄── localStorage (notes, notebooks, │
│         │                                categories)        │
│         ├── <Sidebar />     (notebooks, categories CRUD)    │
│         ├── <NoteList />    (filtered notes)                │
│         └── <NoteEditor />  (selected note)                 │
│              └── useDictation() hook                        │
│                   └── transcribe.worker.ts (Web Worker)     │
│                        └── @xenova/transformers (Whisper)   │
│                                                             │
│  claude.ts ──────────────────────────► Anthropic API (HTTPS)│
└─────────────────────────────────────────────────────────────┘
```

### State ownership

All note/notebook/category state lives in `useNotes()` in `App.tsx`. It is **not** in Context — it is passed as props. This means:

- `Sidebar` receives `notebooks`, `categories`, and callback props.
- `NoteEditor` receives `notebooks`, `categories`, and callback props.
- Nothing reads from `localStorage` directly inside components — they always go through `useNotes`.

The one exception is `TodoPanel`, which manages its own local state because todos are completely independent of notes.

`PomodoroTimer` is fully self-contained — no shared state, no props.

---

## 6. The storage layer

**File:** `src/lib/storage.ts`

All data is stored in `localStorage` in Electron's Chromium instance. Electron persists this automatically in `%APPDATA%\notes-ai\` (Windows) or `~/.config/notes-ai/` (Linux) between sessions.

### localStorage keys

| Key | Contents |
|-----|----------|
| `notes_ai_notes` | `Note[]` JSON array |
| `notes_ai_notebooks` | `Notebook[]` JSON array |
| `notes_ai_categories` | `Category[]` JSON array |
| `notes_ai_todos` | `TodoItem[]` JSON array |
| `notes_ai_reminders` | `Reminder[]` JSON array |
| `notes_ai_seeded_v1` | `"1"` — flag so seed notes only load once |

### Seed notes

On first launch, `initSeeds()` (called in `src/main.tsx`) writes 20 richly connected sample notes to `notes_ai_notes` and sets `notes_ai_seeded_v1`. This only runs once. If you want to reset to seeds, clear `localStorage` in DevTools or delete the Electron data directory.

### Default notebooks and categories

If `notes_ai_notebooks` doesn't exist yet, `getNotebooks()` creates and saves the defaults:
```
Research (#D97757), Work (#7B9ED9), Personal (#9B8BD4)
```

Same for `notes_ai_categories` — 10 defaults are created on first read. Users can add and delete these through the Sidebar UI.

### Adding new persistent data

1. Add a key constant at the top of `storage.ts`.
2. Write `get*`, `save*`, `delete*` functions following the existing pattern.
3. Expose them from `useNotes.ts` (or a new hook) as state + callbacks.
4. Never read from `localStorage` directly inside a component.

---

## 7. The AI layer (Claude)

**File:** `src/lib/claude.ts`

There is exactly one function: `categorizeNote()`. It takes the note content and the existing notes/categories context, and returns suggested categories, tags, a title, and connection IDs.

### How it's called

`useNotes.ts` → `triggerCategorization()`:
- Called automatically 3 seconds after the user stops typing (if content > 40 chars).
- Called immediately when the user clicks **✦ AI Categorise** in the toolbar.

### The model

Currently uses `claude-opus-4-7`. The `thinking` parameter was removed because the installed SDK version (`@anthropic-ai/sdk@^0.54.0`) does not support `"adaptive"` thinking — only `"enabled"` or `"disabled"`. If you upgrade the SDK and want extended thinking, add it back as:
```typescript
thinking: { type: 'enabled', budget_tokens: 5000 },
```

### API key security

The key is accessed via `import.meta.env.VITE_ANTHROPIC_API_KEY` and passed directly to the Anthropic SDK with `dangerouslyAllowBrowser: true`. This is intentional — this is a local desktop app, not a web app. The key never leaves your machine except in API calls to Anthropic over HTTPS. Do not ship a built version with a hardcoded key.

### Prompt structure

The prompt sends the note content plus up to 20 existing note titles. Claude returns raw JSON. The response is parsed and mapped — if Claude suggests a connection by title, the code finds the matching ID. If parsing fails, it returns graceful empty defaults (no crash).

---

## 8. The dictation system (Whisper)

**Files:** `src/hooks/useDictation.ts`, `src/workers/transcribe.worker.ts`

This is the most technically complex part of the app. Read carefully before touching it.

### How it works

```
Mic (getUserMedia)
  → MediaRecorder (5-second rolling chunks, webm/opus)
    → Blob → Float32Array (resampled to 16kHz mono via OfflineAudioContext)
      → Web Worker (transcribe.worker.ts)
        → @xenova/transformers pipeline (Whisper tiny.en, runs in WASM)
          → transcript text → onResult() callback → inserted into note
```

### The Web Worker

`transcribe.worker.ts` is compiled as an **ES module** web worker (set in `vite.config.ts` via `worker: { format: 'es' }`). This is required because `@xenova/transformers` uses dynamic imports internally.

The worker is a **singleton** — `getWorker()` in `useDictation.ts` creates one instance and reuses it for the app's lifetime. Creating multiple workers would re-download the model.

### Model download

On first use, Whisper tiny.en (~75 MB) is downloaded from Hugging Face CDN and cached in **IndexedDB** (`env.useBrowserCache = true`). The download progress is shown in the toolbar. Subsequent uses load from cache — fast. If you want to preload the model before the user clicks the mic, the worker receives a `{ type: 'preload' }` message on mount.

### The 5-second chunk loop

Recording runs in 5-second chunks so transcription is rolling rather than waiting until the user stops. The loop: `startChunk()` → MediaRecorder records for 5s → `onstop` fires → transcribe the blob → if still recording, call `startChunk()` again. The `activeRef` ref (not state) is used to control this loop because state updates are async and would cause race conditions.

### Voice commands

`cleanTranscript()` replaces spoken punctuation ("period" → ".", "new line" → `\n`, etc.) and auto-capitalises after sentence-ending punctuation. The command list is at the top of `useDictation.ts`.

### Why `isSupported` can be false

`navigator.mediaDevices?.getUserMedia` is undefined in: insecure HTTP contexts (not an issue in Electron), older browsers, or when Electron's `enable-speech-input` flag doesn't activate correctly. The mic button is hidden entirely when `isSupported` is false.

---

## 9. The Electron shell

**Files:** `electron/main.cjs`, `electron/preload.cjs`

### main.cjs

The main process does very little:
- Creates a `BrowserWindow` (1400×900, dark background `#15110D`)
- Grants microphone permissions automatically via `setPermissionRequestHandler`
- Detects dev vs prod by checking if `dist/index.html` exists on disk
- In dev: loads `http://127.0.0.1:5173` and opens DevTools in a detached window
- In prod: loads `dist/index.html` via `file://`
- If the renderer fails to load, shows a friendly error page rather than a blank window

### Why `.cjs` extension?

The root `package.json` has `"type": "module"`, which makes all `.js` files ES modules. Electron's main process must use CommonJS (`require`). The `.cjs` extension overrides `"type": "module"` for those files specifically.

### preload.cjs

Currently exposes only:
```javascript
window.electronAPI = { platform: 'win32', isDesktop: true }
```

If you need to add Node.js functionality to the renderer (file system access, native dialogs, etc.), add it here via `contextBridge.exposeInMainWorld`. **Do not** set `nodeIntegration: true` — this is a security risk and the preload pattern is the correct approach.

### Dev vs prod detection

`electron/main.cjs` checks `fs.existsSync(path.join(__dirname, '../dist/index.html'))`. In dev, `dist/` doesn't exist so it uses the dev server. After `npm run build`, `dist/` exists so it uses the file. This means: **if you have a stale `dist/` folder, running `electron:dev` will load the old build instead of the dev server**. Run `npm run build` or delete `dist/` to fix this.

### Permissions

The `setPermissionRequestHandler` auto-approves `media`, `microphone`, `audioCapture`, and `notifications`. This is intentional — the app needs the mic for dictation. Do not remove these without adding a UI for permission requests.

---

## 10. Styling conventions

- **Tailwind** for layout (`flex`, `gap-*`, `px-*`, `overflow-*`, `rounded-*`, etc.)
- **Inline `style` props** for all colours. The design uses a fixed warm dark palette — colours are never in Tailwind classes, always inline. This makes it easy to find and change them.
- **No CSS files beyond `index.css`** — which only contains the Google Fonts import and Tailwind's `@tailwind base/components/utilities`.

### Colour palette (memorise these)

| Hex | Used for |
|-----|----------|
| `#15110D` | App background |
| `#1C1814` | Sidebar background |
| `#211C17` | Note list background |
| `#FAFAF5` | Note editor background (light) |
| `#3A3028` | Borders / dividers |
| `#D97757` | Primary accent (orange) — buttons, active states, highlights |
| `#C24E2A` | Darker orange — gradient end, hover |
| `#EAE0D4` | Light text on dark backgrounds |
| `#9A8878` | Muted text |
| `#5A4A38` | Very muted / disabled text |

### Fonts

Loaded from Google Fonts in `index.css`. The note editor supports 8 font choices (Lora, Inter, Caveat, Playfair Display, EB Garamond, JetBrains Mono, Space Grotesk, Cormorant Garamond). The UI chrome always uses Lora (serif) for headings and Inter (sans-serif) for body.

---

## 11. What to freely change

- **`src/lib/seeds.ts`** — The 20 sample notes. Edit content, add notes, change topics. Just keep the cross-reference IDs consistent if you use `connections`.
- **`src/components/TodoPanel.tsx`** — Fully self-contained. No external dependencies. Safe to extend.
- **`src/components/PomodoroTimer.tsx`** — Self-contained floating widget. Change durations, add sounds, etc.
- **`src/components/CategoryBadge.tsx`** — Small display component. Change the badge style freely.
- **Tailwind config / colour palette** — Change `#D97757` to your brand colour and the whole app shifts.
- **`electron/main.cjs` window size** — Change `width: 1400, height: 900` freely.
- **New notebooks / categories** — Change `DEFAULT_NOTEBOOKS` and `DEFAULT_CATEGORIES` in `storage.ts`. Note these only apply to new installs — existing users keep their stored data.

---

## 12. What NOT to touch without reading this first

### `vite.config.ts` — the `optimizeDeps.exclude` and `worker.format`

```typescript
optimizeDeps: { exclude: ['@xenova/transformers'] },
worker: { format: 'es' },
```

Both are required for `@xenova/transformers` to work. Removing `exclude` causes Vite to pre-bundle the library and break its dynamic WASM imports. Changing `worker.format` to `'iife'` breaks the ES module imports inside the worker.

### `electron/main.cjs` — the `isProd` detection

```javascript
const isProd = fs.existsSync(distIndex)
```

Do not change this to an env var check. The built app has no env vars — they are baked in at Vite build time. The file existence check is the correct way to detect the run mode at Electron runtime.

### `src/workers/transcribe.worker.ts` — worker singleton

Never import this file directly from a component. Always go through the `useDictation` hook. The singleton pattern in `useDictation.ts` (`let _worker: Worker | null = null`) ensures the Whisper model is only downloaded and loaded once. Creating a second worker instance re-downloads the model and doubles memory usage.

### `src/lib/claude.ts` — `dangerouslyAllowBrowser: true`

This is intentional (local desktop app). The ESLint / TypeScript warning about it can be ignored. Do not attempt to proxy API calls through a local Express server — it adds unnecessary complexity.

### `CategoryBadge.tsx` — the module-level `getCategories()` call

```typescript
const categories = getCategories()  // ← called ONCE at module load time
```

This means `CategoryBadge` will not reflect newly added categories until the page reloads. This is a known limitation. If you add categories and see them not colour-coded in `CategoryBadge`, this is why. The fix would be to pass `categories` as a prop from `App.tsx`. It's acceptable as-is because categories are usually set up once and reused.

### `package.json` `"type": "module"` + `electron/` folder

If you add new files to `electron/`, they must use `.cjs` extension (or CommonJS `require` syntax won't work). Alternatively add `// @ts-ignore` and a `"type": "commonjs"` in a nested `package.json` inside `electron/`. The safest rule: **new electron process code = `.cjs` extension**.

### `tsconfig.json` — `"types": ["vite/client"]`

This line enables `import.meta.env` types. If you remove it, you get TypeScript errors on every `import.meta.env.*` call. The `"noUnusedLocals": true` and `"noUnusedParameters": true` flags are strict — the build will fail if you declare variables or parameters you don't use. Prefix with `_` (e.g. `_unused`) to suppress.

---

## 13. Building for distribution

```bash
npm run electron:build
```

This runs `tsc && vite build && electron-builder`. The output is in `release/`:
- `release/win-unpacked/` — portable app directory
- `release/Notes AI Setup X.Y.Z.exe` — NSIS installer

### Known issue: Electron zip download fails on some networks

`electron-builder` downloads a ~144 MB Electron zip from GitHub releases during packaging. On corporate networks or slow/restricted connections this download corrupts or times out. Symptoms: `zip: not a valid zip file` error.

**Workaround:** Pre-download the zip and place it in the cache:

```powershell
# 1. Find the cache key (run this once)
node -e "const c=require('crypto'),u=new URL('https://github.com/electron/electron/releases/download/v42.2.0/electron-v42.2.0-win32-x64.zip');u.hash='';u.search='';u.pathname=require('path').posix.dirname(u.pathname);console.log(c.createHash('sha256').update(u.toString()).digest('hex'))"

# 2. Create the cache dir and copy a valid zip there
$hash = "<output from above>"
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\electron\Cache\$hash"
Copy-Item "path\to\electron-v42.2.0-win32-x64.zip" "$env:LOCALAPPDATA\electron\Cache\$hash\"
```

### The icon is embedded in the exe

The custom app icon (`build/icon.ico`) is embedded directly into `Notes AI.exe` using `rcedit.exe` (bundled in `node_modules/electron-winstaller/vendor/`). The icon is **not** a separate file at runtime. `electron-builder` does this automatically during packaging. If you regenerate the icon, rebuild the app.

---

## 14. Known issues & workarounds

### "I see the Electron icon, not the custom icon"

The custom icon must be **embedded** into the exe. A shortcut `.IconLocation` pointing to a separate `.ico` file is unreliable on Windows 11. The correct fix is `rcedit`:
```powershell
.\node_modules\electron-winstaller\vendor\rcedit.exe "path\to\Notes AI.exe" --set-icon build\icon.ico
```
Note: the exe must be outside OneDrive or any cloud-sync folder when rcedit runs, otherwise OneDrive locks the file.

### App loads old build instead of dev server

If `dist/index.html` exists from a previous production build, `electron/main.cjs` will load it instead of `http://127.0.0.1:5173`. Delete the `dist/` folder or run `npm run build` to refresh it.

### Whisper model re-downloads every time

This is a browser cache issue — clear IndexedDB in DevTools → Application → IndexedDB, or check that `env.useBrowserCache = true` is set in the worker.

### TypeScript error: `Property 'env' does not exist on type 'ImportMeta'`

The `"types": ["vite/client"]` line is missing from `tsconfig.json`. Add it under `compilerOptions`.

### `noUnusedLocals` / `noUnusedParameters` build failures

Prefix unused variables with `_`. Example: `const [_hovering, setHovering] = useState(false)`.

---

## 15. Adding new features — patterns to follow

### Adding a new persistent data type

1. Define the TypeScript interface in `src/lib/types.ts`
2. Add get/save/delete functions in `src/lib/storage.ts` (localStorage pattern)
3. Add state + CRUD callbacks to `useNotes.ts` (or a new dedicated hook)
4. Wire through `App.tsx` as props

### Adding a new view panel (alongside Notes / Graph / Tasks)

1. Add the new mode to `ViewMode` in `src/lib/types.ts`:
   ```typescript
   export type ViewMode = 'notes' | 'graph' | 'todo' | 'yourNewView'
   ```
2. Add the tab to `VIEW_TABS` in `src/components/Sidebar.tsx`
3. Add the branch in `App.tsx`'s view switcher

### Adding a new toolbar button to NoteEditor

Add it between the existing toolbar items in `NoteEditor.tsx`. Follow the existing pattern:
- Inline `style` prop for colours (no Tailwind colour classes)
- `onMouseEnter`/`onMouseLeave` for hover states (no CSS `:hover` in inline styles)
- Close on outside click via `useEffect` + `data-*` attribute (see the font picker pattern)

### Calling Claude for something new

Add a new exported async function to `src/lib/claude.ts`. Use the same `getClient()` pattern — it creates the client lazily and reuses it. Keep the model as `claude-opus-4-7` for consistency. Parse JSON responses defensively (try/catch with fallback).

### Adding a native Node.js capability (file system, shell, etc.)

1. Add the function to `electron/preload.cjs` via `contextBridge.exposeInMainWorld`
2. Add the TypeScript declaration to a `.d.ts` file (e.g. `src/electron.d.ts`):
   ```typescript
   interface Window { electronAPI: { yourNewFn: () => void } }
   ```
3. Call it from the renderer as `window.electronAPI.yourNewFn()`

---

## Quick reference

```bash
npm run dev              # Vite dev server only (browser)
npm run electron:dev     # Full Electron + Vite dev (use this normally)
npm run electron:preview # Test production build without installer
npm run electron:build   # Build NSIS installer → release/
npm run build            # Vite + TypeScript compile only (no Electron)
```

```
Installed app location:   C:\Users\<you>\AppData\Local\NotesAI\
User data (localStorage): C:\Users\<you>\AppData\Roaming\notes-ai\
Icon generator script:    node_modules\electron\dist\electron.exe scripts\generate-icon.cjs
```
