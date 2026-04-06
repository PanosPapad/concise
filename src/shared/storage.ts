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
