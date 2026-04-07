import { Workspace, BackupEntry } from './types';

const STORAGE_KEY = 'workspaces';
const BACKUPS_KEY = 'backups';
const MAX_BACKUPS = 10;

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
    if (typeof ws.locked !== 'boolean') ws.locked = false;
    if (typeof ws.starred !== 'boolean') ws.starred = false;
    if (typeof ws.notes !== 'string') ws.notes = '';
  }
  // Imported workspaces are all saved (no active windows)
  for (const value of Object.values(parsed)) {
    (value as Workspace).windowId = null;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: parsed });
}

export async function getAllBackups(): Promise<BackupEntry[]> {
  const result = await chrome.storage.local.get(BACKUPS_KEY);
  return result[BACKUPS_KEY] ?? [];
}

export async function pushBackup(
  workspaces: Record<string, Workspace>,
): Promise<void> {
  const backups = await getAllBackups();
  backups.push({ timestamp: Date.now(), workspaces });
  if (backups.length > MAX_BACKUPS) {
    backups.splice(0, backups.length - MAX_BACKUPS);
  }
  await chrome.storage.local.set({ [BACKUPS_KEY]: backups });
}

export async function restoreFromBackup(timestamp: number): Promise<void> {
  const backups = await getAllBackups();
  const entry = backups.find((b) => b.timestamp === timestamp);
  if (!entry) throw new Error('Backup not found');
  const restored: Record<string, Workspace> = {};
  for (const [id, ws] of Object.entries(entry.workspaces)) {
    restored[id] = { ...ws, windowId: null };
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: restored });
}

export async function restoreSingleWorkspaceFromBackup(
  workspaceId: string,
  timestamp: number,
): Promise<void> {
  const backups = await getAllBackups();
  const entry = backups.find((b) => b.timestamp === timestamp);
  if (!entry) throw new Error('Backup not found');
  const backupWs = entry.workspaces[workspaceId];
  if (!backupWs) throw new Error('Workspace not found in backup');
  const current = await getAllWorkspaces();
  current[workspaceId] = { ...backupWs, windowId: null };
  await chrome.storage.local.set({ [STORAGE_KEY]: current });
}
