import { useRef, useEffect, useState } from "preact/hooks";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const menuStyles = {
  container: {
    position: "fixed" as const,
    zIndex: "9999",
    backgroundColor: "#1a1a2e",
    border: "1px solid #1e2a50",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    padding: "4px 0",
    minWidth: "160px",
  },
  item: (color: string, disabled: boolean, hovered: boolean) => ({
    padding: "8px 16px",
    fontSize: "13px",
    color: disabled ? color : color,
    opacity: disabled ? "0.4" : "1",
    cursor: disabled ? "default" : "pointer",
    backgroundColor: !disabled && hovered ? "#252545" : "transparent",
    userSelect: "none" as const,
    fontWeight: "normal" as const,
  }),
  divider: {
    height: "1px",
    backgroundColor: "#1e2a50",
    margin: "4px 0",
  },
};

function MenuItem({
  item,
  onClose,
}: {
  item: ContextMenuItem;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = item.color || "#eaeaf5";

  return (
    <div
      style={menuStyles.item(color, !!item.disabled, hovered)}
      onMouseEnter={() => {
        if (!item.disabled) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (item.disabled) return;
        item.onClick();
        onClose();
      }}
    >
      {item.label}
    </div>
  );
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Viewport clamping after first render
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (nx + rect.width > window.innerWidth) {
      nx = window.innerWidth - rect.width - 4;
    }
    if (ny + rect.height > window.innerHeight) {
      ny = window.innerHeight - rect.height - 4;
    }
    if (nx !== pos.x || ny !== pos.y) {
      setPos({ x: nx, y: ny });
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so we fire before anything else
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent default context menu on top of our menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return (
    <div
      ref={menuRef}
      style={{
        ...menuStyles.container,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div style={menuStyles.divider} />}
          <MenuItem item={item} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
