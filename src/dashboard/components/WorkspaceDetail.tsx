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
  toggleLock,
  toggleStar,
  updateWorkspaceNotes,
} from "../../shared/workspace-manager";
import { TabRow } from "./TabRow";

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
    fontSize: "22px",
    fontWeight: "600",
    color: "#eaeaf5",
    cursor: "pointer",
    margin: "0",
    flex: "1",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  nameInput: {
    fontSize: "22px",
    fontWeight: "600",
    padding: "2px 8px",
    backgroundColor: "#0f0f1a",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    color: "#eaeaf5",
    outline: "none",
    flex: "1",
    minWidth: "0",
  },
  tabCount: {
    fontSize: "14px",
    color: "#6b6b88",
    flexShrink: "0",
  },
  statusBadge: (color: string) => ({
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: color,
    padding: "4px 10px",
    borderRadius: "12px",
    border: `1px solid ${color}`,
    flexShrink: "0",
    letterSpacing: "0.8px",
  }),
  actionsRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
  },
  toggleBtn: (active: boolean, activeColor: string) => ({
    padding: "6px 12px",
    fontSize: "14px",
    borderRadius: "8px",
    border: active ? `1px solid ${activeColor}` : "1px solid #1e2a50",
    backgroundColor: "transparent",
    color: active ? activeColor : "#6b6b88",
    cursor: "pointer",
    flexShrink: "0",
  }),
  actionBtn: (bg: string) => ({
    padding: "9px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    border: "none",
    backgroundColor: bg,
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  }),
  actionBtnDisabled: (bg: string) => ({
    padding: "9px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    border: "none",
    backgroundColor: bg,
    color: "#eaeaf5",
    cursor: "not-allowed" as const,
    whiteSpace: "nowrap" as const,
    opacity: "0.5",
  }),
  reorderBtn: {
    padding: "8px 12px",
    fontSize: "11px",
    borderRadius: "8px",
    border: "1px solid #1e2a50",
    backgroundColor: "transparent",
    color: "#6b6b88",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  notesSection: {
    marginBottom: "24px",
  },
  notesLabel: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "1px",
    marginBottom: "8px",
    display: "block" as const,
  },
  notesTextarea: {
    width: "100%",
    minHeight: "80px",
    padding: "10px 14px",
    fontSize: "13px",
    backgroundColor: "#0f0f1a",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    color: "#eaeaf5",
    outline: "none",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
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
    color: "#eaeaf5",
    margin: "0",
  },
  tabList: {
    backgroundColor: "#13132a",
    borderRadius: "10px",
    border: "1px solid #1e2a50",
    overflow: "hidden" as const,
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
  },
  emptyTabs: {
    padding: "24px",
    textAlign: "center" as const,
    color: "#6b6b88",
    fontSize: "13px",
  },
};

export function WorkspaceDetail({ workspace, isCurrent, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommitting = useRef(false);
  const [notesValue, setNotesValue] = useState(workspace.notes ?? "");
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEditName(workspace.name);
    setEditing(false);
  }, [workspace.id]);

  useEffect(() => {
    setNotesValue(workspace.notes ?? "");
  }, [workspace.id, workspace.notes]);

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
        notesDebounceRef.current = null;
      }
    };
  }, []);

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

  const saveNotes = (value: string) => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      updateWorkspaceNotes(workspace.id, value).catch(console.error);
    }, 600);
  };

  const flushNotes = () => {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = null;
    }
    updateWorkspaceNotes(workspace.id, notesValue).catch(console.error);
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
          <span style={styles.statusBadge("#6b6b88")}>Saved</span>
        )}
        <button
          style={styles.toggleBtn(!!workspace.starred, "#D97706")}
          onClick={() => act(() => toggleStar(workspace.id))}
          title={workspace.starred ? "Unstar" : "Star"}
        >
          ★
        </button>
        <button
          style={styles.toggleBtn(!!workspace.locked, "#4F46E5")}
          onClick={() => act(() => toggleLock(workspace.id))}
          title={workspace.locked ? "Unlock" : "Lock"}
        >
          {workspace.locked ? "🔒" : "🔓"}
        </button>
      </div>

      <div style={styles.actionsRow}>
        {isActive && isCurrent && (
          <button
            style={btnStyle("#1e2a50")}
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
              style={btnStyle("#1e2a50")}
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
            {!workspace.locked && (
              <button
                style={btnStyle("#DC2626")}
                disabled={loading}
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
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

      <div style={styles.notesSection}>
        <span style={styles.notesLabel}>Notes</span>
        <textarea
          style={styles.notesTextarea}
          placeholder="Add context for this workspace..."
          value={notesValue}
          onInput={(e) => {
            const val = (e.target as HTMLTextAreaElement).value;
            setNotesValue(val);
            saveNotes(val);
          }}
          onBlur={flushNotes}
        />
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
