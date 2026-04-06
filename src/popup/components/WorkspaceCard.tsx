import { useState, useRef } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
  renameWorkspace,
  saveCurrentAndSwitch,
} from "../../shared/workspace-manager";
import { getDomain } from "../utils";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRefresh: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function relativeTime(ts: number | undefined): string {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function isStale(ts: number | undefined): boolean {
  if (!ts) return true;
  return Date.now() - ts > 24 * 60 * 60 * 1000;
}

const wrapperStyle = (color: string, isCurrent: boolean) => ({
  marginBottom: "4px",
  backgroundColor: "#16213e",
  borderRadius: "6px",
  border: isCurrent ? `1px solid ${color}` : "1px solid #0f3460",
  overflow: "hidden" as const,
});

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    padding: "8px 10px",
    gap: "8px",
  },
  dot: (color: string) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: "0",
  }),
  nameArea: {
    flex: "1",
    minWidth: "0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  name: {
    fontWeight: 500,
    fontSize: "13px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  nameInput: {
    fontWeight: 500,
    fontSize: "13px",
    padding: "0 4px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #0f3460",
    borderRadius: "3px",
    color: "#e0e0e0",
    outline: "none",
    maxWidth: "140px",
    flex: "1",
  },
  count: {
    fontSize: "11px",
    color: "#686880",
    flexShrink: "0",
  },
  chevron: {
    fontSize: "8px",
    color: "#686880",
    flexShrink: "0",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: "0",
  },
  currentLabel: {
    fontSize: "11px",
    color: "#8888a0",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "2px",
    padding: "4px 10px 2px",
    borderTop: "1px solid #0f3460",
    backgroundColor: "#121a30",
  },
  arrowBtn: (disabled: boolean) => ({
    fontSize: "10px",
    padding: "2px 6px",
    border: "none",
    backgroundColor: "transparent",
    color: disabled ? "#2a2a3a" : "#8888a0",
    cursor: disabled ? "default" : "pointer",
    lineHeight: "1",
  }),
  tabList: {
    backgroundColor: "#121a30",
    padding: "2px 0 4px",
  },
  tabRow: (stale: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 10px 3px 26px",
    fontSize: "11px",
    color: "#c0c0d0",
    opacity: stale ? "0.5" : "1",
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
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: "1",
    minWidth: "0",
  },
  tabMeta: {
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

function btnStyle(
  color: string,
  variant: "primary" | "danger" | "neutral",
): Record<string, string> {
  const bg = { primary: color, danger: "#DC2626", neutral: "#0f3460" };
  return {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: bg[variant],
    color: "#e0e0e0",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

const MAX_TABS = 10;

export function WorkspaceCard({
  workspace,
  isCurrent,
  isFirst,
  isLast,
  onRefresh,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = workspace.windowId !== null;

  const act = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const commitRename = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== workspace.name) {
      await renameWorkspace(workspace.id, trimmed);
      onRefresh();
    }
    setEditing(false);
  };

  const visibleTabs = workspace.tabs.slice(0, MAX_TABS);
  const hiddenCount = workspace.tabs.length - visibleTabs.length;

  return (
    <div style={wrapperStyle(workspace.color, isCurrent)}>
      <div style={styles.header}>
        <div style={styles.dot(workspace.color)} />

        <div
          style={styles.nameArea}
          onClick={() => { if (!editing) setExpanded(!expanded); }}
        >
          {editing ? (
            <input
              ref={inputRef}
              style={styles.nameInput}
              type="text"
              value={editName}
              onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditName(workspace.name); setEditing(false); }
                e.stopPropagation();
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              style={styles.name}
              onDblClick={(e) => { e.stopPropagation(); setEditName(workspace.name); setEditing(true); }}
              title="Double-click to rename"
            >
              {workspace.name}
            </span>
          )}
          <span style={styles.count}>{workspace.tabs.length}</span>
          <span style={styles.chevron}>{expanded ? "\u25BE" : "\u25B8"}</span>
        </div>

        <div style={styles.actions}>
          {isActive && isCurrent && (
            <>
              <span style={styles.currentLabel}>Current</span>
              <button
                style={btnStyle(workspace.color, "neutral")}
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try { await saveCurrentAndSwitch(workspace.id); onRefresh(); }
                  catch (err) { window.alert(err instanceof Error ? err.message : "Failed"); }
                  finally { setLoading(false); }
                }}
              >
                Save
              </button>
            </>
          )}
          {isActive && !isCurrent && (
            <>
              <button style={btnStyle(workspace.color, "primary")} disabled={loading}
                onClick={() => act(() => switchToWorkspace(workspace.id))}>Switch</button>
              <button style={btnStyle(workspace.color, "neutral")} disabled={loading}
                onClick={() => act(() => saveWorkspaceToStorage(workspace.id))}>Save</button>
            </>
          )}
          {!isActive && (
            <>
              <button style={btnStyle(workspace.color, "primary")} disabled={loading}
                onClick={() => act(() => restoreWorkspace(workspace.id))}>Restore</button>
              <button style={btnStyle(workspace.color, "danger")} disabled={loading}
                onClick={() => { if (window.confirm(`Delete "${workspace.name}"?`)) act(() => deleteWorkspace(workspace.id)); }}>Delete</button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div style={styles.toolbar}>
            <button style={styles.arrowBtn(isFirst)} disabled={isFirst}
              onClick={() => onMoveUp()}>{"\u25B2 Up"}</button>
            <button style={styles.arrowBtn(isLast)} disabled={isLast}
              onClick={() => onMoveDown()}>{"\u25BC Down"}</button>
          </div>
          {workspace.tabs.length > 0 && (
            <div style={styles.tabList}>
              {visibleTabs.map((tab) => (
                <div key={tab.url} style={styles.tabRow(isStale(tab.lastActivatedAt))}>
                  {tab.favIconUrl ? (
                    <img src={tab.favIconUrl} style={styles.tabFavicon}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={styles.tabFaviconFallback} />
                  )}
                  <span style={styles.tabTitle}>{tab.title || tab.url}</span>
                  <span style={styles.tabMeta}>
                    {getDomain(tab.url)} {relativeTime(tab.lastActivatedAt)}
                  </span>
                </div>
              ))}
              {hiddenCount > 0 && (
                <div style={styles.moreLabel}>... and {hiddenCount} more</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
