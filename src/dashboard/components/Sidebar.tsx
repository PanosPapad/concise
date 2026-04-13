import { useState } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../../shared/types";
import { SidebarWorkspaceItem } from "./SidebarWorkspaceItem";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { MassActionBar } from "./MassActionBar";
import { reorderWorkspaceTo } from "../../shared/workspace-manager";

interface Props {
  workspaces: Workspace[];
  untrackedWindows: UntrackedWindow[];
  currentWindowId: number | null;
  selectedId: string | null;
  selectedUntrackedId: number | null;
  onSelect: (id: string) => void;
  onSelectUntracked: (windowId: number) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onSwitchWorkspace: (id: string) => void;
  onSaveWorkspace: (id: string) => void;
  onRestoreWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string) => void;
  onShowHistory: () => void;
  onShowHelp: () => void;
  // Selection mode
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelectionMode: () => void;
  onToggleSelected: (id: string) => void;
  // Mass actions
  onMassSave: () => void;
  onMassRestore: () => void;
  onMassDelete: () => void;
  onMassLock: () => void;
  onMassUnlock: () => void;
  onMassStar: () => void;
  storagePercent?: number;
  onExportBookmarks?: () => void;
}

const styles = {
  sidebar: {
    width: "280px",
    minWidth: "280px",
    height: "100vh",
    backgroundColor: "#13132a",
    borderRight: "1px solid #1e2a50",
    display: "flex" as const,
    flexDirection: "column" as const,
    overflow: "hidden" as const,
  },
  header: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid #1e2a50",
    flexShrink: "0",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerLeft: {
    flex: "1",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "800",
    margin: "0",
    color: "#eaeaf5",
    letterSpacing: "-0.5px",
  },
  version: {
    fontSize: "11px",
    color: "#6b6b88",
    marginTop: "2px",
  },
  selectionToggle: (active: boolean) => ({
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: active ? "1px solid #4F46E5" : "1px solid #1e2a50",
    backgroundColor: active ? "#4F46E520" : "transparent",
    color: active ? "#a5b4fc" : "#6b6b88",
    cursor: "pointer",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: "13px",
    flexShrink: "0",
    transition: "all 0.15s",
  }),
  scrollArea: {
    flex: "1",
    overflowY: "auto" as const,
    padding: "12px 0",
  },
  sectionLabelRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "8px 20px 6px",
  },
  sectionLabel: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "1px",
    margin: "0",
  },
  sectionCount: {
    fontSize: "9px",
    color: "#a5b4fc",
    fontWeight: "500" as const,
  },
  untrackedHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "8px 20px 6px",
    cursor: "pointer",
  },
  untrackedLabel: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "1px",
  },
  untrackedChevron: {
    fontSize: "9px",
    color: "#6b6b88",
  },
  untrackedItem: (isSelected: boolean, isHovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    padding: "8px 20px",
    paddingLeft: "17px",
    cursor: "pointer",
    fontSize: "12px",
    color: isSelected ? "#eaeaf5" : "#50506a",
    backgroundColor: isSelected
      ? "#1c2545"
      : isHovered
        ? "#171730"
        : "transparent",
    borderLeft: isSelected
      ? "3px dashed #6b6b88"
      : "3px solid transparent",
    transition: "background-color 0.1s",
  }),
  untrackedDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#50506a",
    flexShrink: "0",
  },
  untrackedName: {
    flex: "1",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  untrackedBadge: {
    fontSize: "10px",
    color: "#6b6b88",
    backgroundColor: "#1e2a50",
    padding: "1px 6px",
    borderRadius: "8px",
    flexShrink: "0",
  },
  footer: {
    display: "flex" as const,
    justifyContent: "center" as const,
    gap: "6px",
    padding: "12px 16px",
    borderTop: "1px solid #1e2a50",
    flexShrink: "0",
  },
  footerBtn: {
    fontSize: "11px",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #1e2a50",
    backgroundColor: "transparent",
    color: "#6b6b88",
    letterSpacing: "0.3px",
    cursor: "pointer",
    flex: "1",
    textAlign: "center" as const,
  },
  emptySection: {
    padding: "8px 20px",
    fontSize: "12px",
    color: "#555570",
    fontStyle: "italic" as const,
  },
};

function UntrackedItem({
  window: uw,
  isSelected,
  onClick,
}: {
  window: UntrackedWindow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={styles.untrackedItem(isSelected, hovered)}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.untrackedDot} />
      <span style={styles.untrackedName}>
        {uw.tabs[0]?.title ? `${uw.tabs[0].title.slice(0, 30)}...` : `Window ${uw.windowId}`}
      </span>
      <span style={styles.untrackedBadge}>
        {uw.tabs.length}
      </span>
    </div>
  );
}

export function Sidebar({
  workspaces,
  untrackedWindows,
  currentWindowId,
  selectedId,
  selectedUntrackedId,
  onSelect,
  onSelectUntracked,
  onRefresh,
  onExport,
  onImport,
  onSwitchWorkspace,
  onSaveWorkspace,
  onRestoreWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onShowHistory,
  onShowHelp,
  selectionMode,
  selectedIds,
  onToggleSelectionMode,
  onToggleSelected,
  onMassSave,
  onMassRestore,
  onMassDelete,
  onMassLock,
  onMassUnlock,
  onMassStar,
  storagePercent,
  onExportBookmarks,
}: Props) {
  const [untrackedExpanded, setUntrackedExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "above" | "below" } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null);

  const activeWorkspaces = workspaces.filter((ws) => ws.windowId !== null);
  const savedWorkspaces = workspaces.filter((ws) => ws.windowId === null);

  const activeSelectedCount = activeWorkspaces.filter((ws) => selectedIds.has(ws.id)).length;
  const savedSelectedCount = savedWorkspaces.filter((ws) => selectedIds.has(ws.id)).length;
  const hasLockedSelected = workspaces.some((ws) => selectedIds.has(ws.id) && ws.locked);
  const deletableCount = savedWorkspaces.filter((ws) => selectedIds.has(ws.id) && !ws.locked).length;

  const draggedWorkspace = draggedId ? workspaces.find((ws) => ws.id === draggedId) : null;
  const draggedSection: "active" | "saved" | null = draggedWorkspace
    ? (draggedWorkspace.windowId !== null ? "active" : "saved")
    : null;

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (id: string, position: "above" | "below") => {
    if (!draggedId || draggedId === id) {
      setDropTarget(null);
      return;
    }
    const targetWs = workspaces.find((ws) => ws.id === id);
    if (!targetWs) return;
    const targetSection: "active" | "saved" = targetWs.windowId !== null ? "active" : "saved";
    if (targetSection !== draggedSection) {
      setDropTarget(null);
      return;
    }
    setDropTarget({ id, position });
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || !dropTarget || !draggedSection) {
      resetDragState();
      return;
    }
    const sectionList = draggedSection === "active" ? activeWorkspaces : savedWorkspaces;
    const targetIdx = sectionList.findIndex((ws) => ws.id === targetId);
    if (targetIdx === -1) {
      resetDragState();
      return;
    }
    const newIndex = dropTarget.position === "below" ? targetIdx + 1 : targetIdx;
    try {
      await reorderWorkspaceTo(draggedId, newIndex, draggedSection);
      onRefresh();
    } catch {
      // silently fail
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const getDropIndicator = (wsId: string): "above" | "below" | null => {
    if (!dropTarget || dropTarget.id !== wsId) return null;
    return dropTarget.position;
  };

  const handleWorkspaceContextMenu = (e: MouseEvent, workspaceId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId });
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu) return [];
    const ws = workspaces.find((w) => w.id === contextMenu.workspaceId);
    if (!ws) return [];
    const isActive = ws.windowId !== null;

    if (isActive) {
      return [
        { label: "Switch to", onClick: () => onSwitchWorkspace(ws.id) },
        { label: "Save & Close", onClick: () => onSaveWorkspace(ws.id) },
        { label: "Rename", onClick: () => { onSelect(ws.id); onRenameWorkspace(ws.id); }, divider: true },
      ];
    }

    return [
      { label: "Restore", onClick: () => onRestoreWorkspace(ws.id) },
      { label: "Rename", onClick: () => { onSelect(ws.id); onRenameWorkspace(ws.id); }, divider: true },
      { label: "Delete", onClick: () => onDeleteWorkspace(ws.id), color: "#DC2626", divider: true },
    ];
  };

  const renderSectionLabel = (label: string, selectedCount: number) => (
    <div style={styles.sectionLabelRow}>
      <span style={styles.sectionLabel}>{label}</span>
      {selectionMode && selectedCount > 0 && (
        <span style={styles.sectionCount}>{selectedCount} selected</span>
      )}
    </div>
  );

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>Concise</h1>
          <div style={styles.version}>Tab Organiser</div>
        </div>
        <button
          style={styles.selectionToggle(selectionMode)}
          onClick={onToggleSelectionMode}
          title={selectionMode ? "Exit selection mode (m)" : "Selection mode (m)"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      <div style={styles.scrollArea}>
        {renderSectionLabel("Active", activeSelectedCount)}
        {activeWorkspaces.length === 0 && (
          <div style={styles.emptySection}>No active workspaces</div>
        )}
        {activeWorkspaces.map((ws) => (
          <SidebarWorkspaceItem
            key={ws.id}
            workspace={ws}
            isCurrent={ws.windowId === currentWindowId}
            isSelected={ws.id === selectedId}
            onClick={() => onSelect(ws.id)}
            onContextMenu={handleWorkspaceContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dropIndicator={getDropIndicator(ws.id)}
            dragColor={draggedWorkspace?.color ?? null}
            selectionMode={selectionMode}
            isChecked={selectedIds.has(ws.id)}
            onToggleChecked={() => onToggleSelected(ws.id)}
          />
        ))}

        <div style={{ height: "8px" }} />

        {renderSectionLabel("Saved", savedSelectedCount)}
        {savedWorkspaces.length === 0 && (
          <div style={styles.emptySection}>No saved workspaces</div>
        )}
        {savedWorkspaces.map((ws) => (
          <SidebarWorkspaceItem
            key={ws.id}
            workspace={ws}
            isCurrent={false}
            isSelected={ws.id === selectedId}
            onClick={() => onSelect(ws.id)}
            onContextMenu={handleWorkspaceContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dropIndicator={getDropIndicator(ws.id)}
            dragColor={draggedWorkspace?.color ?? null}
            selectionMode={selectionMode}
            isChecked={selectedIds.has(ws.id)}
            onToggleChecked={() => onToggleSelected(ws.id)}
          />
        ))}

        {untrackedWindows.length > 0 && (
          <>
            <div style={{ height: "8px" }} />
            <div
              style={styles.untrackedHeader}
              onClick={() => setUntrackedExpanded(!untrackedExpanded)}
            >
              <span style={styles.untrackedLabel}>
                Untracked ({untrackedWindows.length})
              </span>
              <span style={styles.untrackedChevron}>
                {untrackedExpanded ? "\u25BE" : "\u25B8"}
              </span>
            </div>
            {untrackedExpanded &&
              untrackedWindows.map((uw) => (
                <UntrackedItem
                  key={uw.windowId}
                  window={uw}
                  isSelected={uw.windowId === selectedUntrackedId}
                  onClick={() => onSelectUntracked(uw.windowId)}
                />
              ))}
          </>
        )}
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <MassActionBar
          selectedCount={activeSelectedCount + savedSelectedCount}
          activeSelectedCount={activeSelectedCount}
          savedSelectedCount={savedSelectedCount}
          deletableCount={deletableCount}
          hasLockedSelected={hasLockedSelected}
          onSave={onMassSave}
          onRestore={onMassRestore}
          onDelete={onMassDelete}
          onLock={onMassLock}
          onUnlock={onMassUnlock}
          onStar={onMassStar}
          onCancel={onToggleSelectionMode}
        />
      )}

      <div style={{ ...styles.footer, flexDirection: 'column' as const, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
          <button style={styles.footerBtn} onClick={onExport}>
            Export
          </button>
          {onExportBookmarks && (
            <button
              onClick={onExportBookmarks}
              title="Export as browser bookmarks (HTML)"
              style={styles.footerBtn}
            >
              HTML
            </button>
          )}
          <button style={styles.footerBtn} onClick={onImport}>
            Import
          </button>
          <button style={styles.footerBtn} onClick={onShowHistory}>
            History
          </button>
          <button style={styles.footerBtn} onClick={onShowHelp} title="Keyboard shortcuts (?)">
            ?
          </button>
        </div>
        {storagePercent !== undefined && storagePercent > 0 && (
          <div style={{
            fontSize: '10px',
            color: storagePercent > 95 ? '#ef4444' : storagePercent > 80 ? '#f59e0b' : '#555',
            textAlign: 'center',
            marginTop: '4px',
          }}>
            Storage: {storagePercent}%
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
