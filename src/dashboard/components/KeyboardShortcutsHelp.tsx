import { useEffect, useRef } from "preact/hooks";

const mod = navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl";

interface ShortcutSection {
  title: string;
  shortcuts: { key: string; description: string }[];
}

const sections: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "↑ / ↓", description: "Move selection up / down" },
      { key: "1-9", description: "Jump to Nth workspace" },
      { key: "/", description: "Open command palette" },
    ],
  },
  {
    title: "Workspace Actions",
    shortcuts: [
      { key: "w", description: "Save selected workspace" },
      { key: `${mod}+Enter`, description: "Switch to workspace" },
      { key: "d", description: "Delete (saved only)" },
      { key: "r", description: "Restore (saved only)" },
      { key: "l", description: "Toggle lock" },
      { key: "s", description: "Toggle star" },
      { key: "n", description: "Focus notes" },
    ],
  },
  {
    title: "Batch Operations",
    shortcuts: [
      { key: "m", description: "Toggle selection mode" },
      { key: `${mod}+A`, description: "Select all (in selection mode)" },
      { key: "Shift+S", description: "Save all active" },
    ],
  },
  {
    title: "Panels & Tools",
    shortcuts: [
      { key: "b", description: "Backup history" },
      { key: "e", description: "Export data" },
      { key: "c", description: "New workspace" },
      { key: "?", description: "This help" },
      { key: "Esc", description: "Close / exit mode" },
    ],
  },
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
    maxWidth: "520px",
    width: "100%",
    background: "#13132a",
    border: "1px solid #1e2a50",
    borderRadius: "12px",
    padding: "24px 28px",
    color: "#eaeaf5",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600" as const,
    marginBottom: "20px",
    color: "#eaeaf5",
  },
  sectionTitle: {
    fontSize: "10px",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "1px",
    marginTop: "14px",
    marginBottom: "6px",
    paddingBottom: "4px",
    borderBottom: "1px solid #1e2a5060",
  },
  grid: {
    display: "grid" as const,
    gridTemplateColumns: "1fr 1fr",
    gap: "2px 24px",
  },
  row: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "4px 0",
  },
  kbd: {
    background: "#1e2a50",
    borderRadius: "4px",
    padding: "2px 6px",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#a5b4fc",
    whiteSpace: "nowrap" as const,
  },
  description: {
    fontSize: "12px",
    color: "#9ca3af",
    marginLeft: "12px",
  },
  hint: {
    fontSize: "11px",
    color: "#50506a",
    textAlign: "center" as const,
    marginTop: "16px",
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
        {sections.map((section) => (
          <div key={section.title}>
            <div style={styles.sectionTitle}>{section.title}</div>
            <div style={styles.grid}>
              {section.shortcuts.map((s) => (
                <div key={s.key} style={styles.row}>
                  <kbd style={styles.kbd}>{s.key}</kbd>
                  <span style={styles.description}>{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={styles.hint}>
          Press <kbd style={styles.kbd}>?</kbd> to toggle this help
        </div>
      </div>
    </div>
  );
}
