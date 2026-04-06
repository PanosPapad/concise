import { useState } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../../shared/types";
import { reorderWorkspace } from "../../shared/workspace-manager";
import { WorkspaceCard } from "./WorkspaceCard";
import { UntrackedWindowCard } from "./UntrackedWindow";

interface Props {
  workspaces: Workspace[];
  untrackedWindows: UntrackedWindow[];
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyMessage: {
    fontSize: "11px",
    color: "#555570",
    padding: "8px 0",
  },
  toggleBtn: {
    fontSize: "10px",
    color: "#686880",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
  },
};

export function WorkspaceList({
  workspaces,
  untrackedWindows,
  currentWindowId,
  onRefresh,
}: Props) {
  const [untrackedCollapsed, setUntrackedCollapsed] = useState(true);
  const active = workspaces.filter((w) => w.windowId !== null);
  const saved = workspaces.filter((w) => w.windowId === null);

  const handleMove = async (id: string, direction: "up" | "down") => {
    await reorderWorkspace(id, direction);
    onRefresh();
  };

  return (
    <div>
      <div style={styles.sectionLabel}>Active</div>
      {active.length === 0 ? (
        <div style={styles.emptyMessage}>No active workspaces</div>
      ) : (
        active.map((w, i) => (
          <WorkspaceCard
            key={w.id}
            workspace={w}
            isCurrent={w.windowId === currentWindowId}
            isFirst={i === 0}
            isLast={i === active.length - 1}
            onRefresh={onRefresh}
            onMoveUp={() => handleMove(w.id, "up")}
            onMoveDown={() => handleMove(w.id, "down")}
          />
        ))
      )}

      <div style={styles.sectionLabel}>Saved</div>
      {saved.length === 0 ? (
        <div style={styles.emptyMessage}>No saved workspaces</div>
      ) : (
        saved.map((w, i) => (
          <WorkspaceCard
            key={w.id}
            workspace={w}
            isCurrent={false}
            isFirst={i === 0}
            isLast={i === saved.length - 1}
            onRefresh={onRefresh}
            onMoveUp={() => handleMove(w.id, "up")}
            onMoveDown={() => handleMove(w.id, "down")}
          />
        ))
      )}

      {untrackedWindows.length > 0 && (
        <>
          <div style={styles.sectionLabel}>
            <span>Untracked ({untrackedWindows.length})</span>
            <button
              style={styles.toggleBtn}
              onClick={() => setUntrackedCollapsed(!untrackedCollapsed)}
            >
              {untrackedCollapsed ? "Show" : "Hide"}
            </button>
          </div>
          {!untrackedCollapsed &&
            untrackedWindows.map((win) => (
              <UntrackedWindowCard
                key={win.windowId}
                window={win}
                onAssigned={onRefresh}
              />
            ))}
        </>
      )}
    </div>
  );
}
