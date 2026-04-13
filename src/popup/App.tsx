import { useState, useEffect, useRef } from "preact/hooks";
import { Workspace, UntrackedWindow } from "../shared/types";
import { getWorkspaceList, getUntrackedWindows, panicRestoreAll } from "../shared/workspace-manager";
import { exportData, importData, getAllWorkspaces } from "../shared/storage";
import { WorkspaceList } from "./components/WorkspaceList";
import { CreateWorkspace } from "./components/CreateWorkspace";
import { CommandPalette } from "./components/CommandPalette";

const styles = {
  container: {
    width: "360px",
    maxHeight: "500px",
    overflowY: "auto" as const,
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    position: "relative" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #0f3460",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
  },
  searchHint: {
    fontSize: "11px",
    color: "#555570",
    flex: "1",
    textAlign: "center" as const,
  },
  addButton: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid #0f3460",
    backgroundColor: "#16213e",
    color: "#e0e0e0",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  body: {
    padding: "8px 12px 12px",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px 12px",
    borderTop: "1px solid #0f3460",
  },
  footerBtn: {
    fontSize: "11px",
    padding: "4px 12px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "transparent",
    color: "#8888a0",
    cursor: "pointer",
  },
};

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [untrackedWindows, setUntrackedWindows] = useState<UntrackedWindow[]>([]);
  const [creating, setCreating] = useState(false);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const handlePanicRestore = async () => {
    const all = await getAllWorkspaces();
    const saved = Object.values(all).filter(ws => ws.windowId === null);
    const tabCount = saved.reduce((sum, ws) => sum + ws.tabs.length, 0);

    if (saved.length === 0) { window.alert('No saved workspaces to restore.'); return; }
    if (!window.confirm(`Restore ALL ${saved.length} saved workspaces (${tabCount} tabs) as Chrome windows?`)) return;

    try {
      const result = await panicRestoreAll();
      await loadData();
      if (result.failed.length > 0) {
        window.alert(`Restored ${result.restored.length}, failed: ${result.failed.map(f => f.name).join(', ')}`);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Panic restore failed');
    }
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
    // Reset input so the same file can be re-selected
    input.value = "";
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Concise</h1>
        {!paletteOpen && <span style={styles.searchHint}>/ to search</span>}
        <button
          style={styles.addButton}
          onClick={() => setCreating(!creating)}
          title={creating ? "Cancel" : "New workspace"}
        >
          {creating ? "\u00d7" : "+"}
        </button>
      </div>
      <div style={styles.body}>
        {creating && (
          <CreateWorkspace
            onCreated={() => {
              setCreating(false);
              loadData();
            }}
            onCancel={() => setCreating(false)}
          />
        )}
        <WorkspaceList
          workspaces={workspaces}
          untrackedWindows={untrackedWindows}
          currentWindowId={currentWindowId}
          onRefresh={loadData}
        />
      </div>
      <div style={styles.footer}>
        <button
          onClick={handlePanicRestore}
          title="Restore all saved workspaces as windows"
          style={{
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '4px',
            color: '#fca5a5',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Restore All
        </button>
        <button style={styles.footerBtn} onClick={handleExport}>
          Export
        </button>
        <button style={styles.footerBtn} onClick={handleImport}>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
      </div>
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
