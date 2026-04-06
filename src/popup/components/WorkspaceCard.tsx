import { useState } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
} from "../../shared/workspace-manager";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  onRefresh: () => void;
}

function cardStyle(color: string, isCurrent: boolean): Record<string, string> {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    marginBottom: "4px",
    backgroundColor: "#16213e",
    borderRadius: "6px",
    border: isCurrent ? `1px solid ${color}` : "1px solid #0f3460",
  };
}

const styles = {
  left: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "0",
    flex: "1",
  },
  dot: (color: string) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: "0",
  }),
  name: {
    fontWeight: 500,
    fontSize: "13px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tabCount: {
    fontSize: "11px",
    color: "#8888a0",
    whiteSpace: "nowrap" as const,
  },
  badge: (active: boolean) => ({
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: active ? "rgba(5, 150, 105, 0.2)" : "rgba(136, 136, 160, 0.15)",
    color: active ? "#34d399" : "#8888a0",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
  }),
  right: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: "0",
    marginLeft: "8px",
  },
  currentLabel: {
    fontSize: "11px",
    color: "#8888a0",
  },
};

function actionButtonStyle(color: string, variant: "primary" | "danger" | "neutral"): Record<string, string> {
  const bgMap = {
    primary: color,
    danger: "#DC2626",
    neutral: "#0f3460",
  };
  return {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: bgMap[variant],
    color: "#e0e0e0",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export function WorkspaceCard({ workspace, isCurrent, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const isActive = workspace.windowId !== null;

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle(workspace.color, isCurrent)}>
      <div style={styles.left}>
        <div style={styles.dot(workspace.color)} />
        <span style={styles.name}>{workspace.name}</span>
        <span style={styles.tabCount}>{workspace.tabs.length} tabs</span>
        <span style={styles.badge(isActive)}>{isActive ? "active" : "saved"}</span>
      </div>
      <div style={styles.right}>
        {isActive && isCurrent && (
          <span style={styles.currentLabel}>Current</span>
        )}
        {isActive && !isCurrent && (
          <>
            <button
              style={actionButtonStyle(workspace.color, "primary")}
              disabled={loading}
              onClick={() => handleAction(() => switchToWorkspace(workspace.id))}
            >
              Switch
            </button>
            <button
              style={actionButtonStyle(workspace.color, "neutral")}
              disabled={loading}
              onClick={() => handleAction(() => saveWorkspaceToStorage(workspace.id))}
            >
              Save
            </button>
          </>
        )}
        {!isActive && (
          <>
            <button
              style={actionButtonStyle(workspace.color, "primary")}
              disabled={loading}
              onClick={() => handleAction(() => restoreWorkspace(workspace.id))}
            >
              Restore
            </button>
            <button
              style={actionButtonStyle(workspace.color, "danger")}
              disabled={loading}
              onClick={() => {
                if (window.confirm(`Delete workspace "${workspace.name}"?`)) {
                  handleAction(() => deleteWorkspace(workspace.id));
                }
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
