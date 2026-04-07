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
    padding: "9px 20px",
    cursor: "pointer",
    backgroundColor: isSelected
      ? "#1c2545"
      : isHovered
        ? "#171730"
        : "transparent",
    borderLeft: isSelected ? `3px solid ${color}` : isHovered ? `3px solid ${color}40` : "3px solid transparent",
    paddingLeft: "17px",
    transition: "background-color 0.1s",
  };
}

const styles = {
  dot: (color: string) => ({
    width: "9px",
    height: "9px",
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
    color: "#eaeaf5",
  },
  badge: {
    fontSize: "10px",
    color: "#6b6b88",
    backgroundColor: "#1e2a50",
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
