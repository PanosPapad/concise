export interface SavedTab {
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  lastActivatedAt?: number;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  windowId: number | null;
  tabs: SavedTab[];
  createdAt: number;
  lastAccessedAt: number;
  sortOrder: number;
  locked?: boolean;
  starred?: boolean;
  notes?: string;
}

export interface UntrackedWindow {
  windowId: number;
  tabs: SavedTab[];
}

export interface BackupEntry {
  timestamp: number;
  workspaces: Record<string, Workspace>;
}

export const WORKSPACE_COLORS = [
  '#4F46E5', // indigo
  '#059669', // emerald
  '#D97706', // amber
  '#DC2626', // red
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#EA580C', // orange
  '#DB2777', // pink
] as const;

export const NEW_WORKSPACE_COLORS = WORKSPACE_COLORS.filter(c => c !== '#DC2626');

export type WorkspaceColor = typeof WORKSPACE_COLORS[number];
