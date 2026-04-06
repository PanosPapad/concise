import { Workspace } from './types';

const STORAGE_KEY = 'workspaces';

export async function getAllWorkspaces(): Promise<Record<string, Workspace>> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? {};
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const workspaces = await getAllWorkspaces();
  return workspaces[id] ?? null;
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const workspaces = await getAllWorkspaces();
  workspaces[workspace.id] = workspace;
  await chrome.storage.local.set({ [STORAGE_KEY]: workspaces });
}

export async function deleteWorkspace(id: string): Promise<void> {
  const workspaces = await getAllWorkspaces();
  delete workspaces[id];
  await chrome.storage.local.set({ [STORAGE_KEY]: workspaces });
}

export async function saveAllWorkspaces(
  workspaces: Record<string, Workspace>,
): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: workspaces });
}

export async function exportData(): Promise<string> {
  const workspaces = await getAllWorkspaces();
  return JSON.stringify(workspaces, null, 2);
}

export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup format');
  }
  for (const value of Object.values(parsed)) {
    const ws = value as Record<string, unknown>;
    if (typeof ws.id !== 'string' || typeof ws.name !== 'string') {
      throw new Error('Invalid workspace data in backup');
    }
    if (!Array.isArray(ws.tabs)) {
      ws.tabs = [];
    }
    if (typeof ws.color !== 'string') {
      ws.color = '#6366f1';
    }
    if (typeof ws.createdAt !== 'number') {
      ws.createdAt = Date.now();
    }
    if (typeof ws.lastAccessedAt !== 'number') {
      ws.lastAccessedAt = Date.now();
    }
    if (typeof ws.sortOrder !== 'number') {
      ws.sortOrder = 0;
    }
  }
  // Imported workspaces are all saved (no active windows)
  for (const value of Object.values(parsed)) {
    (value as Workspace).windowId = null;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: parsed });
}
