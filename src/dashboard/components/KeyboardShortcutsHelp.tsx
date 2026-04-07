import { useEffect, useRef } from "preact/hooks";

const shortcuts = [
  { key: "/", description: "Open command palette" },
  { key: "Esc", description: "Close overlay / panel" },
  { key: "1-9", description: "Select Nth workspace" },
  { key: "Ctrl+S", description: "Save selected workspace" },
  { key: "Ctrl+Enter", description: "Switch to selected workspace" },
  { key: "Ctrl+N", description: "New workspace" },
  { key: "d", description: "Delete selected (saved only)" },
  { key: "r", description: "Restore selected (saved only)" },
  { key: "?", description: "Show this help" },
];

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.85)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 9999,
  },
  card: {
    maxWidth: "400px",
    width: "100%",
    background: "#13132a",
    border: "1px solid #1e2a50",
    borderRadius: "12px",
    padding: "24px",
    color: "#eaeaf5",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600" as const,
    marginBottom: "16px",
    color: "#eaeaf5",
  },
  row: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "6px 0",
  },
  kbd: {
    background: "#1e2a50",
    borderRadius: "4px",
    padding: "2px 6px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#a5b4fc",
  },
  description: {
    fontSize: "13px",
    color: "#9ca3af",
  },
};

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div style={styles.overlay}>
      <div ref={cardRef} style={styles.card}>
        <div style={styles.title}>Keyboard Shortcuts</div>
        {shortcuts.map((s) => (
          <div key={s.key} style={styles.row}>
            <kbd style={styles.kbd}>{s.key}</kbd>
            <span style={styles.description}>{s.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
