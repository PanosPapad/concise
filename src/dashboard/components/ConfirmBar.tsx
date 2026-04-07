import { useState, useEffect, useRef } from "preact/hooks";

interface ConfirmBarProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
}

const styles = {
  container: (visible: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    background: "#1a1020",
    border: "1px solid #3a1a2a",
    borderRadius: "8px",
    padding: "10px 16px",
    opacity: visible ? "1" : "0",
    transform: visible ? "translateY(0)" : "translateY(-6px)",
    transition: "all 0.15s ease",
  }),
  message: {
    flex: "1",
    fontSize: "13px",
    fontWeight: "500",
    color: "#c0c0d0",
  } as Record<string, string>,
  cancelBtn: {
    padding: "7px 16px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "1px solid #2a3a60",
    backgroundColor: "transparent",
    color: "#c0c0d0",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  confirmBtn: (color: string) => ({
    padding: "7px 16px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: color,
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  }),
};

export function ConfirmBar({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmColor = "#DC2626",
}: ConfirmBarProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger slide-down animation on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onCancel();
    }, 5000);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onCancel]);

  const handleConfirm = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    onConfirm();
  };

  const handleCancel = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    onCancel();
  };

  return (
    <div style={styles.container(visible)}>
      <span style={styles.message}>{message}</span>
      <button style={styles.cancelBtn} onClick={handleCancel}>
        Cancel
      </button>
      <button style={styles.confirmBtn(confirmColor)} onClick={handleConfirm}>
        {confirmLabel}
      </button>
    </div>
  );
}
