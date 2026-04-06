import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  restoreWorkspace,
} from "../../shared/workspace-manager";
import { getDomain } from "../utils";

interface Props {
  workspaces: Workspace[];
  onClose: () => void;
  onRefresh: () => void;
}

interface SearchResult {
  type: "workspace" | "tab";
  workspace: Workspace;
  tabIndex?: number;
  label: string;
  sublabel: string;
}

function buildResults(workspaces: Workspace[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const ws of workspaces) {
    results.push({
      type: "workspace",
      workspace: ws,
      label: ws.name,
      sublabel: `${ws.tabs.length} tabs · ${ws.windowId !== null ? "active" : "saved"}`,
    });
    for (let i = 0; i < ws.tabs.length; i++) {
      const tab = ws.tabs[i];
      results.push({
        type: "tab",
        workspace: ws,
        tabIndex: i,
        label: tab.title || tab.url,
        sublabel: `${getDomain(tab.url)} · ${ws.name}`,
      });
    }
  }
  return results;
}

function filterResults(
  results: SearchResult[],
  query: string,
): SearchResult[] {
  if (!query.trim()) return results.filter((r) => r.type === "workspace");
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return results
    .filter((r) => {
      const text = (r.label + " " + r.sublabel).toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .slice(0, 20);
}

const overlayStyle = {
  position: "fixed" as const,
  top: "0",
  left: "0",
  right: "0",
  bottom: "0",
  backgroundColor: "rgba(10, 10, 30, 0.97)",
  zIndex: 100,
  display: "flex",
  flexDirection: "column" as const,
  padding: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  backgroundColor: "#1a1a2e",
  border: "1px solid #0f3460",
  borderRadius: "6px",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box" as const,
  marginBottom: "8px",
};

const resultsContainerStyle = {
  flex: "1",
  overflowY: "auto" as const,
};

function resultRowStyle(selected: boolean) {
  return {
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: selected ? "#1e2a4a" : "transparent",
  };
}

function tabResultRowStyle(selected: boolean) {
  return {
    ...resultRowStyle(selected),
    paddingLeft: "28px",
  };
}

export function CommandPalette({ workspaces, onClose, onRefresh }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allResults = useMemo(() => buildResults(workspaces), [workspaces]);
  const filtered = useMemo(() => filterResults(allResults, query), [allResults, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const activate = async (result: SearchResult) => {
    try {
      const ws = result.workspace;
      if (ws.windowId !== null) {
        await switchToWorkspace(ws.id);
        if (result.tabIndex !== undefined) {
          try {
            const tabs = await chrome.tabs.query({ windowId: ws.windowId! });
            if (tabs[result.tabIndex]?.id) {
              await chrome.tabs.update(tabs[result.tabIndex].id!, { active: true });
            }
          } catch {
            // Best-effort tab activation; ignore if it fails
          }
        }
      } else {
        await restoreWorkspace(ws.id);
      }
      onRefresh();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to activate workspace",
      );
    } finally {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        activate(filtered[selectedIndex]);
      }
    }
  };

  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector(`[data-result-index="${selectedIndex}"]`) as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div style={overlayStyle}>
      <input
        ref={inputRef}
        style={inputStyle}
        type="text"
        placeholder="Search workspaces and tabs..."
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
      />
      <div ref={resultsRef} style={resultsContainerStyle}>
        {filtered.length === 0 && (
          <div
            style={{
              color: "#8888a0",
              fontSize: "13px",
              textAlign: "center",
              paddingTop: "40px",
            }}
          >
            No matches
          </div>
        )}
        {filtered.map((result, i) => {
          const isWs = result.type === "workspace";
          const style = isWs
            ? resultRowStyle(i === selectedIndex)
            : tabResultRowStyle(i === selectedIndex);
          return (
            <div
              key={`${result.workspace.id}-${result.type}-${result.tabIndex ?? ""}`}
              data-result-index={i}
              style={style}
              onClick={() => activate(result)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {isWs ? (
                <>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: result.workspace.color,
                      flexShrink: "0",
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                    {result.label}
                  </span>
                  <span style={{ fontSize: "11px", color: "#8888a0" }}>
                    {result.sublabel}
                  </span>
                </>
              ) : (
                <>
                  {result.workspace.tabs[result.tabIndex!]?.favIconUrl ? (
                    <img
                      src={
                        result.workspace.tabs[result.tabIndex!].favIconUrl
                      }
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "2px",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "2px",
                        backgroundColor: "#333",
                        flexShrink: "0",
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: "12px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: "1",
                      minWidth: "0",
                    }}
                  >
                    {result.label}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#686880",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {result.sublabel}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
