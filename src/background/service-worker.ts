import { Workspace } from '../shared/types';
import {
  getAllWorkspaces,
  getWorkspace,
  saveWorkspace,
  saveAllWorkspaces,
  pushBackup,
} from '../shared/storage';
import { snapshotTabs, getWorkspaceList } from '../shared/workspace-manager';

console.log('Concise service worker loaded');

// --- Dashboard tab management ---

const DASHBOARD_PATH = 'dashboard/index.html';

async function openOrFocusDashboard(): Promise<void> {
  const extensionUrl = chrome.runtime.getURL(DASHBOARD_PATH);
  const currentWindow = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ url: extensionUrl, windowId: currentWindow.id });

  if (tabs.length > 0 && tabs[0].id !== undefined) {
    await chrome.tabs.update(tabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: extensionUrl, windowId: currentWindow.id });
  }
}

chrome.action.onClicked.addListener(async () => {
  try {
    await openOrFocusDashboard();
  } catch (error) {
    console.error('[Concise] Failed to open or focus dashboard:', error);
  }
});

// --- Debounce infrastructure ---

const pendingSnapshots = new Map<number, ReturnType<typeof setTimeout>>();

function debouncedSnapshotForWindow(windowId: number): void {
  const existing = pendingSnapshots.get(windowId);
  if (existing) clearTimeout(existing);

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
    const tabs = await snapshotTabs(windowId, workspace.tabs);

    const freshWorkspaces = await getAllWorkspaces();
    const freshWorkspace = freshWorkspaces[workspace.id];
    if (!freshWorkspace || freshWorkspace.windowId !== windowId) return;

    freshWorkspace.tabs = tabs;
    freshWorkspaces[workspace.id] = freshWorkspace;
    await saveAllWorkspaces(freshWorkspaces);
  } catch (error) {
    console.error(`[Concise] Failed to sync tabs for window ${windowId}:`, error);
  }
}

// --- Window close handler ---

chrome.windows.onRemoved.addListener(async (windowId: number) => {
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
    console.error(`[Concise] Failed to handle window removal for ${windowId}:`, error);
  }
});

// --- Tab change sync ---

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.windowId !== undefined) debouncedSnapshotForWindow(tab.windowId);
});

chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
  if (!removeInfo.isWindowClosing) debouncedSnapshotForWindow(removeInfo.windowId);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  const dominated =
    changeInfo.status === 'complete' ||
    changeInfo.pinned !== undefined ||
    changeInfo.url !== undefined ||
    changeInfo.title !== undefined;
  if (dominated && tab.windowId !== undefined) {
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

// --- Tab activation tracking (stale tab indicators) ---

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const result = await findWorkspaceByWindowId(activeInfo.windowId);
    if (!result) return;

    const { workspace, allWorkspaces } = result;
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const url = tab.url ?? '';

    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

    const matchIdx = workspace.tabs.findIndex((t) => t.url === url);
    if (matchIdx !== -1) {
      workspace.tabs[matchIdx].lastActivatedAt = Date.now();
      allWorkspaces[workspace.id] = workspace;
      await saveAllWorkspaces(allWorkspaces);
    }
  } catch (error) {
    console.error('[Concise] Failed to track tab activation:', error);
  }
});

// --- Extension install handler ---

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Concise] Extension ${details.reason}: version ${chrome.runtime.getManifest().version}`);
  chrome.alarms.create('concise-auto-backup', {
    delayInMinutes: 30,
    periodInMinutes: 30,
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('concise-auto-backup', {
    delayInMinutes: 30,
    periodInMinutes: 30,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'concise-auto-backup') return;
  try {
    const workspaces = await getAllWorkspaces();
    if (Object.keys(workspaces).length === 0) return;
    await pushBackup(workspaces);
    console.log('[Concise] Auto-backup saved');
  } catch (error) {
    console.error('[Concise] Auto-backup failed:', error);
  }
});

// --- Message handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getWorkspaces') {
    getWorkspaceList().then(sendResponse).catch((error) => {
      console.error('[Concise] Failed to get workspaces:', error);
      sendResponse([]);
    });
    return true;
  }

  if (message.action === 'refreshWorkspace' && message.workspaceId) {
    (async () => {
      try {
        const workspace = await getWorkspace(message.workspaceId);
        if (!workspace || workspace.windowId === null) {
          sendResponse(workspace);
          return;
        }
        const tabs = await snapshotTabs(workspace.windowId, workspace.tabs);
        workspace.tabs = tabs;
        await saveWorkspace(workspace);
        sendResponse(workspace);
      } catch (error) {
        console.error('[Concise] Failed to refresh workspace:', error);
        sendResponse(null);
      }
    })();
    return true;
  }
});
