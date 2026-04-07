import { useState, useEffect, useRef } from "preact/hooks";
import { Workspace, UntrackedWindow, NEW_WORKSPACE_COLORS } from "../shared/types";
import {
  getWorkspaceList,
  getUntrackedWindows,
  createWorkspace,
} from "../shared/workspace-manager";
import { exportData, importData } from "../shared/storage";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceDetail } from "./components/WorkspaceDetail";
import { UntrackedWindowPanel } from "./components/UntrackedWindowPanel";
import { CreateSuggestionDropdown } from "./components/CreateSuggestionDropdown";
import { BackupHistoryPanel } from "./components/BackupHistoryPanel";
import { CommandPalette } from "../popup/components/CommandPalette";

const styles = {
  container: {
    display: "flex" as const,
    width: "100%",
    height: "100vh",
    backgroundColor: "#0f0f1a",
    color: "#eaeaf5",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  mainArea: {
    flex: "1",
    display: "flex" as const,
    flexDirection: "column" as const,
    minWidth: "0",
    height: "100vh",
    overflow: "hidden" as const,
  },
  topBar: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    padding: "14px 24px",
    borderBottom: "1px solid #1e2a50",
    backgroundColor: "#13132a",
    flexShrink: "0",
    position: "relative" as const,
  },
  searchInput: {
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
  contentArea: {
    flex: "1",
    overflow: "auto" as const,
    padding: "24px",
  },
  emptyState: {
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: "100%",
    gap: "8px",
    color: "#6b6b88",
    fontSize: "15px",
  },
  emptyHint: {
    fontSize: "13px",
    color: "#50506a",
  },
};

export function DashboardApp() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [untrackedWindows, setUntrackedWindows] = useState<UntrackedWindow[]>(
    [],
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [selectedUntrackedId, setSelectedUntrackedId] = useState<number | null>(
    null,
  );
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newColor, setNewColor] = useState(NEW_WORKSPACE_COLORS[0]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [list, untracked] = await Promise.all([
      getWorkspaceList(),
      getUntrackedWindows(),
    ]);
    setWorkspaces(list);
    setUntrackedWindows(untracked);
  };

  useEffect(() => {
    loadData();
    chrome.windows.getCurrent().then((win) => {
      setCurrentWindowId(win.id ?? null);
    });
  }, []);

  // Live updates when storage changes
  useEffect(() => {
    const listener = () => {
      loadData();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `concise-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await importData(reader.result as string);
        await loadData();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Failed to import",
        );
      }
    };
    reader.readAsText(file);
    input.value = "";
  };

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    setSelectedUntrackedId(null);
  };

  const handleSelectUntracked = (windowId: number) => {
    setSelectedUntrackedId(windowId);
    setSelectedWorkspaceId(null);
  };

  // Unified search/create: show create suggestion when query doesn't match an existing name
  const showCreatePrompt =
    searchQuery.trim().length > 0 &&
    !workspaces.some(
      (ws) => ws.name.toLowerCase() === searchQuery.trim().toLowerCase(),
    );

  const handleCreateFromSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    try {
      const ws = await createWorkspace(trimmed, newColor);
      setSearchQuery("");
      setNewColor(NEW_WORKSPACE_COLORS[0]);
      setSelectedWorkspaceId(ws.id);
      setSelectedUntrackedId(null);
      await loadData();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to create workspace",
      );
    }
  };

  const selectedWorkspace = workspaces.find(
    (ws) => ws.id === selectedWorkspaceId,
  );

  const selectedUntracked = untrackedWindows.find(
    (uw) => uw.windowId === selectedUntrackedId,
  );

  const filteredWorkspaces = searchQuery.trim()
    ? workspaces.filter((ws) =>
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : workspaces;

  return (
    <div style={styles.container}>
      <Sidebar
        workspaces={filteredWorkspaces}
        untrackedWindows={untrackedWindows}
        currentWindowId={currentWindowId}
        selectedId={selectedWorkspaceId}
        selectedUntrackedId={selectedUntrackedId}
        onSelect={handleSelectWorkspace}
        onSelectUntracked={handleSelectUntracked}
        onRefresh={loadData}
        onExport={handleExport}
        onImport={handleImport}
        onShowHistory={() => setHistoryOpen(true)}
      />

      <div style={styles.mainArea}>
        <div style={styles.topBar}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder='Search or create workspaces... (press "/" for command palette)'
            value={searchQuery}
            onInput={(e) =>
              setSearchQuery((e.target as HTMLInputElement).value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreatePrompt) {
                handleCreateFromSearch();
              }
            }}
          />
          {showCreatePrompt && (
            <CreateSuggestionDropdown
              name={searchQuery.trim()}
              selectedColor={newColor}
              onSelectColor={setNewColor}
              onCreate={handleCreateFromSearch}
            />
          )}
        </div>

        <div style={styles.contentArea}>
          {historyOpen ? (
            <BackupHistoryPanel
              onClose={() => setHistoryOpen(false)}
              onRefresh={loadData}
            />
          ) : selectedWorkspace ? (
            <WorkspaceDetail
              workspace={selectedWorkspace}
              isCurrent={selectedWorkspace.windowId === currentWindowId}
              onRefresh={loadData}
            />
          ) : selectedUntracked ? (
            <UntrackedWindowPanel
              window={selectedUntracked}
              onAssigned={async () => {
                await loadData();
                setSelectedUntrackedId(null);
              }}
            />
          ) : (
            <div style={styles.emptyState}>
              <span>Select a workspace from the sidebar</span>
              <span style={styles.emptyHint}>
                Type a name to create, or select an untracked window
              </span>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {paletteOpen && (
        <CommandPalette
          workspaces={workspaces}
          onClose={() => setPaletteOpen(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
