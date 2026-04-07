import { useState, useEffect, useRef } from "preact/hooks";
import { NEW_WORKSPACE_COLORS } from "../../shared/types";
import { createWorkspace } from "../../shared/workspace-manager";

interface Props {
  onCreated: (workspaceId: string) => void;
  onClose: () => void;
}

const styles = {
  panel: {
    backgroundColor: "#13132a",
    borderBottom: "1px solid #1e2a50",
    padding: "16px 24px",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    animation: "slideDown 0.15s ease-out",
  },
  nameInput: {
    flex: "1",
    padding: "8px 12px",
    fontSize: "13px",
    backgroundColor: "#0f0f1a",
    border: "1px solid #1e2a50",
    borderRadius: "6px",
    color: "#eaeaf5",
    outline: "none",
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    boxSizing: "border-box" as const,
  },
  nameInputError: {
    borderColor: "#DC2626",
  },
  colorPicker: {
    display: "flex" as const,
    gap: "6px",
    alignItems: "center" as const,
    flexShrink: "0" as const,
  },
  colorDot: (color: string, selected: boolean) => ({
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: color,
    cursor: "pointer",
    border: selected ? "2px solid #eaeaf5" : "2px solid transparent",
    transform: selected ? "scale(1.2)" : "scale(1)",
    transition: "transform 0.1s",
    flexShrink: "0" as const,
  }),
  createBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4F46E5",
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0" as const,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  },
  createBtnDisabled: {
    opacity: "0.5",
    cursor: "not-allowed",
  },
  cancelBtn: {
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "1px solid #2a3a60",
    backgroundColor: "transparent",
    color: "#6b6b88",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0" as const,
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  },
};

export function CreateWorkspacePanel({ onCreated, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(NEW_WORKSPACE_COLORS[0]);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    try {
      const ws = await createWorkspace(trimmed, color);
      onCreated(ws.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to create workspace",
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  const isEmpty = name.trim().length === 0;

  return (
    <div style={styles.panel}>
      <input
        ref={inputRef}
        style={{
          ...styles.nameInput,
          ...(error ? styles.nameInputError : {}),
        }}
        type="text"
        placeholder="Workspace name..."
        value={name}
        onInput={(e) => {
          setName((e.target as HTMLInputElement).value);
          setError(false);
        }}
        onKeyDown={handleKeyDown}
      />
      <div style={styles.colorPicker}>
        {NEW_WORKSPACE_COLORS.map((c) => (
          <div
            key={c}
            onClick={() => setColor(c)}
            style={styles.colorDot(c, c === color)}
          />
        ))}
      </div>
      <button
        style={{
          ...styles.createBtn,
          ...(isEmpty ? styles.createBtnDisabled : {}),
        }}
        onClick={handleCreate}
        disabled={isEmpty}
      >
        Create
      </button>
      <button style={styles.cancelBtn} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
