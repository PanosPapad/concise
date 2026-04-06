import { SavedTab, Workspace } from './types';
import {
  getAllWorkspaces,
  getWorkspace,
  saveWorkspace,
  deleteWorkspace as removeWorkspace,
} from './storage';

export async function snapshotTabs(windowId: number): Promise<SavedTab[]> {
  const tabs = await chrome.tabs.query({ windowId });
  return tabs
    .filter((tab) => {
      const url = tab.url ?? '';
      return url !== '' && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
    })
    .map((tab) => ({
      url: tab.url ?? '',
      title: tab.title ?? '',
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned ?? false,
    }));
}

export async function createWorkspace(
  name: string,
  color: string,
  targetWindowId?: number,
): Promise<Workspace> {
  const windowId =
    targetWindowId ?? (await chrome.windows.getCurrent()).id!;

  // Prevent assigning a window that already belongs to another workspace
  const existing = await getAllWorkspaces();
  const conflict = Object.values(existing).find(
    (ws) => ws.windowId === windowId,
  );
  if (conflict) {
    throw new Error(
      `Window is already assigned to workspace "${conflict.name}"`,
    );
  }

  const tabs = await snapshotTabs(windowId);
  const now = Date.now();

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    color,
    windowId,
    tabs,
    createdAt: now,
    lastAccessedAt: now,
  };

  await saveWorkspace(workspace);
  return workspace;
}

export async function restoreWorkspace(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;

  const urls = workspace.tabs.map((t) => t.url);
  const firstUrl = urls[0];
  if (!firstUrl) {
    throw new Error('Workspace has no restorable tabs');
  }

  const newWindow = await chrome.windows.create({ url: firstUrl });
  const newWindowId = newWindow.id!;

  if (workspace.tabs[0]?.pinned && newWindow.tabs?.[0]?.id) {
    await chrome.tabs.update(newWindow.tabs[0].id, { pinned: true });
  }

  for (let i = 1; i < workspace.tabs.length; i++) {
    const tab = workspace.tabs[i];
    await chrome.tabs.create({
      windowId: newWindowId,
      url: tab.url,
      pinned: tab.pinned,
    });
  }

  workspace.windowId = newWindowId;
  workspace.lastAccessedAt = Date.now();
  await saveWorkspace(workspace);
}

export async function switchToWorkspace(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;

  if (workspace.windowId !== null) {
    try {
      await chrome.windows.update(workspace.windowId, { focused: true });
      workspace.lastAccessedAt = Date.now();
      await saveWorkspace(workspace);
    } catch {
      // Window no longer exists -- clear stale windowId and restore
      workspace.windowId = null;
      await saveWorkspace(workspace);
      await restoreWorkspace(id);
    }
  } else {
    await restoreWorkspace(id);
  }
}

export async function saveWorkspaceToStorage(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace || workspace.windowId === null) return;

  const windowId = workspace.windowId;
  const tabs = await snapshotTabs(windowId);

  workspace.tabs = tabs;
  workspace.windowId = null;
  await saveWorkspace(workspace);

  await chrome.windows.remove(windowId);
}

export async function deleteWorkspace(id: string): Promise<void> {
  await removeWorkspace(id);
}

export async function renameWorkspace(
  id: string,
  name: string,
): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;

  workspace.name = name;
  await saveWorkspace(workspace);
}

export async function getWorkspaceList(): Promise<Workspace[]> {
  const workspaces = await getAllWorkspaces();
  return Object.values(workspaces).sort(
    (a, b) => b.lastAccessedAt - a.lastAccessedAt,
  );
}

export async function saveCurrentAndSwitch(
  currentWorkspaceId: string,
): Promise<void> {
  const all = await getAllWorkspaces();
  const current = all[currentWorkspaceId];
  if (!current || current.windowId === null) return;

  const other = Object.values(all).find(
    (ws) => ws.id !== currentWorkspaceId && ws.windowId !== null,
  );
  if (!other) {
    throw new Error('No other active workspace to switch to');
  }

  // Focus the other window FIRST so the popup survives long enough to finish
  await chrome.windows.update(other.windowId!, { focused: true });
  await saveWorkspaceToStorage(currentWorkspaceId);
}
