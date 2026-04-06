import { Workspace } from '../shared/types';
import {
  getAllWorkspaces,
  getWorkspace,
  saveWorkspace,
  saveAllWorkspaces,
} from '../shared/storage';
import { snapshotTabs, getWorkspaceList } from '../shared/workspace-manager';

console.log('Manama service worker loaded');

// --- Debounce infrastructure ---

const pendingSnapshots = new Map<number, ReturnType<typeof setTimeout>>();

function debouncedSnapshotForWindow(windowId: number): void {
  const existing = pendingSnapshots.get(windowId);
  if (existing) {
    clearTimeout(existing);
  }

  const timeout = setTimeout(() => {
    pendingSnapshots.delete(windowId);
    syncTabsForWindow(windowId);
  }, 300);

  pendingSnapshots.set(windowId, timeout);
}

// --- Core sync logic ---

async function findWorkspaceByWindowId(
  windowId: number,
): Promise<{ workspace: Workspace; allWorkspaces: Record<string, Workspace> } | null> {
  const allWorkspaces = await getAllWorkspaces();
  for (const workspace of Object.values(allWorkspaces)) {
    if (workspace.windowId === windowId) {
      return { workspace, allWorkspaces };
    }
  }
  return null;
}

async function syncTabsForWindow(windowId: number): Promise<void> {
  try {
    const result = await findWorkspaceByWindowId(windowId);
    if (!result) return;

    const { workspace } = result;
    const tabs = await snapshotTabs(windowId);

    // Re-read storage after async work to guard against interleaved writes
    const freshWorkspaces = await getAllWorkspaces();
    const freshWorkspace = freshWorkspaces[workspace.id];
    if (!freshWorkspace || freshWorkspace.windowId !== windowId) return;

    freshWorkspace.tabs = tabs;
    freshWorkspaces[workspace.id] = freshWorkspace;
    await saveAllWorkspaces(freshWorkspaces);
  } catch (error) {
    console.error(`[Manama] Failed to sync tabs for window ${windowId}:`, error);
  }
}

// --- 1. Window close handler ---

chrome.windows.onRemoved.addListener(async (windowId: number) => {
  // Clear any pending debounce for this window before async work
  const pending = pendingSnapshots.get(windowId);
  if (pending) {
    clearTimeout(pending);
    pendingSnapshots.delete(windowId);
  }

  try {
    const result = await findWorkspaceByWindowId(windowId);
    if (!result) return;

    const { workspace, allWorkspaces } = result;
    workspace.windowId = null;
    allWorkspaces[workspace.id] = workspace;
    await saveAllWorkspaces(allWorkspaces);
  } catch (error) {
    console.error(`[Manama] Failed to handle window removal for ${windowId}:`, error);
  }
});

// --- 2. Tab change sync ---

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.windowId !== undefined) {
    debouncedSnapshotForWindow(tab.windowId);
  }
});

chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
  // Don't sync if the entire window is closing -- onRemoved handler covers that
  if (!removeInfo.isWindowClosing) {
    debouncedSnapshotForWindow(removeInfo.windowId);
  }
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.windowId !== undefined) {
    debouncedSnapshotForWindow(tab.windowId);
  }
});

chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
  debouncedSnapshotForWindow(moveInfo.windowId);
});

chrome.tabs.onDetached.addListener((_tabId, detachInfo) => {
  debouncedSnapshotForWindow(detachInfo.oldWindowId);
});

chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
  debouncedSnapshotForWindow(attachInfo.newWindowId);
});

// --- 4. Extension install handler ---

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Manama] Extension ${details.reason}: version ${chrome.runtime.getManifest().version}`);
});

// --- 5. Message handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getWorkspaces') {
    getWorkspaceList().then(sendResponse).catch((error) => {
      console.error('[Manama] Failed to get workspaces:', error);
      sendResponse([]);
    });
    return true; // keep message channel open for async response
  }

  if (message.action === 'refreshWorkspace' && message.workspaceId) {
    (async () => {
      try {
        const workspace = await getWorkspace(message.workspaceId);
        if (!workspace || workspace.windowId === null) {
          sendResponse(workspace);
          return;
        }

        const tabs = await snapshotTabs(workspace.windowId);
        workspace.tabs = tabs;
        await saveWorkspace(workspace);
        sendResponse(workspace);
      } catch (error) {
        console.error('[Manama] Failed to refresh workspace:', error);
        sendResponse(null);
      }
    })();
    return true;
  }
});
