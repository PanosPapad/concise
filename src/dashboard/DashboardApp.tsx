import { useState, useEffect, useRef } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../shared/types";
import {
  getWorkspaceList,
  getUntrackedWindows,
  createWorkspace,
} from "../shared/workspace-manager";
import { exportData, importData } from "../shared/storage";
import { WORKSPACE_COLORS } from "../shared/types";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceDetail } from "./components/WorkspaceDetail";
import { CommandPalette } from "../popup/components/CommandPalette";

const styles = {
  container: {
    display: "flex" as const,
    width: "100%",
    height: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
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
    padding: "16px 24px",
    borderBottom: "1px solid #0f3460",
    backgroundColor: "#16213e",
    flexShrink: "0",
  },
  searchInput: {
    flex: "1",
    padding: "10px 14px",
    fontSize: "14px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #0f3460",
    borderRadius: "8px",
    color: "#e0e0e0",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  createBtn: {
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4F46E5",
    color: "#e0e0e0",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
  },
  createBtnHover: {
    backgroundColor: "#4338CA",
  },
  contentArea: {
    flex: "1",
    overflow: "auto" as const,
    padding: "24px",
  },
  emptyState: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: "100%",
    color: "#8888a0",
    fontSize: "15px",
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
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(WORKSPACE_COLORS[0]);
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
    a.download = `manama-backup-${date}.json`;
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

  const handleCreateWorkspace = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const ws = await createWorkspace(trimmed, newColor);
      setNewName("");
      setNewColor(WORKSPACE_COLORS[0]);
      setCreating(false);
      setSelectedWorkspaceId(ws.id);
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
        onSelect={setSelectedWorkspaceId}
        onRefresh={loadData}
        onExport={handleExport}
        onImport={handleImport}
      />

      <div style={styles.mainArea}>
        <div style={styles.topBar}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder='Search workspaces... (press "/" for command palette)'
            value={searchQuery}
            onInput={(e) =>
              setSearchQuery((e.target as HTMLInputElement).value)
            }
          />
          {creating ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                style={{
                  padding: "10px 14px",
                  fontSize: "13px",
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #0f3460",
                  borderRadius: "8px",
                  color: "#e0e0e0",
                  outline: "none",
                  width: "180px",
                }}
                type="text"
                placeholder="Workspace name"
                value={newName}
                onInput={(e) =>
                  setNewName((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateWorkspace();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
                autoFocus
              />
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                }}
              >
                {WORKSPACE_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      cursor: "pointer",
                      border:
                        c === newColor
                          ? "2px solid #e0e0e0"
                          : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
              <button
                style={styles.createBtn}
                onClick={handleCreateWorkspace}
              >
                Create
              </button>
              <button
                style={{
                  ...styles.createBtn,
                  backgroundColor: "transparent",
                  border: "1px solid #0f3460",
                }}
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              style={styles.createBtn}
              onClick={() => setCreating(true)}
            >
              + New Workspace
            </button>
          )}
        </div>

        <div style={styles.contentArea}>
          {selectedWorkspace ? (
            <WorkspaceDetail
              workspace={selectedWorkspace}
              isCurrent={selectedWorkspace.windowId === currentWindowId}
              onRefresh={loadData}
            />
          ) : (
            <div style={styles.emptyState}>
              Select a workspace from the sidebar
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
