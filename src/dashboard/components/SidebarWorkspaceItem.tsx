import { useState } from "preact/hooks";
import { Workspace } from "../../shared/types";
import { workspaceHealthRatio, formatRelativeTime } from "../utils";

interface Props {
  workspace: Workspace;
  isCurrent: boolean;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent, workspaceId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: "above" | "below") => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  dropIndicator: "above" | "below" | null;
  dragColor: string | null;
  selectionMode?: boolean;
  isChecked?: boolean;
  onToggleChecked?: () => void;
}

function itemStyle(
  isSelected: boolean,
  isHovered: boolean,
  isDragging: boolean,
  color: string,
  dropIndicator: "above" | "below" | null,
  dragColor: string | null,
): Record<string, string> {
  const indicatorColor = dragColor || "#4F46E5";
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 20px",
    cursor: isDragging ? "grabbing" : "grab",
    backgroundColor: isSelected
      ? "#1c2545"
      : isHovered
        ? "#171730"
        : "transparent",
    borderLeft: isSelected ? `3px solid ${color}` : isHovered ? `3px solid ${color}40` : "3px solid transparent",
    paddingLeft: "17px",
    transition: "background-color 0.1s",
    opacity: isDragging ? "0.4" : "1",
    borderTop: dropIndicator === "above" ? `2px solid ${indicatorColor}` : "2px solid transparent",
    borderBottom: dropIndicator === "below" ? `2px solid ${indicatorColor}` : "2px solid transparent",
    minHeight: "46px",
    boxSizing: "border-box",
  };
}

function healthArcColor(ratio: number, workspaceColor: string): string {
  if (ratio < 0.3) return "#DC2626";
  if (ratio <= 0.7) return "#D97706";
  return workspaceColor;
}

const RING_SIZE = 14;
const RING_RADIUS = 5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function HealthRing({
  ratio,
  color,
  isActive,
}: {
  ratio: number;
  color: string;
  isActive: boolean;
}) {
  const arcColor = healthArcColor(ratio, color);
  const dashArray = `${ratio * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;

  const wrapperStyle: Record<string, string> = {
    flexShrink: "0",
    width: `${RING_SIZE}px`,
    height: `${RING_SIZE}px`,
    borderRadius: "50%",
  };

  if (isActive) {
    wrapperStyle.animation = "pulse-glow 2s ease-in-out infinite";
    wrapperStyle.boxShadow = `0 0 6px 2px ${color}90`;
  }

  return (
    <div style={wrapperStyle}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{ display: "block" }}
      >
        {/* Background circle */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#1e2a50"
          strokeWidth="2"
          fill="none"
        />
        {/* Foreground arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={arcColor}
          strokeWidth="2"
          fill="none"
          strokeDasharray={dashArray}
          strokeDashoffset={RING_CIRCUMFERENCE * 0.25}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
        {/* Center dot */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={3}
          fill={color}
        />
      </svg>
    </div>
  );
}

const styles = {
  infoColumn: {
    flex: "1",
    minWidth: "0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1px",
  },
  name: {
    fontSize: "13px",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    color: "#eaeaf5",
  },
  lastAccessed: {
    fontSize: "10px",
    color: "#50506a",
    lineHeight: "1.2",
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
  starIndicator: {
    fontSize: "11px",
    color: "#D97706",
    flexShrink: "0",
  },
  lockIndicator: {
    fontSize: "10px",
    flexShrink: "0",
  },
};

export function SidebarWorkspaceItem({
  workspace,
  isCurrent,
  isSelected,
  onClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropIndicator,
  dragColor,
  selectionMode,
  isChecked,
  onToggleChecked,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isActive = workspace.windowId !== null;
  const healthRatio = workspaceHealthRatio(workspace.tabs);

  const handleClick = () => {
    if (selectionMode && onToggleChecked) {
      onToggleChecked();
    } else {
      onClick();
    }
  };

  return (
    <div
      draggable={!selectionMode}
      style={itemStyle(isSelected && !selectionMode, hovered, isDragging, workspace.color, dropIndicator, dragColor)}
      onClick={handleClick}
      onContextMenu={(e: MouseEvent) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, workspace.id);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragStart={(e: DragEvent) => {
        setIsDragging(true);
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", workspace.id);
          e.dataTransfer.effectAllowed = "move";
        }
        onDragStart(workspace.id);
      }}
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? "above" : "below";
        onDragOver(workspace.id, position);
      }}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        onDrop(workspace.id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
    >
      {selectionMode && (
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "3px",
            border: isChecked ? "none" : "1.5px solid #3a4a70",
            backgroundColor: isChecked ? "#4F46E5" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: "0",
            transition: "background-color 0.1s",
            cursor: "pointer",
          }}
        >
          {isChecked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.5 7.5L8 3" stroke="#eaeaf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      <HealthRing ratio={healthRatio} color={workspace.color} isActive={isActive} />
      {workspace.starred && <span style={styles.starIndicator}>★</span>}
      <div style={styles.infoColumn}>
        <span style={styles.name}>{workspace.name}</span>
        <span style={styles.lastAccessed}>
          {(() => {
            const rt = formatRelativeTime(workspace.lastAccessedAt);
            return rt === "just now" ? rt : `${rt} ago`;
          })()}
        </span>
      </div>
      <span style={styles.badge}>{workspace.tabs.length}</span>
      {workspace.locked && <span style={styles.lockIndicator}>🔒</span>}
      {isCurrent ? (
        <span style={styles.statusLabel(workspace.color)}>Current</span>
      ) : isActive ? (
        <span style={styles.statusLabel("#059669")}>Active</span>
      ) : null}
    </div>
  );
}
