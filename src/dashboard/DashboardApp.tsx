import { useState, useEffect, useRef } from "preact/hooks";
import { Workspace, UntrackedWindow, NEW_WORKSPACE_COLORS } from "../shared/types";
import {
  getWorkspaceList,
  getUntrackedWindows,
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
  createWorkspace,
} from "../shared/workspace-manager";
import { exportData, importData } from "../shared/storage";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceDetail } from "./components/WorkspaceDetail";
import { UntrackedWindowPanel } from "./components/UntrackedWindowPanel";
import { CreateWorkspacePanel } from "./components/CreateWorkspacePanel";
import { CommandPalette } from "../popup/components/CommandPalette";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import { EmptyState } from "./components/EmptyState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

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
  newButton: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "500" as const,
    borderRadius: "16px",
    border: "1px solid #2a3a60",
    backgroundColor: "#1e2a50",
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0" as const,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    transition: "background-color 0.15s",
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
  createSuggestion: {
    position: "absolute" as const,
    top: "100%",
    left: "24px",
    right: "24px",
    marginTop: "4px",
    backgroundColor: "#13132a",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    padding: "10px 14px",
    zIndex: 10,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    cursor: "pointer",
  },
  suggestionLabel: {
    flex: "1",
    fontSize: "13px",
    color: "#6b6b88",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  suggestionColorPicker: {
    display: "flex" as const,
    gap: "4px",
    alignItems: "center" as const,
    flexShrink: 0,
  },
  suggestionCreateBtn: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: "500" as const,
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4F46E5",
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  },
  suggestionHint: {
    fontSize: "11px",
    color: "#50506a",
    flexShrink: 0,
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
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [inlineColor, setInlineColor] = useState("#4F46E5");
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

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    setSelectedUntrackedId(null);
  };

  const handleSidebarSwitch = (id: string) => {
    switchToWorkspace(id).then(() => loadData());
  };

  const handleSidebarSave = (id: string) => {
    saveWorkspaceToStorage(id).then(() => loadData());
  };

  const handleSidebarRestore = (id: string) => {
    restoreWorkspace(id).then(() => loadData());
  };

  const handleSidebarDelete = (id: string) => {
    deleteWorkspace(id).then(() => {
      if (selectedWorkspaceId === id) {
        setSelectedWorkspaceId(null);
      }
      loadData();
    });
  };

  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  const handleSidebarRename = (id: string) => {
    setRenameTargetId(id);
  };

  // Keyboard shortcuts
  const { showHelpOverlay, setShowHelpOverlay } = useKeyboardShortcuts({
    workspaces,
    selectedWorkspaceId,
    onSelectWorkspace: handleSelectWorkspace,
    onOpenCommandPalette: () => setPaletteOpen(true),
    onCloseCommandPalette: () => setPaletteOpen(false),
    isCommandPaletteOpen: paletteOpen,
    onOpenCreatePanel: () => setShowCreatePanel(true),
    onCloseCreatePanel: () => setShowCreatePanel(false),
    isCreatePanelOpen: showCreatePanel,
    onSaveWorkspace: (id: string) => {
      saveWorkspaceToStorage(id).then(() => loadData());
    },
    onSwitchWorkspace: (id: string) => {
      switchToWorkspace(id).then(() => loadData());
    },
    onRestoreWorkspace: (id: string) => {
      restoreWorkspace(id).then(() => loadData());
    },
    onDeleteWorkspace: (id: string) => {
      if (window.confirm("Delete this workspace?")) {
        deleteWorkspace(id).then(() => {
          if (selectedWorkspaceId === id) {
            setSelectedWorkspaceId(null);
          }
          loadData();
        });
      }
    },
    onShowHelp: () => setShowHelpOverlay(true),
  });

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

  const handleSelectUntracked = (windowId: number) => {
    setSelectedUntrackedId(windowId);
    setSelectedWorkspaceId(null);
  };

  const handleWorkspaceCreated = async (workspaceId: string) => {
    setShowCreatePanel(false);
    setSelectedWorkspaceId(workspaceId);
    setSelectedUntrackedId(null);
    await loadData();
  };

  const showCreateSuggestion =
    searchQuery.trim().length > 0 &&
    !showCreatePanel &&
    !workspaces.some(
      (ws) => ws.name.toLowerCase() === searchQuery.trim().toLowerCase(),
    );

  const handleCreateFromSearch = async () => {
    try {
      const ws = await createWorkspace(searchQuery.trim(), inlineColor);
      setSearchQuery("");
      setSelectedWorkspaceId(ws.id);
      setSelectedUntrackedId(null);
      setInlineColor("#4F46E5");
      await loadData();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to create");
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
        onSwitchWorkspace={handleSidebarSwitch}
        onSaveWorkspace={handleSidebarSave}
        onRestoreWorkspace={handleSidebarRestore}
        onDeleteWorkspace={handleSidebarDelete}
        onRenameWorkspace={handleSidebarRename}
      />

      <div style={styles.mainArea}>
        <div style={styles.topBar}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search or create workspace... (/ for command palette)"
            value={searchQuery}
            onInput={(e) =>
              setSearchQuery((e.target as HTMLInputElement).value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateSuggestion) {
                e.preventDefault();
                handleCreateFromSearch();
              }
            }}
          />
          <button
            style={styles.newButton}
            onClick={() => setShowCreatePanel((v) => !v)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#253050";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e2a50";
            }}
          >
            + New
          </button>
          {showCreateSuggestion && (
            <div style={styles.createSuggestion} onClick={handleCreateFromSearch}>
              <span style={styles.suggestionLabel}>
                Create workspace{" "}
                <span style={{ color: inlineColor, fontWeight: "600" }}>
                  "{searchQuery.trim()}"
                </span>
              </span>
              <div
                style={styles.suggestionColorPicker}
                onClick={(e) => e.stopPropagation()}
              >
                {NEW_WORKSPACE_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setInlineColor(c)}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      cursor: "pointer",
                      border: c === inlineColor ? "2px solid #eaeaf5" : "2px solid transparent",
                      transform: c === inlineColor ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.1s",
                    }}
                  />
                ))}
              </div>
              <button
                style={styles.suggestionCreateBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFromSearch();
                }}
              >
                Create
              </button>
              <span style={styles.suggestionHint}>Enter</span>
            </div>
          )}
        </div>
        {showCreatePanel && (
          <CreateWorkspacePanel
            onCreated={handleWorkspaceCreated}
            onClose={() => setShowCreatePanel(false)}
          />
        )}

        <div style={styles.contentArea}>
          {selectedWorkspace ? (
            <WorkspaceDetail
              workspace={selectedWorkspace}
              allWorkspaces={workspaces}
              isCurrent={selectedWorkspace.windowId === currentWindowId}
              onRefresh={loadData}
              triggerRename={renameTargetId === selectedWorkspace.id}
              onRenameHandled={() => setRenameTargetId(null)}
            />
          ) : selectedUntracked ? (
            <UntrackedWindowPanel
              window={selectedUntracked}
              onAssigned={async () => {
                await loadData();
                setSelectedUntrackedId(null);
              }}
            />
          ) : workspaces.length === 0 && untrackedWindows.length === 0 ? (
            <EmptyState
              variant="welcome"
              onCreateWorkspace={() => setShowCreatePanel(true)}
            />
          ) : workspaces.length === 0 && untrackedWindows.length > 0 ? (
            <EmptyState
              variant="untracked-hint"
              untrackedCount={untrackedWindows.length}
              onCreateWorkspace={() => setShowCreatePanel(true)}
            />
          ) : (
            <EmptyState variant="no-selection" />
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

      {showHelpOverlay && (
        <KeyboardShortcutsHelp onClose={() => setShowHelpOverlay(false)} />
      )}
    </div>
  );
}
