import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { Workspace } from "../../shared/types";
import {
  switchToWorkspace,
  restoreWorkspace,
} from "../../shared/workspace-manager";
import { getDomain } from "../utils";

export interface PaletteCommand {
  name: string;
  aliases?: string[];
  description: string;
  expectsArg?: "workspace" | "text";
  execute: (arg?: string) => void | Promise<void>;
}

interface Props {
  workspaces: Workspace[];
  onClose: () => void;
  onRefresh: () => void;
  commands?: PaletteCommand[];
}

// --- Result types ---

type PaletteItem =
  | { type: "workspace"; workspace: Workspace; label: string; sublabel: string }
  | { type: "tab"; workspace: Workspace; tabIndex: number; label: string; sublabel: string }
  | { type: "command"; command: PaletteCommand; label: string; sublabel: string };

function buildSearchResults(workspaces: Workspace[]): PaletteItem[] {
  const results: PaletteItem[] = [];
  for (const ws of workspaces) {
    results.push({
      type: "workspace",
      workspace: ws,
      label: ws.name,
      sublabel: `${ws.tabs.length} tabs \u00b7 ${ws.windowId !== null ? "active" : "saved"}`,
    });
    for (let i = 0; i < ws.tabs.length; i++) {
      const tab = ws.tabs[i];
      results.push({
        type: "tab",
        workspace: ws,
        tabIndex: i,
        label: tab.title || tab.url,
        sublabel: `${getDomain(tab.url)} \u00b7 ${ws.name}`,
      });
    }
  }
  return results;
}

function filterSearchResults(results: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return results.filter((r) => r.type === "workspace");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return results
    .filter((r) => {
      const text = (r.label + " " + r.sublabel).toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .slice(0, 20);
}

function matchCommands(commands: PaletteCommand[], partial: string): PaletteCommand[] {
  if (!partial) return commands;
  const lower = partial.toLowerCase();
  return commands.filter((cmd) => {
    const names = [cmd.name, ...(cmd.aliases ?? [])];
    return names.some((n) => n.startsWith(lower));
  });
}

// --- Styles ---

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

function commandRowStyle(selected: boolean) {
  return {
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    backgroundColor: selected ? "#1e2a4a" : "transparent",
  };
}

// --- Component ---

export function CommandPalette({ workspaces, onClose, onRefresh, commands }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allSearchResults = useMemo(() => buildSearchResults(workspaces), [workspaces]);

  const isCommandMode = query.startsWith("/") && commands !== undefined && commands.length > 0;

  // Parse command query
  const commandParts = isCommandMode ? query.slice(1).split(/\s+/) : [];
  const cmdName = commandParts[0]?.toLowerCase() ?? "";
  const cmdArg = commandParts.slice(1).join(" ");

  const items: PaletteItem[] = useMemo(() => {
    if (!isCommandMode) {
      return filterSearchResults(allSearchResults, query);
    }

    const matching = matchCommands(commands!, cmdName);

    // Multiple matches or just the command name typed: show command list
    if (matching.length !== 1) {
      return matching.map((cmd) => ({
        type: "command" as const,
        command: cmd,
        label: `/${cmd.name}`,
        sublabel: cmd.description,
      }));
    }

    // Single matched command
    const matched = matching[0];

    if (!matched.expectsArg) {
      return [{
        type: "command" as const,
        command: matched,
        label: `/${matched.name}`,
        sublabel: `${matched.description} \u2014 press Enter`,
      }];
    }

    if (matched.expectsArg === "workspace") {
      // Show filtered workspace suggestions
      const words = cmdArg.toLowerCase().split(/\s+/).filter(Boolean);
      return workspaces
        .filter((ws) => {
          if (words.length === 0) return true;
          const text = ws.name.toLowerCase();
          return words.every((w) => text.includes(w));
        })
        .slice(0, 15)
        .map((ws) => ({
          type: "workspace" as const,
          workspace: ws,
          label: ws.name,
          sublabel: `${ws.tabs.length} tabs \u00b7 ${ws.windowId !== null ? "active" : "saved"}`,
        }));
    }

    // expectsArg === "text"
    return [{
      type: "command" as const,
      command: matched,
      label: `/${matched.name}${cmdArg ? ` ${cmdArg}` : ""}`,
      sublabel: cmdArg
        ? `${matched.description}: "${cmdArg}" \u2014 press Enter`
        : `Type a name after /${matched.name}`,
    }];
  }, [isCommandMode, allSearchResults, query, commands, workspaces, cmdName, cmdArg]);

  // Resolve the matched command for activation (when a workspace is selected in command mode)
  const matchedCommand: PaletteCommand | null = useMemo(() => {
    if (!isCommandMode || !commands) return null;
    const matching = matchCommands(commands, cmdName);
    return matching.length === 1 ? matching[0] : null;
  }, [isCommandMode, commands, cmdName]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const activate = async (item: PaletteItem) => {
    try {
      if (item.type === "command") {
        await item.command.execute(cmdArg || undefined);
        onRefresh();
        onClose();
        return;
      }

      if (item.type === "workspace" && isCommandMode && matchedCommand) {
        // Workspace selected as argument to a command
        await matchedCommand.execute(item.workspace.id);
        onRefresh();
        onClose();
        return;
      }

      // Normal search mode: switch/restore workspace or activate tab
      const ws = item.workspace;
      if (ws.windowId !== null) {
        await switchToWorkspace(ws.id);
        if (item.type === "tab" && item.tabIndex !== undefined) {
          try {
            const targetUrl = ws.tabs[item.tabIndex]?.url;
            if (targetUrl) {
              const tabs = await chrome.tabs.query({ windowId: ws.windowId! });
              const match = tabs.find((t) => t.url === targetUrl);
              if (match?.id) {
                await chrome.tabs.update(match.id, { active: true });
              }
            }
          } catch {
            // Best-effort tab activation
          }
        }
      } else {
        await restoreWorkspace(ws.id);
      }
      onRefresh();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to activate",
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
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        activate(items[selectedIndex]);
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

  const placeholder = isCommandMode
    ? "Type a command... (e.g. /save, /new Project)"
    : commands
      ? "Search workspaces and tabs... (type / for commands)"
      : "Search workspaces and tabs...";

  return (
    <div style={overlayStyle}>
      <input
        ref={inputRef}
        style={inputStyle}
        type="text"
        placeholder={placeholder}
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
      />
      <div ref={resultsRef} style={resultsContainerStyle}>
        {items.length === 0 && (
          <div
            style={{
              color: "#8888a0",
              fontSize: "13px",
              textAlign: "center",
              paddingTop: "40px",
            }}
          >
            {isCommandMode ? "No matching commands" : "No matches"}
          </div>
        )}
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          const key =
            item.type === "command"
              ? `cmd-${item.command.name}`
              : item.type === "tab"
                ? `${item.workspace.id}-tab-${item.tabIndex}`
                : `${item.workspace.id}-ws`;

          if (item.type === "command") {
            return (
              <div
                key={key}
                data-result-index={i}
                style={commandRowStyle(isSelected)}
                onClick={() => activate(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    color: "#a5b4fc",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#8888a0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: "1",
                    minWidth: "0",
                  }}
                >
                  {item.sublabel}
                </span>
              </div>
            );
          }

          if (item.type === "workspace") {
            return (
              <div
                key={key}
                data-result-index={i}
                style={resultRowStyle(isSelected)}
                onClick={() => activate(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: item.workspace.color,
                    flexShrink: "0",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: "500" }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "11px", color: "#8888a0" }}>
                  {item.sublabel}
                </span>
              </div>
            );
          }

          // Tab result
          return (
            <div
              key={key}
              data-result-index={i}
              style={tabResultRowStyle(isSelected)}
              onClick={() => activate(item)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {item.workspace.tabs[item.tabIndex]?.favIconUrl ? (
                <img
                  src={item.workspace.tabs[item.tabIndex].favIconUrl}
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "2px",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
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
                {item.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#686880",
                  whiteSpace: "nowrap",
                }}
              >
                {item.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
