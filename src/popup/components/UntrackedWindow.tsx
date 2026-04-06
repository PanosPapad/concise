import { useState } from "preact/hooks";
import { UntrackedWindow as UntrackedWindowType, WORKSPACE_COLORS } from "../../shared/types";
import { createWorkspace } from "../../shared/workspace-manager";

interface Props {
  window: UntrackedWindowType;
  onAssigned: () => void;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const styles = {
  card: {
    padding: "8px 10px",
    marginBottom: "4px",
    backgroundColor: "#16213e",
    borderRadius: "6px",
    border: "1px dashed #0f3460",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  info: {
    flex: "1",
    minWidth: "0",
  },
  tabCount: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#c0c0d0",
  },
  preview: {
    fontSize: "10px",
    color: "#686880",
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  assignBtn: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#0f3460",
    color: "#e0e0e0",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
  },
  form: {
    marginTop: "8px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  input: {
    flex: "1",
    padding: "4px 8px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    outline: "none",
  },
  colorRow: {
    display: "flex",
    gap: "4px",
    marginTop: "6px",
  },
  colorDot: (color: string, selected: boolean) => ({
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: color,
    cursor: "pointer",
    border: selected ? "2px solid #e0e0e0" : "2px solid transparent",
    boxSizing: "border-box" as const,
  }),
  formActions: {
    display: "flex",
    gap: "4px",
    marginTop: "6px",
    justifyContent: "flex-end",
  },
  saveBtn: (color: string) => ({
    fontSize: "11px",
    padding: "3px 10px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: color,
    color: "#e0e0e0",
    cursor: "pointer",
  }),
  cancelBtn: {
    fontSize: "11px",
    padding: "3px 10px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "transparent",
    color: "#8888a0",
    cursor: "pointer",
  },
};

export function UntrackedWindowCard({ window: win, onAssigned }: Props) {
  const [assigning, setAssigning] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(WORKSPACE_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewTabs = win.tabs.slice(0, 3);
  const previewText = previewTabs
    .map((t) => t.title || getDomain(t.url))
    .join(", ");

  const handleAssign = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWorkspace(trimmed, color, win.windowId);
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <div style={styles.info}>
          <div style={styles.tabCount}>{win.tabs.length} tabs</div>
          <div style={styles.preview}>{previewText}</div>
        </div>
        {!assigning && (
          <button
            style={styles.assignBtn}
            onClick={() => setAssigning(true)}
          >
            Assign
          </button>
        )}
      </div>
      {assigning && (
        <div>
          <div style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Workspace name"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAssign();
                if (e.key === "Escape") setAssigning(false);
              }}
              autoFocus
            />
          </div>
          <div style={styles.colorRow}>
            {WORKSPACE_COLORS.map((c) => (
              <div
                key={c}
                style={styles.colorDot(c, c === color)}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          {error && (
            <div style={{ color: "#f87171", fontSize: "11px", marginTop: "4px" }}>
              {error}
            </div>
          )}
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={() => setAssigning(false)}>
              Cancel
            </button>
            <button
              style={styles.saveBtn(color)}
              disabled={!name.trim() || submitting}
              onClick={handleAssign}
            >
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
