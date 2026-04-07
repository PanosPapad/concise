import { useState } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../../shared/types";
import { SidebarWorkspaceItem } from "./SidebarWorkspaceItem";

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
  onShowHistory: () => void;
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
  scrollArea: {
    flex: "1",
    overflowY: "auto" as const,
    padding: "12px 0",
  },
  sectionLabel: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "1px",
    padding: "8px 20px 6px",
    margin: "0",
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
    gap: "8px",
    padding: "12px 20px",
    borderTop: "1px solid #1e2a50",
    flexShrink: "0",
  },
  footerBtn: {
    fontSize: "11px",
    padding: "6px 16px",
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
  onShowHistory,
}: Props) {
  const [untrackedExpanded, setUntrackedExpanded] = useState(true);

  const activeWorkspaces = workspaces.filter((ws) => ws.windowId !== null);
  const savedWorkspaces = workspaces.filter((ws) => ws.windowId === null);

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Concise</h1>
        <div style={styles.version}>Tab Organiser</div>
      </div>

      <div style={styles.scrollArea}>
        <div style={styles.sectionLabel}>Active</div>
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
          />
        ))}

        <div style={{ height: "8px" }} />

        <div style={styles.sectionLabel}>Saved</div>
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

      <div style={styles.footer}>
        <button style={styles.footerBtn} onClick={onExport}>
          Export
        </button>
        <button style={styles.footerBtn} onClick={onImport}>
          Import
        </button>
        <button style={styles.footerBtn} onClick={onShowHistory}>
          History
        </button>
      </div>
    </div>
  );
}
