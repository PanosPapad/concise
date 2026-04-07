# Concise - Tab Organiser

A Chrome extension that brings named workspaces to your browser. Group tabs into workspaces, switch between them, and pick up where you left off.

## Features

- **Named workspaces** - Create color-coded workspaces that map to Chrome windows
- **Automatic tab tracking** - Tabs are synced to their workspace as you browse
- **Dashboard view** - Full-page workspace manager with sidebar navigation, search, and inline creation
- **Popup** - Quick-access workspace switcher from the toolbar
- **Command palette** - Press `/` to search and switch workspaces instantly
- **Export / Import** - Back up your workspaces as JSON and restore them on any machine
- **Stale tab detection** - Tracks tab activation times to surface tabs you haven't visited in a while

## Install from source

```bash
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` directory

## Development

```bash
npm run watch
```

This starts ESBuild in watch mode. After making changes, reload the extension from `chrome://extensions`.

## Keyboard shortcut

`Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux) opens the dashboard.

## Tech stack

- [Preact](https://preactjs.com/) - UI rendering
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [ESBuild](https://esbuild.github.io/) - Bundling
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- Chrome Manifest V3

## Project structure

```
src/
  background/     Service worker - tab/window event handling
  popup/          Toolbar popup UI
  dashboard/      Full-page dashboard UI
  shared/         Storage, types, and workspace manager
icons/            Extension icons (16/32/48/128px)
build.js          ESBuild configuration
manifest.json     Chrome extension manifest
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Read tab URLs and titles to associate with workspaces |
| `windows` | Track which window maps to which workspace |
| `storage` | Persist workspace names and tab lists locally |

All data is stored locally on your machine using `chrome.storage.local`. No data leaves the browser.
