import { Workspace } from "../../shared/types";
import { WorkspaceCard } from "./WorkspaceCard";

interface Props {
  workspaces: Workspace[];
  currentWindowId: number | null;
  onRefresh: () => void;
}

const styles = {
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    color: "#8888a0",
    letterSpacing: "0.5px",
    margin: "12px 0 6px",
  },
  emptyMessage: {
    fontSize: "11px",
    color: "#555570",
    padding: "8px 0",
  },
};

export function WorkspaceList({ workspaces, currentWindowId, onRefresh }: Props) {
  const active = workspaces.filter((w) => w.windowId !== null);
  const saved = workspaces.filter((w) => w.windowId === null);

  return (
    <div>
      <div style={styles.sectionLabel}>Active</div>
      {active.length === 0 ? (
        <div style={styles.emptyMessage}>No active workspaces</div>
      ) : (
        active.map((w) => (
          <WorkspaceCard
            key={w.id}
            workspace={w}
            isCurrent={w.windowId === currentWindowId}
            onRefresh={onRefresh}
          />
        ))
      )}

      <div style={styles.sectionLabel}>Saved</div>
      {saved.length === 0 ? (
        <div style={styles.emptyMessage}>No saved workspaces</div>
      ) : (
        saved.map((w) => (
          <WorkspaceCard
            key={w.id}
            workspace={w}
            isCurrent={false}
            onRefresh={onRefresh}
          />
        ))
      )}
    </div>
  );
}
