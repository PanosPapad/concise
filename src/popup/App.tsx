import { useState, useEffect } from "preact/hooks";
import { Workspace } from "../shared/types";
import { getWorkspaceList } from "../shared/workspace-manager";
import { WorkspaceList } from "./components/WorkspaceList";
import { CreateWorkspace } from "./components/CreateWorkspace";

const styles = {
  container: {
    width: "360px",
    maxHeight: "500px",
    overflowY: "auto" as const,
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
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
};

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);

  const loadData = async () => {
    const list = await getWorkspaceList();
    setWorkspaces(list);
  };

  useEffect(() => {
    loadData();
    chrome.windows.getCurrent().then((win) => {
      setCurrentWindowId(win.id ?? null);
    });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Manama</h1>
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
          currentWindowId={currentWindowId}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}
