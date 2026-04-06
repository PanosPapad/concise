import { useState, useRef, useEffect } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
  renameWorkspace,
  reorderWorkspace,
  saveCurrentAndSwitch,
} from "../../shared/workspace-manager";
import { getDomain, relativeTime, isStale } from "../utils";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  onRefresh: () => void;
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "16px",
    marginBottom: "24px",
  },
  colorDot: (color: string) => ({
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: "0",
  }),
  nameDisplay: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#e0e0e0",
    cursor: "pointer",
    margin: "0",
    flex: "1",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  nameInput: {
    fontSize: "24px",
    fontWeight: "600",
    padding: "2px 8px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #0f3460",
    borderRadius: "6px",
    color: "#e0e0e0",
    outline: "none",
    flex: "1",
    minWidth: "0",
  },
  tabCount: {
    fontSize: "14px",
    color: "#8888a0",
    flexShrink: "0",
  },
  statusBadge: (color: string) => ({
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: color,
    padding: "4px 10px",
    borderRadius: "12px",
    border: `1px solid ${color}`,
    flexShrink: "0",
    letterSpacing: "0.5px",
  }),
  actionsRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
  },
  actionBtn: (bg: string) => ({
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: bg,
    color: "#e0e0e0",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  }),
  actionBtnDisabled: (bg: string) => ({
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: bg,
    color: "#e0e0e0",
    cursor: "not-allowed" as const,
    whiteSpace: "nowrap" as const,
    opacity: "0.5",
  }),
  reorderBtn: {
    padding: "8px 12px",
    fontSize: "11px",
    borderRadius: "6px",
    border: "1px solid #0f3460",
    backgroundColor: "transparent",
    color: "#8888a0",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  spacer: {
    flex: "1",
  },
  tabListHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: "12px",
  },
  tabListTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e0e0e0",
    margin: "0",
  },
  tabList: {
    backgroundColor: "#16213e",
    borderRadius: "8px",
    border: "1px solid #0f3460",
    overflow: "hidden" as const,
  },
  tabRow: (stale: boolean, isHovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    padding: "10px 16px",
    fontSize: "13px",
    color: "#c0c0d0",
    opacity: stale ? "0.5" : "1",
    borderBottom: "1px solid #0f3460",
    backgroundColor: isHovered ? "#1e2a4a" : "transparent",
    transition: "background-color 0.1s",
  }),
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
    flex: "1",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  pinIndicator: {
    fontSize: "10px",
    color: "#8888a0",
    flexShrink: "0",
  },
  tabDomain: {
    fontSize: "12px",
    color: "#686880",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
    minWidth: "80px",
  },
  tabTime: {
    fontSize: "11px",
    color: "#686880",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
    minWidth: "30px",
    textAlign: "right" as const,
  },
  emptyTabs: {
    padding: "24px",
    textAlign: "center" as const,
    color: "#8888a0",
    fontSize: "13px",
  },
};

function TabRow({ tab }: { tab: Workspace["tabs"][number] }) {
  const [hovered, setHovered] = useState(false);
  const stale = isStale(tab.lastActivatedAt);

  return (
    <div
      style={styles.tabRow(stale, hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
      {tab.pinned && <span style={styles.pinIndicator}>PIN</span>}
      <span style={styles.tabTitle}>{tab.title || tab.url}</span>
      <span style={styles.tabDomain}>{getDomain(tab.url)}</span>
      <span style={styles.tabTime}>{relativeTime(tab.lastActivatedAt)}</span>
    </div>
  );
}

export function WorkspaceDetail({ workspace, isCurrent, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommitting = useRef(false);

  useEffect(() => {
    setEditName(workspace.name);
    setEditing(false);
  }, [workspace.id]);

  const isActive = workspace.windowId !== null;

  const act = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const commitRename = async () => {
    if (isCommitting.current) return;
    isCommitting.current = true;
    try {
      const trimmed = editName.trim();
      if (trimmed && trimmed !== workspace.name) {
        await renameWorkspace(workspace.id, trimmed);
        onRefresh();
      }
      setEditing(false);
    } finally {
      isCommitting.current = false;
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${workspace.name}"?`)) {
      act(() => deleteWorkspace(workspace.id));
    }
  };

  const btnStyle = loading ? styles.actionBtnDisabled : styles.actionBtn;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.colorDot(workspace.color)} />
        {editing ? (
          <input
            ref={inputRef}
            style={styles.nameInput}
            type="text"
            value={editName}
            onInput={(e) =>
              setEditName((e.target as HTMLInputElement).value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditName(workspace.name);
                setEditing(false);
              }
            }}
            onBlur={commitRename}
            autoFocus
          />
        ) : (
          <h2
            style={styles.nameDisplay}
            onDblClick={() => {
              setEditName(workspace.name);
              setEditing(true);
            }}
            title="Double-click to rename"
          >
            {workspace.name}
          </h2>
        )}
        <span style={styles.tabCount}>
          {workspace.tabs.length} tab{workspace.tabs.length !== 1 ? "s" : ""}
        </span>
        {isCurrent ? (
          <span style={styles.statusBadge(workspace.color)}>Current</span>
        ) : isActive ? (
          <span style={styles.statusBadge("#059669")}>Active</span>
        ) : (
          <span style={styles.statusBadge("#8888a0")}>Saved</span>
        )}
      </div>

      <div style={styles.actionsRow}>
        {isActive && isCurrent && (
          <button
            style={btnStyle("#0f3460")}
            disabled={loading}
            onClick={() => act(() => saveCurrentAndSwitch(workspace.id))}
          >
            Save & Switch
          </button>
        )}
        {isActive && !isCurrent && (
          <>
            <button
              style={btnStyle(workspace.color)}
              disabled={loading}
              onClick={() => act(() => switchToWorkspace(workspace.id))}
            >
              Switch
            </button>
            <button
              style={btnStyle("#0f3460")}
              disabled={loading}
              onClick={() =>
                act(() => saveWorkspaceToStorage(workspace.id))
              }
            >
              Save
            </button>
          </>
        )}
        {!isActive && (
          <>
            <button
              style={btnStyle(workspace.color)}
              disabled={loading}
              onClick={() => act(() => restoreWorkspace(workspace.id))}
            >
              Restore
            </button>
            <button
              style={btnStyle("#DC2626")}
              disabled={loading}
              onClick={handleDelete}
            >
              Delete
            </button>
          </>
        )}

        <div style={styles.spacer} />

        <button
          style={styles.reorderBtn}
          onClick={() => act(() => reorderWorkspace(workspace.id, "up"))}
          disabled={loading}
        >
          Move Up
        </button>
        <button
          style={styles.reorderBtn}
          onClick={() => act(() => reorderWorkspace(workspace.id, "down"))}
          disabled={loading}
        >
          Move Down
        </button>
      </div>

      <div style={styles.tabListHeader}>
        <h3 style={styles.tabListTitle}>Tabs</h3>
      </div>

      <div style={styles.tabList}>
        {workspace.tabs.length === 0 ? (
          <div style={styles.emptyTabs}>No tabs in this workspace</div>
        ) : (
          workspace.tabs.map((tab, i) => (
            <TabRow key={`${tab.url}-${i}`} tab={tab} />
          ))
        )}
      </div>
    </div>
  );
}
