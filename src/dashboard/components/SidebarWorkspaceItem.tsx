import { useState } from "preact/hooks";
import { Workspace } from "../../shared/types";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function itemStyle(
  isSelected: boolean,
  isHovered: boolean,
  color: string,
): Record<string, string> {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 20px",
    cursor: "pointer",
    backgroundColor: isSelected
      ? "#1e2a4a"
      : isHovered
        ? "#1a2340"
        : "transparent",
    borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
    paddingLeft: isSelected ? "17px" : "17px",
    transition: "background-color 0.1s",
  };
}

const styles = {
  dot: (color: string) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: "0",
  }),
  name: {
    flex: "1",
    minWidth: "0",
    fontSize: "13px",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    color: "#e0e0e0",
  },
  badge: {
    fontSize: "10px",
    color: "#8888a0",
    backgroundColor: "#0f3460",
    padding: "1px 6px",
    borderRadius: "8px",
    flexShrink: "0",
  },
  statusLabel: (color: string) => ({
    fontSize: "9px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: color,
    flexShrink: "0",
    letterSpacing: "0.5px",
  }),
};

export function SidebarWorkspaceItem({
  workspace,
  isCurrent,
  isSelected,
  onClick,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const isActive = workspace.windowId !== null;

  return (
    <div
      style={itemStyle(isSelected, hovered, workspace.color)}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.dot(workspace.color)} />
      <span style={styles.name}>{workspace.name}</span>
      <span style={styles.badge}>{workspace.tabs.length}</span>
      {isCurrent ? (
        <span style={styles.statusLabel(workspace.color)}>Current</span>
      ) : isActive ? (
        <span style={styles.statusLabel("#059669")}>Active</span>
      ) : null}
    </div>
  );
}
