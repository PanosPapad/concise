import { useState } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
} from "../../shared/workspace-manager";
import { getDomain } from "../utils";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  onRefresh: () => void;
}

const wrapperStyle = (color: string, isCurrent: boolean) => ({
  marginBottom: "4px",
  backgroundColor: "#16213e",
  borderRadius: "6px",
  border: isCurrent ? `1px solid ${color}` : "1px solid #0f3460",
  overflow: "hidden" as const,
});

const headerStyle: Record<string, string> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px",
};

const styles = {
  left: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "0",
    flex: "1",
    cursor: "pointer",
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
  chevron: {
    fontSize: "9px",
    color: "#8888a0",
    transition: "transform 0.15s",
    flexShrink: "0",
  },
  badge: (active: boolean) => ({
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: active
      ? "rgba(5, 150, 105, 0.2)"
      : "rgba(136, 136, 160, 0.15)",
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
  tabList: {
    borderTop: "1px solid #0f3460",
    backgroundColor: "#121a30",
    padding: "4px 0",
  },
  tabRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 10px 3px 26px",
    fontSize: "11px",
    color: "#c0c0d0",
  },
  tabFavicon: {
    width: "14px",
    height: "14px",
    borderRadius: "2px",
    flexShrink: "0",
  },
  tabFaviconFallback: {
    width: "14px",
    height: "14px",
    borderRadius: "2px",
    backgroundColor: "#333",
    flexShrink: "0",
  },
  tabTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: "1",
    minWidth: "0",
  },
  tabDomain: {
    fontSize: "10px",
    color: "#686880",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
  },
  moreLabel: {
    padding: "2px 10px 4px 26px",
    fontSize: "10px",
    color: "#686880",
  },
};

function actionButtonStyle(
  color: string,
  variant: "primary" | "danger" | "neutral",
): Record<string, string> {
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

const MAX_VISIBLE_TABS = 10;

export function WorkspaceCard({ workspace, isCurrent, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  const visibleTabs = workspace.tabs.slice(0, MAX_VISIBLE_TABS);
  const hiddenCount = workspace.tabs.length - visibleTabs.length;

  return (
    <div style={wrapperStyle(workspace.color, isCurrent)}>
      <div style={headerStyle}>
        <div style={styles.left} onClick={() => setExpanded(!expanded)}>
          <div style={styles.dot(workspace.color)} />
          <span style={styles.name}>{workspace.name}</span>
          <span style={styles.tabCount}>{workspace.tabs.length} tabs</span>
          <span style={styles.chevron}>{expanded ? "\u25BE" : "\u25B8"}</span>
          <span style={styles.badge(isActive)}>
            {isActive ? "active" : "saved"}
          </span>
        </div>
        <div style={styles.right}>
          {isActive && isCurrent && (
            <>
              <span style={styles.currentLabel}>Current</span>
              <button
                style={actionButtonStyle(workspace.color, "neutral")}
                disabled={loading}
                onClick={() =>
                  handleAction(() => saveWorkspaceToStorage(workspace.id))
                }
              >
                Save
              </button>
            </>
          )}
          {isActive && !isCurrent && (
            <>
              <button
                style={actionButtonStyle(workspace.color, "primary")}
                disabled={loading}
                onClick={() =>
                  handleAction(() => switchToWorkspace(workspace.id))
                }
              >
                Switch
              </button>
              <button
                style={actionButtonStyle(workspace.color, "neutral")}
                disabled={loading}
                onClick={() =>
                  handleAction(() => saveWorkspaceToStorage(workspace.id))
                }
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
                onClick={() =>
                  handleAction(() => restoreWorkspace(workspace.id))
                }
              >
                Restore
              </button>
              <button
                style={actionButtonStyle(workspace.color, "danger")}
                disabled={loading}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete workspace "${workspace.name}"?`,
                    )
                  ) {
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

      {expanded && workspace.tabs.length > 0 && (
        <div style={styles.tabList}>
          {visibleTabs.map((tab) => (
            <div key={tab.url} style={styles.tabRow}>
              {tab.favIconUrl ? (
                <img
                  src={tab.favIconUrl}
                  style={styles.tabFavicon}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div style={styles.tabFaviconFallback} />
              )}
              <span style={styles.tabTitle}>{tab.title || tab.url}</span>
              <span style={styles.tabDomain}>{getDomain(tab.url)}</span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div style={styles.moreLabel}>
              ... and {hiddenCount} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
