import { useState, useEffect, useRef, useCallback, useMemo } from "preact/hooks";
import { Workspace, UntrackedWindow, NEW_WORKSPACE_COLORS } from "../shared/types";
import {
  getWorkspaceList,
  getUntrackedWindows,
  switchToWorkspace,
  saveWorkspaceToStorage,
  restoreWorkspace,
  deleteWorkspace,
  createWorkspace,
  toggleLock,
  toggleStar,
  panicRestoreAll,
} from "../shared/workspace-manager";
import { exportData, importData, exportAsBookmarksHtml, getStorageUsage, getAllWorkspaces } from "../shared/storage";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceDetail } from "./components/WorkspaceDetail";
import { UntrackedWindowPanel } from "./components/UntrackedWindowPanel";
import { CreateWorkspacePanel } from "./components/CreateWorkspacePanel";
import { BackupHistoryPanel } from "./components/BackupHistoryPanel";
import { CommandPalette, PaletteCommand } from "../popup/components/CommandPalette";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [storagePercent, setStoragePercent] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Live updates + storage usage + error listeners (single onChanged listener)
  useEffect(() => {
    getStorageUsage().then(u => setStoragePercent(u.percentUsed)).catch(() => {});

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.workspaces) {
        loadData();
      }
      if (changes._lastStorageError?.newValue) {
        setStorageError(changes._lastStorageError.newValue.message);
        setTimeout(() => setStorageError(null), 10000);
      }
      if (changes._storageWarning?.newValue) {
        setStoragePercent(changes._storageWarning.newValue.percentUsed);
      }
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
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    if (!window.confirm(`Delete workspace "${ws.name}"?`)) return;
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

  // Selection mode helpers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(workspaces.map((ws) => ws.id));
    setSelectedIds(allIds);
  }, [workspaces]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Mass action handlers
  const handleMassSave = useCallback(async () => {
    const activeSelected = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && ws.windowId !== null,
    );
    if (activeSelected.length === 0) return;
    if (!window.confirm(`Save & close ${activeSelected.length} active workspace(s)?`)) return;
    for (const ws of activeSelected) {
      await saveWorkspaceToStorage(ws.id);
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleMassRestore = useCallback(async () => {
    const savedSelected = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && ws.windowId === null,
    );
    if (savedSelected.length === 0) return;
    if (!window.confirm(`Restore ${savedSelected.length} workspace(s)?`)) return;
    for (const ws of savedSelected) {
      await restoreWorkspace(ws.id);
      // Small delay between restores to avoid overwhelming the browser
      if (savedSelected.length > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleMassDelete = useCallback(async () => {
    const deletable = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && ws.windowId === null && !ws.locked,
    );
    if (deletable.length === 0) return;
    for (const ws of deletable) {
      await deleteWorkspace(ws.id);
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleMassLock = useCallback(async () => {
    const targets = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && !ws.locked,
    );
    for (const ws of targets) {
      await toggleLock(ws.id);
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleMassUnlock = useCallback(async () => {
    const targets = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && ws.locked,
    );
    for (const ws of targets) {
      await toggleLock(ws.id);
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleMassStar = useCallback(async () => {
    const targets = workspaces.filter(
      (ws) => selectedIds.has(ws.id) && !ws.starred,
    );
    for (const ws of targets) {
      await toggleStar(ws.id);
    }
    clearSelection();
    await loadData();
  }, [workspaces, selectedIds, clearSelection]);

  const handleSaveAllActive = useCallback(async () => {
    const active = workspaces.filter((ws) => ws.windowId !== null);
    if (active.length === 0) return;
    if (!window.confirm(`Save & close all ${active.length} active workspace(s)?`)) return;
    for (const ws of active) {
      await saveWorkspaceToStorage(ws.id);
    }
    await loadData();
  }, [workspaces]);

  // Arrow key navigation
  const handleNavigateWorkspace = useCallback(
    (direction: "up" | "down") => {
      if (workspaces.length === 0) return;
      if (!selectedWorkspaceId) {
        handleSelectWorkspace(workspaces[0].id);
        return;
      }
      const idx = workspaces.findIndex((ws) => ws.id === selectedWorkspaceId);
      if (idx === -1) {
        handleSelectWorkspace(workspaces[0].id);
        return;
      }
      const nextIdx =
        direction === "up"
          ? (idx - 1 + workspaces.length) % workspaces.length
          : (idx + 1) % workspaces.length;
      handleSelectWorkspace(workspaces[nextIdx].id);
    },
    [workspaces, selectedWorkspaceId],
  );

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

  const handlePanicRestore = async () => {
    const all = await getAllWorkspaces();
    const saved = Object.values(all).filter(ws => ws.windowId === null);
    const tabCount = saved.reduce((sum, ws) => sum + ws.tabs.length, 0);

    if (saved.length === 0) {
      window.alert('No saved workspaces to restore.');
      return;
    }

    if (!window.confirm(
      `Restore ALL ${saved.length} saved workspaces as Chrome windows?\n\nThis will open ${saved.length} windows with ${tabCount} total tabs.`
    )) return;

    try {
      const result = await panicRestoreAll();
      await loadData();
      if (result.failed.length > 0) {
        window.alert(
          `Restored ${result.restored.length} workspaces (${result.totalTabs} tabs).\n\nFailed: ${result.failed.map(f => f.name).join(', ')}`
        );
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Panic restore failed');
    }
  };

  const handleExportBookmarks = async () => {
    const html = await exportAsBookmarksHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concise-bookmarks-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
      const ws = workspaces.find((w) => w.id === id);
      if (!ws) return;
      if (window.confirm(`Delete workspace "${ws.name}"?`)) {
        deleteWorkspace(id).then(() => {
          if (selectedWorkspaceId === id) {
            setSelectedWorkspaceId(null);
          }
          loadData();
        });
      }
    },
    onShowHelp: () => setShowHelpOverlay(true),
    // New shortcut handlers
    onToggleLock: (id: string) => {
      toggleLock(id).then(() => loadData());
    },
    onToggleStar: (id: string) => {
      toggleStar(id).then(() => loadData());
    },
    onFocusNotes: () => {
      notesRef.current?.focus();
    },
    onExport: handleExport,
    onToggleBackupHistory: () => setHistoryOpen((v) => !v),
    onNavigateWorkspace: handleNavigateWorkspace,
    onToggleSelectionMode: toggleSelectionMode,
    isSelectionMode: selectionMode,
    onSelectAll: selectAll,
    onSaveAllActive: handleSaveAllActive,
  });

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  // Command palette commands
  const paletteCommands: PaletteCommand[] = useMemo(() => [
    {
      name: "new",
      aliases: ["create"],
      description: "Create a new workspace",
      expectsArg: "text",
      execute: async (name?: string) => {
        if (!name?.trim()) {
          setShowCreatePanel(true);
          return;
        }
        const ws = await createWorkspace(name.trim(), "#4F46E5");
        setSelectedWorkspaceId(ws.id);
        await loadData();
      },
    },
    {
      name: "save",
      description: "Save the selected workspace",
      execute: async () => {
        if (selectedWorkspaceId) {
          const ws = workspaces.find((w) => w.id === selectedWorkspaceId);
          if (ws && ws.windowId !== null) {
            await saveWorkspaceToStorage(selectedWorkspaceId);
            await loadData();
          }
        }
      },
    },
    {
      name: "save-all",
      description: "Save all active workspaces",
      execute: handleSaveAllActive,
    },
    {
      name: "restore",
      description: "Restore a saved workspace",
      expectsArg: "workspace",
      execute: async (id?: string) => {
        if (id) {
          await restoreWorkspace(id);
          await loadData();
        }
      },
    },
    {
      name: "switch",
      description: "Switch to a workspace",
      expectsArg: "workspace",
      execute: async (id?: string) => {
        if (id) {
          await switchToWorkspace(id);
          await loadData();
        }
      },
    },
    {
      name: "delete",
      description: "Delete a saved workspace",
      expectsArg: "workspace",
      execute: async (id?: string) => {
        if (id) {
          const ws = workspaces.find((w) => w.id === id);
          if (ws && window.confirm(`Delete workspace "${ws.name}"?`)) {
            await deleteWorkspace(id);
            if (selectedWorkspaceId === id) setSelectedWorkspaceId(null);
            await loadData();
          }
        }
      },
    },
    {
      name: "import",
      description: "Import workspaces from a file",
      execute: () => {
        fileInputRef.current?.click();
      },
    },
    {
      name: "export",
      description: "Export all workspace data",
      execute: handleExport,
    },
    {
      name: "backup",
      aliases: ["history"],
      description: "Open backup history",
      execute: () => {
        setHistoryOpen(true);
      },
    },
    {
      name: "lock",
      description: "Toggle lock on selected workspace",
      execute: async () => {
        if (selectedWorkspaceId) {
          await toggleLock(selectedWorkspaceId);
          await loadData();
        }
      },
    },
    {
      name: "star",
      description: "Toggle star on selected workspace",
      execute: async () => {
        if (selectedWorkspaceId) {
          await toggleStar(selectedWorkspaceId);
          await loadData();
        }
      },
    },
    {
      name: "help",
      description: "Show keyboard shortcuts",
      execute: () => {
        setShowHelpOverlay(true);
      },
    },
    {
      name: "panic-restore",
      aliases: ["restore-all", "emergency"],
      description: "Restore ALL saved workspaces as Chrome windows",
      execute: handlePanicRestore,
    },
    {
      name: "export-bookmarks",
      aliases: ["bookmarks"],
      description: "Export all workspaces as browser bookmarks HTML",
      execute: handleExportBookmarks,
    },
  ], [selectedWorkspaceId, workspaces, handleSaveAllActive, handleExport, handlePanicRestore, handleExportBookmarks]);

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
      {storageError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          padding: '10px 16px', backgroundColor: '#dc2626', color: '#fff',
          fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{storageError}</span>
          <button onClick={() => setStorageError(null)} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px',
          }}>×</button>
        </div>
      )}
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
        onShowHistory={() => setHistoryOpen(true)}
        onShowHelp={() => setShowHelpOverlay(true)}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelectionMode={toggleSelectionMode}
        onToggleSelected={toggleSelected}
        onMassSave={handleMassSave}
        onMassRestore={handleMassRestore}
        onMassDelete={handleMassDelete}
        onMassLock={handleMassLock}
        onMassUnlock={handleMassUnlock}
        onMassStar={handleMassStar}
        storagePercent={storagePercent}
        onExportBookmarks={handleExportBookmarks}
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
          {historyOpen ? (
            <BackupHistoryPanel
              onClose={() => setHistoryOpen(false)}
              onRefresh={loadData}
            />
          ) : selectedWorkspace ? (
            <WorkspaceDetail
              workspace={selectedWorkspace}
              allWorkspaces={workspaces}
              isCurrent={selectedWorkspace.windowId === currentWindowId}
              onRefresh={loadData}
              triggerRename={renameTargetId === selectedWorkspace.id}
              onRenameHandled={() => setRenameTargetId(null)}
              notesRef={notesRef}
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
          commands={paletteCommands}
        />
      )}

      {showHelpOverlay && (
        <KeyboardShortcutsHelp onClose={() => setShowHelpOverlay(false)} />
      )}
    </div>
  );
}
