import { useState } from "preact/hooks";
import { NEW_WORKSPACE_COLORS } from "../../shared/types";
import { createWorkspace } from "../../shared/workspace-manager";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const styles = {
  form: {
    padding: "10px",
    marginBottom: "8px",
    backgroundColor: "#16213e",
    borderRadius: "6px",
    border: "1px solid #0f3460",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  colorRow: {
    display: "flex",
    gap: "6px",
    margin: "8px 0",
  },
  colorDot: (color: string, selected: boolean) => ({
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: color,
    cursor: "pointer",
    border: selected ? "2px solid #e0e0e0" : "2px solid transparent",
    boxSizing: "border-box" as const,
  }),
  actions: {
    display: "flex",
    gap: "6px",
    justifyContent: "flex-end",
  },
  createBtn: (color: string) => ({
    fontSize: "11px",
    padding: "4px 12px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: color,
    color: "#e0e0e0",
    cursor: "pointer",
  }),
  cancelBtn: {
    fontSize: "11px",
    padding: "4px 12px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "transparent",
    color: "#8888a0",
    cursor: "pointer",
  },
};

export function CreateWorkspace({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NEW_WORKSPACE_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createWorkspace(trimmed, color);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.form}>
      <input
        style={styles.input}
        type="text"
        placeholder="Workspace name"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <div style={styles.colorRow}>
        {NEW_WORKSPACE_COLORS.map((c) => (
          <div
            key={c}
            style={styles.colorDot(c, c === color)}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {error && (
        <div style={{ color: "#f87171", fontSize: "11px", marginBottom: "6px" }}>
          {error}
        </div>
      )}
      <div style={styles.actions}>
        <button style={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          style={styles.createBtn(color)}
          disabled={!name.trim() || submitting}
          onClick={handleCreate}
        >
          Create
        </button>
      </div>
    </div>
  );
}
