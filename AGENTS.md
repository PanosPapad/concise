# AGENTS.md -- Concise Tab Organiser

## Project Overview

Concise is a Chrome extension that lets users organise browser tabs into named workspaces. It solves the problem of multiple Chrome windows accumulating stale tabs with no clear boundaries between contexts (e.g., "work", "side project", "research").

Core capabilities:
- Named, color-coded workspaces bound to Chrome windows
- Save a workspace (snapshot tabs, close the window) and restore it later
- Tab staleness indicators based on last activation time
- Command palette for keyboard-driven search across workspaces and tabs
- Reordering workspaces within Active/Saved sections
- Export/import workspace data as JSON backup files
- Detection and assignment of untracked windows

## Tech Stack

- **UI framework:** Preact 10 (NOT React) with hooks (`preact/hooks`)
- **Language:** TypeScript with strict mode enabled
- **Bundler:** esbuild via a custom `build.js` script (NOT webpack, NOT Vite)
- **Styling:** Inline style objects (no CSS files, no Tailwind utility classes in markup despite Tailwind being a devDependency)
- **Extension manifest:** Manifest V3
- **Storage:** `chrome.storage.local`
- **Target:** ES2020, ESNext modules, bundled to IIFE for Chrome

## Architecture

The codebase has three layers:

```
src/
  shared/          # Pure logic + types, imported by both background and popup
    types.ts       # Data interfaces: Workspace, SavedTab, UntrackedWindow, WORKSPACE_COLORS
    storage.ts     # chrome.storage.local CRUD: get/save/delete workspaces, export/import
    workspace-manager.ts  # Business logic: create, restore, switch, save, delete, rename, reorder, snapshot
  background/
    service-worker.ts  # Manifest V3 service worker: tab sync, window tracking, message handling
  popup/
    index.html     # Entry HTML (360px wide, dark background)
    index.tsx       # Preact render entry point
    App.tsx         # Root component: state management, keyboard shortcuts, export/import
    utils.ts        # Utility functions (getDomain)
    components/
      WorkspaceList.tsx      # Splits workspaces into Active/Saved sections, renders untracked windows
      WorkspaceCard.tsx      # Single workspace: expand/collapse tabs, rename, switch/save/restore/delete
      CreateWorkspace.tsx    # Form for creating a new workspace with name + color picker
      CommandPalette.tsx     # Full-overlay search across workspaces and individual tabs
      UntrackedWindow.tsx    # Card for windows not assigned to any workspace, with inline assign form
```

### Data Flow

1. **Service worker** listens to `chrome.tabs.*` and `chrome.windows.*` events. On any tab change (create, remove, update, move, attach, detach), it debounces a 300ms snapshot of the affected window's tabs and writes to `chrome.storage.local`.
2. **Popup** reads workspace data directly from `chrome.storage.local` via the shared `storage.ts` and `workspace-manager.ts` modules. It also sends messages to the service worker for operations that need a fresh snapshot (`getWorkspaces`, `refreshWorkspace`).
3. **Storage** is a single key (`"workspaces"`) holding a `Record<string, Workspace>` -- a flat map of workspace ID to workspace object.

### Storage Schema

All data lives under one `chrome.storage.local` key:

```typescript
{
  "workspaces": {
    [id: string]: {
      id: string;              // crypto.randomUUID()
      name: string;            // User-chosen name
      color: string;           // Hex color from WORKSPACE_COLORS
      windowId: number | null; // Non-null if workspace is currently open in a Chrome window
      tabs: SavedTab[];        // Snapshot of tabs
      createdAt: number;       // Date.now() at creation
      lastAccessedAt: number;  // Updated on switch/restore
      sortOrder: number;       // Manual ordering within Active/Saved sections
    }
  }
}
```

Each `SavedTab`:
```typescript
{
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  lastActivatedAt?: number;  // Tracks when the tab was last focused (for staleness)
}
```

### Message Protocol (service worker <-> popup)

Messages are sent via `chrome.runtime.sendMessage` and handled in the service worker's `chrome.runtime.onMessage` listener. Current message types:

| `action` | Payload | Response | Purpose |
|---|---|---|---|
| `"getWorkspaces"` | none | `Workspace[]` | Get sorted workspace list with sortOrder backfill migration |
| `"refreshWorkspace"` | `{ workspaceId: string }` | `Workspace \| null` | Force a fresh tab snapshot for a specific workspace |

## Development Workflow

### Prerequisites
- Node.js (for esbuild and the build script)
- Chrome browser

### Commands

```bash
npm install          # Install dependencies
npm run build        # One-shot production build -> dist/
npm run watch        # Rebuild on file changes -> dist/
npm run clean        # Remove dist/
```

### Loading in Chrome

1. Run `npm run build` (or `npm run watch` for development)
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` directory
5. After rebuilding, click the refresh icon on the extension card in `chrome://extensions`

The popup opens via the toolbar icon or keyboard shortcut `Cmd+Shift+K` (Mac) / `Ctrl+Shift+K` (other platforms).

### Build Output

The `build.js` script produces:
- `dist/manifest.json` (copied from root)
- `dist/popup/index.html` (copied from `src/popup/`)
- `dist/popup/index.js` (bundled IIFE from `src/popup/index.tsx`)
- `dist/background/service-worker.js` (bundled IIFE from `src/background/service-worker.ts`)

Both bundles use `format: "iife"` because Chrome extension contexts do not support ES modules in service workers or popup scripts.

## Code Conventions

### Preact, Not React
All imports come from `preact/hooks` (`useState`, `useEffect`, `useRef`, `useMemo`). JSX is configured with `jsxImportSource: "preact"` in both `tsconfig.json` and the esbuild config. Never import from `react` or `react-dom`.

### Component Pattern
- Functional components only, using Preact hooks
- Props defined as a `Props` interface directly above the component
- Inline style objects defined as `const styles = { ... }` at module scope
- Dynamic styles use functions: `styles.dot(color)`, `styles.colorDot(color, selected)`, `btnStyle(color, variant)`
- No CSS classes, no CSS modules, no styled-components
- Components export named exports (no default exports)

### Error Handling
- Async operations wrapped in try/catch with `window.alert` for user-facing errors
- Service worker errors logged with `console.error` prefixed `[Concise]`
- Fallback values used liberally: `tab.url ?? ""`, `tab.pinned ?? false`

### Chrome API Usage
- Tab queries: `chrome.tabs.query({ windowId })` with filtering out `chrome://` and `chrome-extension://` URLs
- Storage: always read-modify-write through `getAllWorkspaces()` then `saveAllWorkspaces()`
- Window management: `chrome.windows.create`, `chrome.windows.update`, `chrome.windows.remove`
- IDs generated with `crypto.randomUUID()`

### TypeScript
- Strict mode enabled
- No `any` types in the codebase; uses `Record<string, unknown>` for untyped objects during import validation
- Type assertions used sparingly and only at boundaries (`e.target as HTMLInputElement`)

### Naming
- Files: kebab-case (`workspace-manager.ts`, `service-worker.ts`)
- Components: PascalCase files matching component name (`WorkspaceCard.tsx` exports `WorkspaceCard`)
- Interfaces: PascalCase (`Workspace`, `SavedTab`, `UntrackedWindow`)
- Constants: UPPER_SNAKE_CASE (`WORKSPACE_COLORS`, `STORAGE_KEY`, `MAX_TABS`)

## Key Constraints

### Manifest V3 Service Worker
- The service worker is NOT a persistent background page. It can be terminated at any time by Chrome.
- All state must go through `chrome.storage.local`. Never hold important state in service worker variables (the `pendingSnapshots` map is intentionally ephemeral -- losing a pending debounce is acceptable).
- The service worker cannot access DOM APIs.

### Popup Lifecycle
- The popup is destroyed every time it closes. All state is re-fetched from storage on mount.
- Popup dimensions are fixed at 360px wide, 500px max height (set in `App.tsx` container style and `index.html`).

### Storage Limits
- `chrome.storage.local` has a 10MB limit (effectively unlimited for this use case, but be aware).
- All workspaces are stored under a single key. Read-modify-write means concurrent writes can race; the 300ms debounce in the service worker mitigates this.

### URL Filtering
- `chrome://` and `chrome-extension://` URLs are filtered out of all tab snapshots. These cannot be opened programmatically and should never be persisted.

## Common Tasks

### Adding a New Popup Component

1. Create `src/popup/components/YourComponent.tsx`
2. Define a `Props` interface and a `styles` object at module scope
3. Export a named function component
4. Import and use it from the parent component (likely `App.tsx` or `WorkspaceList.tsx`)
5. Follow the inline-styles pattern -- do not introduce CSS files

### Adding a New Message Type

1. Add the handler in `src/background/service-worker.ts` inside the `chrome.runtime.onMessage` listener
2. Pattern: check `message.action === "yourAction"`, do async work, call `sendResponse`, return `true` (to indicate async response)
3. Send from popup with `chrome.runtime.sendMessage({ action: "yourAction", ...payload })`

### Modifying the Storage Schema

1. Update the `Workspace` or `SavedTab` interface in `src/shared/types.ts`
2. If adding a new field, handle migration in `getWorkspaceList()` in `workspace-manager.ts` (see the `sortOrder` backfill pattern on lines 168-184)
3. Update `importData()` in `storage.ts` to validate and default the new field for imported backups

### Adding a New Workspace Action

1. Implement the business logic in `src/shared/workspace-manager.ts` following the existing pattern (async function, reads workspace from storage, performs chrome.* API calls, writes back)
2. Wire it into the relevant UI component (usually `WorkspaceCard.tsx`) using the `act()` wrapper pattern for loading state and error handling

## What NOT to Do

- **Do not introduce React.** This project uses Preact. Never import from `react` or `react-dom`. The JSX runtime is `preact/jsx-runtime`.
- **Do not add a backend or server.** This is a self-contained Chrome extension. All data lives in `chrome.storage.local`.
- **Do not switch to webpack or Vite.** The project uses a custom `build.js` with esbuild. It is fast and simple. Add esbuild plugins if needed, not a new bundler.
- **Do not use `chrome.storage.sync`.** Use `chrome.storage.local`. Sync storage has a 100KB limit and is unsuitable for tab data.
- **Do not use ES module format in bundles.** Chrome extension service workers and popup scripts require IIFE bundles. The esbuild config uses `format: "iife"`.
- **Do not introduce CSS files or a CSS-in-JS library.** The project uses inline style objects exclusively.
- **Do not store state in service worker variables** expecting it to persist. The service worker can be killed at any time. Use `chrome.storage.local` for anything that must survive.
- **Do not attempt to save or restore `chrome://` or `chrome-extension://` URLs.** They are filtered out intentionally and cannot be opened programmatically.
