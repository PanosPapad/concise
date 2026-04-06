export interface SavedTab {
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  windowId: number | null;
  tabs: SavedTab[];
  createdAt: number;
  lastAccessedAt: number;
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

export type WorkspaceColor = typeof WORKSPACE_COLORS[number];
