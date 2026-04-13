import { useState } from "preact/hooks";

export interface MassActionBarProps {
  selectedCount: number;
  activeSelectedCount: number;
  savedSelectedCount: number;
  hasLockedSelected: boolean;
  onSave: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onStar: () => void;
  onCancel: () => void;
}

const styles = {
  container: {
    backgroundColor: "#13132a",
    borderTop: "1px solid #1e2a50",
    padding: "10px 16px",
    flexShrink: "0",
    animation: "slideDown 0.15s ease-out",
  },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: "8px",
  },
  selectedLabel: {
    fontSize: "11px",
    fontWeight: "600" as const,
    color: "#a5b4fc",
    letterSpacing: "0.3px",
  },
  cancelBtn: {
    fontSize: "11px",
    background: "none",
    border: "none",
    color: "#6b6b88",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  actionRow: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  actionBtn: (color: string, disabled: boolean) => ({
    fontSize: "11px",
    padding: "4px 10px",
    borderRadius: "6px",
    border: `1px solid ${disabled ? "#1e2a50" : color}`,
    backgroundColor: disabled ? "transparent" : `${color}20`,
    color: disabled ? "#3a3a55" : color,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? "0.4" : "1",
    fontFamily: `system-ui, -apple-system, sans-serif`,
    transition: "background-color 0.15s",
  }),
  confirmRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
  },
  confirmLabel: {
    fontSize: "11px",
    color: "#DC2626",
    flex: "1",
  },
  confirmBtn: (danger: boolean) => ({
    fontSize: "11px",
    padding: "4px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: danger ? "#DC2626" : "transparent",
    color: danger ? "#eaeaf5" : "#6b6b88",
    cursor: "pointer",
    fontFamily: `system-ui, -apple-system, sans-serif`,
  }),
};

export function MassActionBar({
  selectedCount,
  activeSelectedCount,
  savedSelectedCount,
  hasLockedSelected,
  onSave,
  onRestore,
  onDelete,
  onLock,
  onUnlock,
  onStar,
  onCancel,
}: MassActionBarProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = () => {
    if (confirmingDelete) {
      onDelete();
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.selectedLabel}>{selectedCount} selected</span>
        <button
          style={styles.cancelBtn}
          onClick={onCancel}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#eaeaf5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#6b6b88";
          }}
        >
          Cancel
        </button>
      </div>
      {confirmingDelete ? (
        <div style={styles.confirmRow}>
          <span style={styles.confirmLabel}>
            Delete {savedSelectedCount} workspace{savedSelectedCount !== 1 ? "s" : ""}?
          </span>
          <button
            style={styles.confirmBtn(false)}
            onClick={() => setConfirmingDelete(false)}
          >
            No
          </button>
          <button style={styles.confirmBtn(true)} onClick={onDelete}>
            Delete
          </button>
        </div>
      ) : (
        <div style={styles.actionRow}>
          <button
            style={styles.actionBtn("#4F46E5", activeSelectedCount === 0)}
            disabled={activeSelectedCount === 0}
            onClick={onSave}
          >
            Save ({activeSelectedCount})
          </button>
          <button
            style={styles.actionBtn("#059669", savedSelectedCount === 0)}
            disabled={savedSelectedCount === 0}
            onClick={onRestore}
          >
            Restore ({savedSelectedCount})
          </button>
          <button
            style={styles.actionBtn("#DC2626", savedSelectedCount === 0)}
            disabled={savedSelectedCount === 0}
            onClick={handleDelete}
          >
            Delete
          </button>
          <button
            style={styles.actionBtn("#D97706", false)}
            onClick={onLock}
          >
            Lock
          </button>
          {hasLockedSelected && (
            <button
              style={styles.actionBtn("#6b6b88", false)}
              onClick={onUnlock}
            >
              Unlock
            </button>
          )}
          <button
            style={styles.actionBtn("#D97706", false)}
            onClick={onStar}
          >
            Star
          </button>
        </div>
      )}
    </div>
  );
}
