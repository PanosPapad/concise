import { useState } from "preact/hooks";
import { SavedTab } from "../../shared/types";
import { getDomain, relativeTime, isStale } from "../utils";

interface Props {
  tab: SavedTab;
  showTime?: boolean;
}

const styles = {
  tabRow: (stale: boolean, isHovered: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#c0c0d0",
    opacity: stale ? "0.5" : "1",
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
};

export function TabRow({ tab, showTime = true }: Props) {
  const [hovered, setHovered] = useState(false);
  const stale = showTime ? isStale(tab.lastActivatedAt) : false;

  return (
    <div
      style={styles.tabRow(stale, hovered)}
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
      {tab.pinned && <span style={styles.pinIndicator}>PIN</span>}
      <span style={styles.tabTitle}>{tab.title || tab.url}</span>
      <span style={styles.tabDomain}>{getDomain(tab.url)}</span>
      {showTime && (
        <span style={styles.tabTime}>{relativeTime(tab.lastActivatedAt)}</span>
      )}
    </div>
  );
}
