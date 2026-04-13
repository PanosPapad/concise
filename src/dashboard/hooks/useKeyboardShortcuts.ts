import { useEffect, useState, useCallback } from "preact/hooks";
import { Workspace } from "../../shared/types";

export interface ShortcutActions {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  isCommandPaletteOpen: boolean;
  onOpenCreatePanel: () => void;
  onCloseCreatePanel: () => void;
  isCreatePanelOpen: boolean;
  onSaveWorkspace: (id: string) => void;
  onSwitchWorkspace: (id: string) => void;
  onRestoreWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onShowHelp: () => void;
  // New shortcuts
  onToggleLock: (id: string) => void;
  onToggleStar: (id: string) => void;
  onFocusNotes: () => void;
  onExport: () => void;
  onToggleBackupHistory: () => void;
  onNavigateWorkspace: (direction: "up" | "down") => void;
  // Selection mode
  onToggleSelectionMode: () => void;
  isSelectionMode: boolean;
  onSelectAll: () => void;
  onSaveAllActive: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const inEditable = isEditableTarget(e.target);

      // Escape always works, even in inputs
      if (e.key === "Escape") {
        if (actions.isSelectionMode) {
          actions.onToggleSelectionMode();
          return;
        }
        if (showHelpOverlay) {
          setShowHelpOverlay(false);
          return;
        }
        if (actions.isCommandPaletteOpen) {
          actions.onCloseCommandPalette();
          return;
        }
        if (actions.isCreatePanelOpen) {
          actions.onCloseCreatePanel();
          return;
        }
        return;
      }

      // Cmd/Ctrl combos work even in inputs
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "s" && e.shiftKey) {
          e.preventDefault();
          actions.onSaveAllActive();
          return;
        }
        if (e.key === "s") {
          e.preventDefault();
          if (actions.selectedWorkspaceId) {
            const ws = actions.workspaces.find(
              (w) => w.id === actions.selectedWorkspaceId,
            );
            if (ws && ws.windowId !== null) {
              actions.onSaveWorkspace(actions.selectedWorkspaceId);
            }
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (actions.selectedWorkspaceId) {
            actions.onSwitchWorkspace(actions.selectedWorkspaceId);
          }
          return;
        }
        if (e.key === "n") {
          e.preventDefault();
          actions.onOpenCreatePanel();
          return;
        }
        if (e.key === "a" && actions.isSelectionMode) {
          e.preventDefault();
          actions.onSelectAll();
          return;
        }
        return;
      }

      // All remaining shortcuts are suppressed when in editable fields
      if (inEditable) return;

      if (e.key === "/") {
        e.preventDefault();
        actions.onOpenCommandPalette();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowHelpOverlay((v) => !v);
        return;
      }

      // Arrow key navigation
      if (e.key === "ArrowUp") {
        e.preventDefault();
        actions.onNavigateWorkspace("up");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        actions.onNavigateWorkspace("down");
        return;
      }

      // 1-9: select Nth workspace
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        const combined = actions.workspaces;
        if (idx < combined.length) {
          actions.onSelectWorkspace(combined[idx].id);
        }
        return;
      }

      // Selection mode toggle
      if (e.key === "m") {
        actions.onToggleSelectionMode();
        return;
      }

      // Single-key workspace actions (require selection)
      if (actions.selectedWorkspaceId) {
        const ws = actions.workspaces.find(
          (w) => w.id === actions.selectedWorkspaceId,
        );

        if (e.key === "d") {
          if (ws && ws.windowId === null) {
            actions.onDeleteWorkspace(actions.selectedWorkspaceId);
          }
          return;
        }

        if (e.key === "r") {
          if (ws && ws.windowId === null) {
            actions.onRestoreWorkspace(actions.selectedWorkspaceId);
          }
          return;
        }

        if (e.key === "l") {
          actions.onToggleLock(actions.selectedWorkspaceId);
          return;
        }

        if (e.key === "s") {
          actions.onToggleStar(actions.selectedWorkspaceId);
          return;
        }

        if (e.key === "n") {
          actions.onFocusNotes();
          return;
        }
      }

      if (e.key === "e") {
        actions.onExport();
        return;
      }

      if (e.key === "b") {
        actions.onToggleBackupHistory();
        return;
      }
    },
    [actions, showHelpOverlay],
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);

  return { showHelpOverlay, setShowHelpOverlay };
}
