import { NEW_WORKSPACE_COLORS } from "../../shared/types";

interface Props {
  name: string;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onCreate: () => void;
}

const styles = {
  container: {
    position: "absolute" as const,
    top: "100%",
    left: "0",
    right: "0",
    marginTop: "4px",
    backgroundColor: "#13132a",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    padding: "10px 14px",
    zIndex: "10",
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    cursor: "pointer",
  },
  label: {
    flex: "1",
    fontSize: "13px",
    color: "#6b6b88",
    minWidth: "0",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  nameHighlight: (color: string) => ({
    color: color,
    fontWeight: "600" as const,
  }),
  colorPicker: {
    display: "flex" as const,
    gap: "4px",
    alignItems: "center" as const,
    flexShrink: "0",
  },
  colorDot: (color: string, selected: boolean) => ({
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: color,
    cursor: "pointer",
    border: selected ? "2px solid #eaeaf5" : "2px solid transparent",
    transform: selected ? "scale(1.2)" : "scale(1)",
    transition: "transform 0.1s",
  }),
  createBtn: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4F46E5",
    color: "#eaeaf5",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: "0",
  },
  hint: {
    fontSize: "11px",
    color: "#50506a",
    flexShrink: "0",
  },
};

export function CreateSuggestionDropdown({
  name,
  selectedColor,
  onSelectColor,
  onCreate,
}: Props) {
  return (
    <div style={styles.container} onClick={onCreate}>
      <span style={styles.label}>
        Create workspace{" "}
        <span style={styles.nameHighlight(selectedColor)}>"{name}"</span>
      </span>
      <div
        style={styles.colorPicker}
        onClick={(e) => e.stopPropagation()}
      >
        {NEW_WORKSPACE_COLORS.map((c) => (
          <div
            key={c}
            onClick={() => onSelectColor(c)}
            style={styles.colorDot(c, c === selectedColor)}
          />
        ))}
      </div>
      <button
        style={styles.createBtn}
        onClick={(e) => {
          e.stopPropagation();
          onCreate();
        }}
      >
        Create
      </button>
      <span style={styles.hint}>Enter</span>
    </div>
  );
}
