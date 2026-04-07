import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { Workspace, SavedTab } from "../../shared/types";
import {
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
  renameWorkspace,
  saveCurrentAndSwitch,
  removeTabFromWorkspace,
  moveTabBetweenWorkspaces,
} from "../../shared/workspace-manager";
import { getPreferences, setPreferences } from "../../shared/storage";
import { groupTabsByDomain } from "../utils";
import { ConfirmBar } from "./ConfirmBar";
import { TabRow } from "./TabRow";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { EmptyState } from "./EmptyState";

interface Props {
  workspace: Workspace;
  allWorkspaces: Workspace[];
  isCurrent: boolean;
  onRefresh: () => void;
  triggerRename?: boolean;
  onRenameHandled?: () => void;
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
  nameArea: (hovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "6px",
    flex: "1",
    minWidth: "0",
    cursor: "pointer",
    borderBottom: hovered ? "1px dashed #50506a" : "1px dashed transparent",
  }),
  nameDisplay: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#eaeaf5",
    cursor: "pointer",
    margin: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  pencilIcon: (visible: boolean, hovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    flexShrink: "0",
    color: hovered ? "#eaeaf5" : "#50506a",
    opacity: visible ? "1" : "0",
    transition: "opacity 0.15s ease, color 0.15s ease",
    cursor: "pointer",
  }),
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

export function WorkspaceDetail({ workspace, allWorkspaces, isCurrent, onRefresh, triggerRename, onRenameHandled }: Props) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "save-close">(null);
  const [nameHovered, setNameHovered] = useState(false);
  const [pencilHovered, setPencilHovered] = useState(false);
  const [groupByDomain, setGroupByDomain] = useState(false);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tab: SavedTab } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommitting = useRef(false);

  useEffect(() => {
    getPreferences().then((prefs) => setGroupByDomain(prefs.groupByDomain));
  }, []);

  useEffect(() => {
    setEditName(workspace.name);
    setEditing(false);
    setConfirmAction(null);
    setCollapsedDomains(new Set());
  }, [workspace.id]);

  useEffect(() => {
    if (triggerRename) {
      enterEditMode();
      if (onRenameHandled) onRenameHandled();
    }
  }, [triggerRename]);

  const isActive = workspace.windowId !== null;

  const moveTargets = allWorkspaces.filter((ws) => ws.id !== workspace.id);

  const handleGoToTab = async (tab: SavedTab) => {
    if (workspace.windowId === null) return;
    try {
      const liveTabs = await chrome.tabs.query({ windowId: workspace.windowId });
      const match = liveTabs.find((t) => t.url === tab.url);
      if (match?.id !== undefined) {
        await chrome.tabs.update(match.id, { active: true });
        await chrome.windows.update(workspace.windowId!, { focused: true });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to navigate to tab");
    }
  };

  const handleCloseTab = async (tab: SavedTab) => {
    try {
      await removeTabFromWorkspace(workspace.id, tab.url);
      onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to remove tab");
    }
  };

  const handleMoveTab = async (tab: SavedTab, targetWorkspaceId: string) => {
    try {
      await moveTabBetweenWorkspaces(workspace.id, targetWorkspaceId, tab.url);
      onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to move tab");
    }
  };

  const handleTabContextMenu = (e: MouseEvent, tab: SavedTab) => {
    setTabContextMenu({ x: e.clientX, y: e.clientY, tab });
  };

  const getTabContextMenuItems = (): ContextMenuItem[] => {
    if (!tabContextMenu) return [];
    const tab = tabContextMenu.tab;
    const items: ContextMenuItem[] = [];

    if (isActive) {
      items.push({ label: "Go to Tab", onClick: () => handleGoToTab(tab) });
      items.push({ label: "Close Tab", onClick: () => handleCloseTab(tab) });
      items.push({
        label: "Copy URL",
        onClick: () => { navigator.clipboard.writeText(tab.url); },
        divider: true,
      });
    } else {
      items.push({
        label: "Remove from Workspace",
        onClick: () => handleCloseTab(tab),
      });
      items.push({
        label: "Copy URL",
        onClick: () => { navigator.clipboard.writeText(tab.url); },
      });
    }

    if (moveTargets.length > 0) {
      items.push({
        label: "Move to:",
        onClick: () => {},
        disabled: true,
        divider: true,
      });
      for (const target of moveTargets) {
        items.push({
          label: target.name,
          onClick: () => handleMoveTab(tab, target.id),
        });
      }
    }

    return items;
  };

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
    setConfirmAction("delete");
  };

  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmAction === "delete") {
      act(() => deleteWorkspace(workspace.id));
    }
    setConfirmAction(null);
  }, [confirmAction, workspace.id]);

  const enterEditMode = () => {
    setEditName(workspace.name);
    setEditing(true);
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
          <div
            style={styles.nameArea(nameHovered)}
            onMouseEnter={() => setNameHovered(true)}
            onMouseLeave={() => { setNameHovered(false); setPencilHovered(false); }}
            onDblClick={enterEditMode}
            title="Double-click to rename"
          >
            <h2 style={styles.nameDisplay}>
              {workspace.name}
            </h2>
            <span
              style={styles.pencilIcon(nameHovered, pencilHovered)}
              onMouseEnter={() => setPencilHovered(true)}
              onMouseLeave={() => setPencilHovered(false)}
              onClick={(e) => { e.stopPropagation(); enterEditMode(); }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
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
      </div>

      {confirmAction ? (
        <div style={{ marginBottom: "24px" }}>
          <ConfirmBar
            message={
              confirmAction === "delete"
                ? "Delete this workspace?"
                : "Save and close this window?"
            }
            confirmLabel={confirmAction === "delete" ? "Delete" : "Save & Close"}
            confirmColor={confirmAction === "delete" ? "#DC2626" : "#D97706"}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelConfirm}
          />
        </div>
      ) : (
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
              <button
                style={btnStyle("#DC2626")}
                disabled={loading}
                onClick={handleDelete}
              >
                Delete
              </button>
            </>
          )}

        </div>
      )}

      <div style={styles.tabListHeader}>
        <h3 style={styles.tabListTitle}>Tabs</h3>
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <button
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: !groupByDomain ? "#1e2a50" : "transparent",
              color: !groupByDomain ? "#eaeaf5" : "#6b6b88",
              cursor: "pointer",
            }}
            onClick={() => {
              setGroupByDomain(false);
              setPreferences({ groupByDomain: false });
            }}
          >
            Flat
          </button>
          <button
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: groupByDomain ? "#1e2a50" : "transparent",
              color: groupByDomain ? "#eaeaf5" : "#6b6b88",
              cursor: "pointer",
            }}
            onClick={() => {
              setGroupByDomain(true);
              setPreferences({ groupByDomain: true });
            }}
          >
            Grouped
          </button>
        </div>
      </div>

      <div style={styles.tabList}>
        {workspace.tabs.length === 0 ? (
          <EmptyState variant="no-tabs" isActive={isActive} />
        ) : groupByDomain ? (
          groupTabsByDomain(workspace.tabs).map((group) => {
            const isCollapsed = collapsedDomains.has(group.domain);
            const isSingleTab = group.tabs.length === 1;
            const isPinned = group.domain === "Pinned";
            return (
              <div key={group.domain}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #1e2a50",
                    backgroundColor: "#0f0f1a",
                    userSelect: "none" as const,
                  }}
                  onClick={() => {
                    setCollapsedDomains((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.domain)) {
                        next.delete(group.domain);
                      } else {
                        next.add(group.domain);
                      }
                      return next;
                    });
                  }}
                >
                  {isPinned ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: "0" }}>
                      <path d="M7 1L11 5L7.5 8.5L5 11L4 7L1 4L4 5L7 1Z" stroke="#c0c0d0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  ) : null}
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: isSingleTab && !isPinned ? "#6b6b88" : "#c0c0d0",
                    flex: "1",
                    minWidth: "0",
                    overflow: "hidden" as const,
                    textOverflow: "ellipsis" as const,
                    whiteSpace: "nowrap" as const,
                  }}>
                    {isPinned ? "Pinned" : group.domain}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#6b6b88",
                    backgroundColor: "#1e2a50",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    flexShrink: "0",
                  }}>
                    {group.tabs.length}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      flexShrink: "0",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="#6b6b88" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {!isCollapsed && group.tabs.map((tab, i) => (
                  <TabRow
                    key={`${group.domain}-${tab.url}-${i}`}
                    tab={tab}
                    isActive={isActive}
                    onGoToTab={isActive ? handleGoToTab : undefined}
                    onCloseTab={handleCloseTab}
                    onMoveTab={handleMoveTab}
                    onContextMenu={handleTabContextMenu}
                    moveTargets={moveTargets}
                    showStaleLabel={true}
                    extraPaddingLeft={12}
                  />
                ))}
              </div>
            );
          })
        ) : (
          workspace.tabs.map((tab, i) => (
            <TabRow
              key={`${tab.url}-${i}`}
              tab={tab}
              isActive={isActive}
              onGoToTab={isActive ? handleGoToTab : undefined}
              onCloseTab={handleCloseTab}
              onMoveTab={handleMoveTab}
              onContextMenu={handleTabContextMenu}
              moveTargets={moveTargets}
              showStaleLabel={true}
            />
          ))
        )}
      </div>

      {tabContextMenu && (
        <ContextMenu
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          items={getTabContextMenuItems()}
          onClose={() => setTabContextMenu(null)}
        />
      )}
    </div>
  );
}
