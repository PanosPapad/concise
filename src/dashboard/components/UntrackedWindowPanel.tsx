import { useState } from "preact/hooks";
import { UntrackedWindow } from "../../shared/types";
import { NEW_WORKSPACE_COLORS } from "../../shared/types";
import { createWorkspace } from "../../shared/workspace-manager";
import { getDomain } from "../utils";

interface Props {
  window: UntrackedWindow;
  onAssigned: () => void;
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
  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#eaeaf5",
    margin: "0",
    flex: "1",
    minWidth: "0",
  },
  tabCount: {
    fontSize: "14px",
    color: "#6b6b88",
    flexShrink: "0",
  },
  statusBadge: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    padding: "4px 10px",
    borderRadius: "12px",
    border: "1px solid #6b6b88",
    flexShrink: "0",
    letterSpacing: "0.8px",
  },
  formSection: {
    marginBottom: "24px",
  },
  formLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#eaeaf5",
    marginBottom: "12px",
    display: "block" as const,
  },
  formRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
  },
  nameInput: {
    flex: "1",
    padding: "10px 14px",
    fontSize: "14px",
    backgroundColor: "#0f0f1a",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    color: "#eaeaf5",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  colorPicker: {
    display: "flex" as const,
    gap: "6px",
    alignItems: "center" as const,
  },
  colorDot: (color: string, selected: boolean) => ({
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: color,
    cursor: "pointer",
    border: selected ? "2px solid #eaeaf5" : "2px solid transparent",
    transform: selected ? "scale(1.2)" : "scale(1)",
    transition: "transform 0.1s",
  }),
  assignBtn: (color: string) => ({
    padding: "9px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    border: "none",
    backgroundColor: color,
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
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
  tabRow: (isHovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#c0c0d0",
    borderBottom: "1px solid #1e2a50",
    backgroundColor: isHovered ? "#1c2545" : "transparent",
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
  tabDomain: {
    fontSize: "12px",
    color: "#50506a",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
    minWidth: "80px",
  },
  emptyTabs: {
    padding: "24px",
    textAlign: "center" as const,
    color: "#6b6b88",
    fontSize: "13px",
  },
};

function TabRow({ tab }: { tab: UntrackedWindow["tabs"][number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={styles.tabRow(hovered)}
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
      <span style={styles.tabTitle}>{tab.title || tab.url}</span>
      <span style={styles.tabDomain}>{getDomain(tab.url)}</span>
    </div>
  );
}

export function UntrackedWindowPanel({ window: win, onAssigned }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(NEW_WORKSPACE_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await createWorkspace(trimmed, color, win.windowId);
      onAssigned();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to assign workspace",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Untracked Window</h2>
        <span style={styles.tabCount}>
          {win.tabs.length} tab{win.tabs.length !== 1 ? "s" : ""}
        </span>
        <span style={styles.statusBadge}>Untracked</span>
      </div>

      <div style={styles.formSection}>
        <span style={styles.formLabel}>Assign to workspace</span>
        <div style={styles.formRow}>
          <input
            style={styles.nameInput}
            type="text"
            placeholder="Workspace name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAssign();
            }}
            autoFocus
          />
          <div style={styles.colorPicker}>
            {NEW_WORKSPACE_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={styles.colorDot(c, c === color)}
              />
            ))}
          </div>
          <button
            style={styles.assignBtn(color)}
            onClick={handleAssign}
            disabled={loading || !name.trim()}
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>

      <div style={styles.tabListHeader}>
        <h3 style={styles.tabListTitle}>Tabs in this window</h3>
      </div>

      <div style={styles.tabList}>
        {win.tabs.length === 0 ? (
          <div style={styles.emptyTabs}>No tabs in this window</div>
        ) : (
          win.tabs.map((tab, i) => (
            <TabRow key={`${tab.url}-${i}`} tab={tab} />
          ))
        )}
      </div>
    </div>
  );
}
