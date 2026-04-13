import { Workspace, BackupEntry } from './types';

const STORAGE_KEY = 'workspaces';
const BACKUPS_KEY = 'backups';

// ---------------------------------------------------------------------------
// Safe Storage Wrappers
// ---------------------------------------------------------------------------

export class StorageError extends Error {
  constructor(operation: string, cause?: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Storage ${operation} failed: ${msg}`);
    this.name = 'StorageError';
  }
}

async function safeSet(data: Record<string, unknown>): Promise<void> {
  try {
    await chrome.storage.local.set(data);
  } catch (err) {
    throw new StorageError('write', err);
  }
}

async function safeGet(keys: string | string[]): Promise<Record<string, unknown>> {
  try {
    return await chrome.storage.local.get(keys);
  } catch (err) {
    throw new StorageError('read', err);
  }
}

export async function broadcastStorageError(message: string): Promise<void> {
  try {
    await chrome.storage.local.set({
      _lastStorageError: { message, timestamp: Date.now() },
    });
  } catch {
    console.error('[Concise] Critical: cannot persist error notification', message);
  }
}

// ---------------------------------------------------------------------------
// Write Lock
// ---------------------------------------------------------------------------

let _writeLock: Promise<void> = Promise.resolve();

export async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const previous = _writeLock;
  _writeLock = gate;
  await previous;
  try {
    return await fn();
  } finally {
    release!();
  }
}

// ---------------------------------------------------------------------------
// Storage Quota Monitoring
// ---------------------------------------------------------------------------

export interface StorageUsage {
  bytesUsed: number;
  bytesTotal: number;
  percentUsed: number;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const bytesUsed = await chrome.storage.local.getBytesInUse(null);
  const bytesTotal = 10_485_760;
  return { bytesUsed, bytesTotal, percentUsed: Math.round((bytesUsed / bytesTotal) * 100) };
}

// ---------------------------------------------------------------------------
// Startup Integrity Check
// ---------------------------------------------------------------------------

export interface IntegrityReport {
  valid: boolean;
  workspaceCount: number;
  repaired: string[];
  errors: string[];
}

function normalizeWorkspaceFields(ws: Record<string, unknown>): void {
  if (!Array.isArray(ws.tabs)) ws.tabs = [];
  if (typeof ws.color !== 'string') ws.color = '#6366f1';
  if (typeof ws.createdAt !== 'number') ws.createdAt = Date.now();
  if (typeof ws.lastAccessedAt !== 'number') ws.lastAccessedAt = Date.now();
  if (typeof ws.sortOrder !== 'number') ws.sortOrder = 0;
  if (typeof ws.locked !== 'boolean') ws.locked = false;
  if (typeof ws.starred !== 'boolean') ws.starred = false;
  if (typeof ws.notes !== 'string') ws.notes = '';
}

export async function validateAndRepairStorage(): Promise<IntegrityReport> {
  const report: IntegrityReport = { valid: true, workspaceCount: 0, repaired: [], errors: [] };
  try {
    const result = await safeGet(STORAGE_KEY);
    const raw = result[STORAGE_KEY];
    if (raw === undefined || raw === null) return report;

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      report.valid = false;
      report.errors.push('Workspace data is not an object; backing up and resetting');
      await safeSet({ _corruptedWorkspaces: raw });
      await safeSet({ [STORAGE_KEY]: {} });
      return report;
    }

    const workspaces = raw as Record<string, unknown>;
    const repaired: Record<string, Workspace> = {};

    for (const [id, value] of Object.entries(workspaces)) {
      const ws = value as Record<string, unknown>;
      if (typeof ws.id !== 'string' || typeof ws.name !== 'string') {
        report.repaired.push(`Removed invalid workspace entry: ${id}`);
        continue;
      }
      if (!Array.isArray(ws.tabs)) { report.repaired.push(`Repaired missing tabs for "${ws.name}"`); }
      normalizeWorkspaceFields(ws);
      ws.tabs = (ws.tabs as Array<Record<string, unknown>>).filter(tab =>
        typeof tab.url === 'string' && (tab.url as string).length > 0
      );
      ws.windowId = null; // Clear stale window associations
      repaired[id] = ws as unknown as Workspace;
    }

    report.workspaceCount = Object.keys(repaired).length;
    if (report.repaired.length > 0) {
      report.valid = false;
      await safeSet({ [STORAGE_KEY]: repaired });
    }
  } catch (err) {
    report.valid = false;
    report.errors.push(`Integrity check failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return report;
}

// ---------------------------------------------------------------------------
// Tiered Backup Retention
// ---------------------------------------------------------------------------

const BACKUP_TIERS = {
  RECENT_HOURS: 6,
  MEDIUM_HOURS: 48,
  MEDIUM_BLOCK_HOURS: 6,
  LONG_DAYS: 7,
};

function keepOnePerBlock(entries: BackupEntry[], blockMs: number): BackupEntry[] {
  const blocks = new Map<number, BackupEntry>();
  for (const entry of entries) {
    const key = Math.floor(entry.timestamp / blockMs);
    const existing = blocks.get(key);
    if (!existing || entry.timestamp > existing.timestamp) blocks.set(key, entry);
  }
  return Array.from(blocks.values());
}

function pruneBackups(backups: BackupEntry[]): BackupEntry[] {
  const now = Date.now();
  const recentCutoff = now - BACKUP_TIERS.RECENT_HOURS * 3_600_000;
  const mediumCutoff = now - BACKUP_TIERS.MEDIUM_HOURS * 3_600_000;
  const longCutoff = now - BACKUP_TIERS.LONG_DAYS * 86_400_000;

  const recent = backups.filter(b => b.timestamp >= recentCutoff);
  const medium = keepOnePerBlock(
    backups.filter(b => b.timestamp < recentCutoff && b.timestamp >= mediumCutoff),
    BACKUP_TIERS.MEDIUM_BLOCK_HOURS * 3_600_000
  );
  const long = keepOnePerBlock(
    backups.filter(b => b.timestamp < mediumCutoff && b.timestamp >= longCutoff),
    86_400_000
  );

  return [...long, ...medium, ...recent].sort((a, b) => a.timestamp - b.timestamp);
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export async function getAllWorkspaces(): Promise<Record<string, Workspace>> {
  const result = await safeGet(STORAGE_KEY);
  return (result[STORAGE_KEY] as Record<string, Workspace>) ?? {};
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const workspaces = await getAllWorkspaces();
  return workspaces[id] ?? null;
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  return withWriteLock(async () => {
    const workspaces = await getAllWorkspaces();
    workspaces[workspace.id] = workspace;
    await safeSet({ [STORAGE_KEY]: workspaces });
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  return withWriteLock(async () => {
    const workspaces = await getAllWorkspaces();
    delete workspaces[id];
    await safeSet({ [STORAGE_KEY]: workspaces });
  });
}

export async function saveAllWorkspaces(
  workspaces: Record<string, Workspace>,
): Promise<void> {
  await safeSet({ [STORAGE_KEY]: workspaces });
}

export async function exportData(): Promise<string> {
  const workspaces = await getAllWorkspaces();
  return JSON.stringify(workspaces, null, 2);
}

export async function getPreferences(): Promise<{ groupByDomain: boolean }> {
  const defaults = { groupByDomain: false };
  const result = await safeGet('preferences');
  const prefs = result.preferences;
  if (!prefs || typeof prefs !== 'object') return defaults;
  const p = prefs as Record<string, unknown>;
  return {
    groupByDomain: typeof p.groupByDomain === 'boolean'
      ? p.groupByDomain
      : defaults.groupByDomain,
  };
}

export async function setPreferences(prefs: { groupByDomain: boolean }): Promise<void> {
  await safeSet({ preferences: prefs });
}

export async function importData(json: string): Promise<void> {
  return withWriteLock(async () => {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid backup format');
    }
    for (const value of Object.values(parsed)) {
      const ws = value as Record<string, unknown>;
      if (typeof ws.id !== 'string' || typeof ws.name !== 'string') {
        throw new Error('Invalid workspace data in backup');
      }
      normalizeWorkspaceFields(ws);
    }
    // Imported workspaces are all saved (no active windows)
    for (const value of Object.values(parsed)) {
      (value as Workspace).windowId = null;
    }
    await safeSet({ [STORAGE_KEY]: parsed });
  });
}

// ---------------------------------------------------------------------------
// Backups
// ---------------------------------------------------------------------------

export async function getAllBackups(): Promise<BackupEntry[]> {
  const result = await safeGet(BACKUPS_KEY);
  return (result[BACKUPS_KEY] as BackupEntry[]) ?? [];
}

export async function pushBackup(
  workspaces: Record<string, Workspace>,
): Promise<void> {
  return withWriteLock(async () => {
    const backups = await getAllBackups();
    backups.push({ timestamp: Date.now(), workspaces });
    const pruned = pruneBackups(backups);
    await safeSet({ [BACKUPS_KEY]: pruned });
  });
}

export async function restoreFromBackup(timestamp: number): Promise<void> {
  return withWriteLock(async () => {
    const backups = await getAllBackups();
    const entry = backups.find((b) => b.timestamp === timestamp);
    if (!entry) throw new Error('Backup not found');
    const restored: Record<string, Workspace> = {};
    for (const [id, ws] of Object.entries(entry.workspaces)) {
      restored[id] = { ...ws, windowId: null };
    }
    await safeSet({ [STORAGE_KEY]: restored });
  });
}

export async function restoreSingleWorkspaceFromBackup(
  workspaceId: string,
  timestamp: number,
): Promise<void> {
  return withWriteLock(async () => {
    const backups = await getAllBackups();
    const entry = backups.find((b) => b.timestamp === timestamp);
    if (!entry) throw new Error('Backup not found');
    const backupWs = entry.workspaces[workspaceId];
    if (!backupWs) throw new Error('Workspace not found in backup');
    const current = await getAllWorkspaces();
    current[workspaceId] = { ...backupWs, windowId: null };
    await safeSet({ [STORAGE_KEY]: current });
  });
}

// ---------------------------------------------------------------------------
// Bookmarks HTML Export
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function exportAsBookmarksHtml(): Promise<string> {
  const workspaces = await getAllWorkspaces();
  const entries = Object.values(workspaces);

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>Concise Workspaces</H3>
    <DL><p>\n`;

  for (const ws of entries) {
    const addDate = Math.floor(ws.createdAt / 1000);
    html += `        <DT><H3 ADD_DATE="${addDate}">${escapeHtml(ws.name)}</H3>\n`;
    html += `        <DL><p>\n`;
    for (const tab of ws.tabs) {
      const tabDate = Math.floor((tab.lastActivatedAt ?? ws.lastAccessedAt) / 1000);
      html += `            <DT><A HREF="${escapeHtml(tab.url)}" ADD_DATE="${tabDate}">${escapeHtml(tab.title || tab.url)}</A>\n`;
    }
    html += `        </DL><p>\n`;
  }

  html += `    </DL><p>\n</DL><p>`;
  return html;
}
