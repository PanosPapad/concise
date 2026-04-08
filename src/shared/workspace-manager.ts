import { SavedTab, Workspace, UntrackedWindow } from './types';
import {
  getAllWorkspaces,
  getWorkspace,
  saveWorkspace,
  saveAllWorkspaces,
  deleteWorkspace as removeWorkspace,
} from './storage';

function isDegradedUrl(newUrl: string, oldUrl: string): boolean {
  try {
    const a = new URL(newUrl);
    const b = new URL(oldUrl);
    return (
      a.origin === b.origin &&
      b.pathname.startsWith(a.pathname) &&
      b.pathname.length > a.pathname.length
    );
  } catch {
    return false;
  }
}

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
    .map((tab) => {
      let url = tab.url ?? '';
      // Guard against Chrome's tab-sleep URL degradation for SPAs (e.g. Gemini)
      if (existingTabs && (tab.status === 'unloaded' || tab.discarded)) {
        const preserved = existingTabs.find(
          (old) => isDegradedUrl(url, old.url),
        );
        if (preserved) url = preserved.url;
      }
      return {
        url,
        title: tab.title ?? '',
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned ?? false,
        lastActivatedAt:
          activatedMap.get(url) ?? activatedMap.get(tab.url ?? ''),
      };
    });
}

export async function createWorkspace(
  name: string,
  color: string,
  targetWindowId?: number,
): Promise<Workspace> {
  const windowId = targetWindowId ?? await (async () => {
    const win = await chrome.windows.getCurrent();
    if (win.id === undefined) throw new Error('Unable to create workspace: current window has no id');
    return win.id;
  })();

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

  const restorableTabs = workspace.tabs.filter((t) => {
    const url = t.url ?? '';
    return url !== '' && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
  });
  const firstTab = restorableTabs[0];
  if (!firstTab) {
    throw new Error('Workspace has no restorable tabs');
  }

  const newWindow = await chrome.windows.create({ url: firstTab.url });
  const newWindowId = newWindow.id!;

  if (firstTab.pinned && newWindow.tabs?.[0]?.id) {
    await chrome.tabs.update(newWindow.tabs[0].id, { pinned: true });
  }

  for (let i = 1; i < restorableTabs.length; i++) {
    const tab = restorableTabs[i];
    if (restorableTabs.length > 5 && i > 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await chrome.tabs.create({
      windowId: newWindowId,
      url: tab.url,
      pinned: tab.pinned,
      active: false,
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
  const workspace = await getWorkspace(id);
  if (workspace?.locked) throw new Error(`"${workspace.name}" is locked`);
  await removeWorkspace(id);
}

export async function toggleLock(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;
  workspace.locked = !workspace.locked;
  await saveWorkspace(workspace);
}

export async function toggleStar(id: string): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;
  workspace.starred = !workspace.starred;
  await saveWorkspace(workspace);
}

export async function updateWorkspaceNotes(
  id: string,
  notes: string,
): Promise<void> {
  const workspace = await getWorkspace(id);
  if (!workspace) return;
  workspace.notes = notes;
  await saveWorkspace(workspace);
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

  return list.sort((a, b) => {
    const aStarred = a.starred ? 0 : 1;
    const bStarred = b.starred ? 0 : 1;
    if (aStarred !== bStarred) return aStarred - bStarred;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
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

export async function reorderWorkspaceTo(
  workspaceId: string,
  newIndex: number,
  section: 'active' | 'saved',
): Promise<void> {
  const all = await getAllWorkspaces();
  const list = Object.values(all).sort((a, b) => {
    const aStarred = a.starred ? 0 : 1;
    const bStarred = b.starred ? 0 : 1;
    if (aStarred !== bStarred) return aStarred - bStarred;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const activeList = list.filter((ws) => ws.windowId !== null);
  const savedList = list.filter((ws) => ws.windowId === null);
  const sectionList = section === 'active' ? activeList : savedList;

  const currentIdx = sectionList.findIndex((ws) => ws.id === workspaceId);
  if (currentIdx === -1) return;

  const [moved] = sectionList.splice(currentIdx, 1);
  const effectiveIndex = newIndex > currentIdx ? newIndex - 1 : newIndex;
  const clampedIndex = Math.max(0, Math.min(effectiveIndex, sectionList.length));
  sectionList.splice(clampedIndex, 0, moved);

  for (let i = 0; i < sectionList.length; i++) {
    sectionList[i].sortOrder = i;
    all[sectionList[i].id] = sectionList[i];
  }

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

export async function removeTabFromWorkspace(
  workspaceId: string,
  tabUrl: string,
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return;

  const tabIndex = workspace.tabs.findIndex((t) => t.url === tabUrl);
  if (tabIndex === -1) return;
  workspace.tabs.splice(tabIndex, 1);
  await saveWorkspace(workspace);

  if (workspace.windowId !== null) {
    const liveTabs = await chrome.tabs.query({ windowId: workspace.windowId });
    const match = liveTabs.find((t) => t.url === tabUrl);
    if (match?.id !== undefined) {
      await chrome.tabs.remove(match.id);
    }
  }
}

export async function moveTabBetweenWorkspaces(
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  tabUrl: string,
): Promise<void> {
  const [source, target] = await Promise.all([
    getWorkspace(sourceWorkspaceId),
    getWorkspace(targetWorkspaceId),
  ]);
  if (!source || !target) return;

  const tabIndex = source.tabs.findIndex((t) => t.url === tabUrl);
  if (tabIndex === -1) return;
  const [tab] = source.tabs.splice(tabIndex, 1);
  target.tabs.push(tab);

  await Promise.all([saveWorkspace(source), saveWorkspace(target)]);

  if (source.windowId !== null) {
    const liveTabs = await chrome.tabs.query({ windowId: source.windowId });
    const match = liveTabs.find((t) => t.url === tabUrl);
    if (match?.id !== undefined) {
      await chrome.tabs.remove(match.id);
    }
  }

  if (target.windowId !== null) {
    await chrome.tabs.create({ windowId: target.windowId, url: tabUrl });
  }
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
