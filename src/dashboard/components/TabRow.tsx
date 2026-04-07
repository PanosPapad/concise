import { useState, useRef, useEffect } from "preact/hooks";
import { SavedTab, Workspace } from "../../shared/types";
import { getDomain, relativeTime, isStale } from "../utils";

interface MoveDropdownProps {
  workspaces: Workspace[];
  onSelect: (workspaceId: string) => void;
  onClose: () => void;
}

function MoveDropdown({ workspaces, onSelect, onClose }: MoveDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: "0",
        top: "100%",
        zIndex: "100",
        backgroundColor: "#1a1a35",
        border: "1px solid #1e2a50",
        borderRadius: "8px",
        padding: "4px 0",
        minWidth: "180px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {workspaces.length === 0 ? (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "12px",
            color: "#6b6b88",
          }}
        >
          No other workspaces
        </div>
      ) : (
        workspaces.map((ws) => (
          <div
            key={ws.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(ws.id);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "#1e2a50";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "transparent";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#c0c0d0",
              backgroundColor: "transparent",
              transition: "background-color 0.1s",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: ws.color,
                flexShrink: "0",
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ws.name}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export interface TabRowProps {
  tab: SavedTab;
  onGoToTab?: (tab: SavedTab) => void;
  onCloseTab?: (tab: SavedTab) => void;
  onMoveTab?: (tab: SavedTab, targetWorkspaceId: string) => void;
  onContextMenu?: (e: MouseEvent, tab: SavedTab) => void;
  isActive?: boolean;
  moveTargets?: Workspace[];
  showStaleLabel?: boolean;
  extraPaddingLeft?: number;
}

const styles = {
  tabRow: (stale: boolean, isHovered: boolean, showStaleLabel: boolean, extraPaddingLeft: number) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    padding: "12px 16px",
    paddingLeft: `${16 + extraPaddingLeft}px`,
    fontSize: "13px",
    color: "#c0c0d0",
    opacity: showStaleLabel ? "1" : (stale ? "0.5" : "1"),
    borderBottom: "1px solid #1e2a50",
    backgroundColor: isHovered ? "#1c2545" : "transparent",
    transition: "background-color 0.1s",
    position: "relative" as const,
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
  pinIndicator: {
    fontSize: "10px",
    color: "#6b6b88",
    flexShrink: "0",
  },
  tabDomain: {
    fontSize: "12px",
    color: "#50506a",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
    minWidth: "80px",
  },
  tabTime: {
    fontSize: "11px",
    color: "#50506a",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
    minWidth: "30px",
    textAlign: "right" as const,
  },
  actionCluster: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "4px",
    flexShrink: "0",
    position: "relative" as const,
  },
  actionBtn: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "24px",
    height: "24px",
    padding: "4px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: "#6b6b88",
    cursor: "pointer",
    transition: "background-color 0.1s, color 0.1s",
  },
};

export function TabRow({
  tab,
  onGoToTab,
  onCloseTab,
  onMoveTab,
  onContextMenu,
  isActive,
  moveTargets,
  showStaleLabel = false,
  extraPaddingLeft = 0,
}: TabRowProps) {
  const [hovered, setHovered] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const stale = isStale(tab.lastActivatedAt);

  const hasActions = !!(onGoToTab || onCloseTab || onMoveTab);
  const showActions = (hovered || moveOpen) && hasActions;

  return (
    <div
      style={styles.tabRow(stale, hovered, showStaleLabel, extraPaddingLeft)}
      onContextMenu={(e: MouseEvent) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, tab);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (moveOpen) return;
        setHovered(false);
      }}
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
      {tab.pinned && <span style={styles.pinIndicator}>PIN</span>}
      <span style={styles.tabTitle}>{tab.title || tab.url}</span>
      <span style={styles.tabDomain}>{getDomain(tab.url)}</span>

      {showActions ? (
        <div style={styles.actionCluster}>
          {isActive && onGoToTab && (
            <button
              style={styles.actionBtn}
              title="Go to tab"
              onClick={(e) => {
                e.stopPropagation();
                onGoToTab(tab);
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = "#1e2a50";
                btn.style.color = "#eaeaf5";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = "transparent";
                btn.style.color = "#6b6b88";
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 1l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {onCloseTab && (
            <button
              style={styles.actionBtn}
              title={isActive ? "Close tab" : "Remove tab"}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab);
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = "#1e2a50";
                btn.style.color = "#DC2626";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = "transparent";
                btn.style.color = "#6b6b88";
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          {onMoveTab && (
            <div style={{ position: "relative" as const }}>
              <button
                style={styles.actionBtn}
                title="Move to..."
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveOpen((v) => !v);
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = "#1e2a50";
                  btn.style.color = "#eaeaf5";
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = "transparent";
                  btn.style.color = "#6b6b88";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 3h4l1.5-1.5H11v8H1V3z"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {moveOpen && moveTargets && (
                <MoveDropdown
                  workspaces={moveTargets}
                  onSelect={(targetId) => {
                    setMoveOpen(false);
                    onMoveTab(tab, targetId);
                  }}
                  onClose={() => setMoveOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
          {showStaleLabel && stale && (
            <span style={{
              fontSize: "10px",
              color: "#D97706",
              background: "#2a2010",
              padding: "1px 4px",
              borderRadius: "3px",
              whiteSpace: "nowrap" as const,
            }}>stale</span>
          )}
          {tab.lastActivatedAt !== undefined && (
            <span style={styles.tabTime}>{relativeTime(tab.lastActivatedAt)}</span>
          )}
        </span>
      )}
    </div>
  );
}
