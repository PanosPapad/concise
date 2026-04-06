import { useState } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../../shared/types";
import { SidebarWorkspaceItem } from "./SidebarWorkspaceItem";

interface Props {
  workspaces: Workspace[];
  untrackedWindows: UntrackedWindow[];
  currentWindowId: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
}

const styles = {
  sidebar: {
    width: "280px",
    minWidth: "280px",
    height: "100vh",
    backgroundColor: "#16213e",
    borderRight: "1px solid #0f3460",
    display: "flex" as const,
    flexDirection: "column" as const,
    overflow: "hidden" as const,
  },
  header: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid #0f3460",
    flexShrink: "0",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "700",
    margin: "0",
    color: "#e0e0e0",
    letterSpacing: "-0.3px",
  },
  version: {
    fontSize: "11px",
    color: "#8888a0",
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
    color: "#8888a0",
    letterSpacing: "0.8px",
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
    color: "#8888a0",
    letterSpacing: "0.8px",
  },
  untrackedChevron: {
    fontSize: "9px",
    color: "#8888a0",
  },
  untrackedItem: {
    padding: "6px 20px 6px 28px",
    fontSize: "12px",
    color: "#686880",
  },
  footer: {
    display: "flex" as const,
    justifyContent: "center" as const,
    gap: "8px",
    padding: "12px 20px",
    borderTop: "1px solid #0f3460",
    flexShrink: "0",
  },
  footerBtn: {
    fontSize: "11px",
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid #0f3460",
    backgroundColor: "transparent",
    color: "#8888a0",
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

export function Sidebar({
  workspaces,
  untrackedWindows,
  currentWindowId,
  selectedId,
  onSelect,
  onRefresh,
  onExport,
  onImport,
}: Props) {
  const [untrackedExpanded, setUntrackedExpanded] = useState(false);

  const activeWorkspaces = workspaces.filter((ws) => ws.windowId !== null);
  const savedWorkspaces = workspaces.filter((ws) => ws.windowId === null);

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Manama</h1>
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
                <div key={uw.windowId} style={styles.untrackedItem}>
                  Window {uw.windowId} — {uw.tabs.length} tab
                  {uw.tabs.length !== 1 ? "s" : ""}
                </div>
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
      </div>
    </div>
  );
}
