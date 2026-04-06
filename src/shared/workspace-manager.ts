import { SavedTab, Workspace, UntrackedWindow } from './types';
import {
  getAllWorkspaces,
  getWorkspace,
  saveWorkspace,
  saveAllWorkspaces,
  deleteWorkspace as removeWorkspace,
} from './storage';

export async function snapshotTabs(
  windowId: number,
  existingTabs?: SavedTab[],
): Promise<SavedTab[]> {
  const tabs = await chrome.tabs.query({ windowId });
  // Preserve lastActivatedAt values by URL when re-snapshotting
  const activatedMap = new Map<string, number>();
  if (existingTabs) {
    for (const t of existingTabs) {
      if (t.lastActivatedAt) {
        activatedMap.set(t.url, t.lastActivatedAt);
      }
    }
  }

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
      lastActivatedAt: activatedMap.get(tab.url ?? ''),
    }));
}

export async function createWorkspace(
  name: string,
  color: string,
  targetWindowId?: number,
): Promise<Workspace> {
  const windowId =
    targetWindowId ?? (await chrome.windows.getCurrent()).id!;

  const existing = await getAllWorkspaces();
  const conflict = Object.values(existing).find(
    (ws) => ws.windowId === windowId,
  );
  if (conflict) {
    throw new Error(
      `Window is already assigned to workspace "${conflict.name}"`,
    );
  }

  const maxOrder = Object.values(existing).reduce(
    (max, ws) => Math.max(max, ws.sortOrder ?? 0),
    0,
  );

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
    sortOrder: maxOrder + 1,
  };

  await saveWorkspace(workspace);
  return workspace;
}

export async function restoreWorkspace(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;

  const firstUrl = workspace.tabs[0]?.url;
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
  const tabs = await snapshotTabs(windowId, workspace.tabs);

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
  const list = Object.values(workspaces);

  // Migration: backfill sortOrder for workspaces that don't have it
  let needsSave = false;
  const sorted = list.sort((a, b) => a.createdAt - b.createdAt);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sortOrder === undefined || sorted[i].sortOrder === null) {
      sorted[i].sortOrder = i + 1;
      needsSave = true;
    }
  }
  if (needsSave) {
    const updated: Record<string, Workspace> = {};
    for (const ws of sorted) updated[ws.id] = ws;
    await saveAllWorkspaces(updated);
  }

  return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function reorderWorkspace(
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  const all = await getAllWorkspaces();
  const workspace = all[id];
  if (!workspace) return;

  const isActive = workspace.windowId !== null;
  const section = Object.values(all)
    .filter((ws) => (ws.windowId !== null) === isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const idx = section.findIndex((ws) => ws.id === id);
  if (idx === -1) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= section.length) return;

  const temp = section[idx].sortOrder;
  section[idx].sortOrder = section[swapIdx].sortOrder;
  section[swapIdx].sortOrder = temp;

  all[section[idx].id] = section[idx];
  all[section[swapIdx].id] = section[swapIdx];
  await saveAllWorkspaces(all);
}

export async function getUntrackedWindows(): Promise<UntrackedWindow[]> {
  const allWindows = await chrome.windows.getAll({ populate: true });
  const workspaces = await getAllWorkspaces();
  const trackedWindowIds = new Set(
    Object.values(workspaces)
      .map((ws) => ws.windowId)
      .filter((id): id is number => id !== null),
  );

  return allWindows
    .filter((win) => win.id !== undefined && !trackedWindowIds.has(win.id))
    .map((win) => ({
      windowId: win.id!,
      tabs: (win.tabs ?? [])
        .filter((tab) => {
          const url = tab.url ?? '';
          return url !== '' && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
        })
        .map((tab) => ({
          url: tab.url ?? '',
          title: tab.title ?? '',
          favIconUrl: tab.favIconUrl,
          pinned: tab.pinned ?? false,
        })),
    }))
    .filter((win) => win.tabs.length > 0);
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

  await chrome.windows.update(other.windowId!, { focused: true });
  await saveWorkspaceToStorage(currentWorkspaceId);
}
