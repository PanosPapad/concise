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
        setShowHelpOverlay(true);
        return;
      }

      // 1-9: select Nth workspace
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        const active = actions.workspaces
          .filter((ws) => ws.windowId !== null)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const saved = actions.workspaces
          .filter((ws) => ws.windowId === null)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const combined = [...active, ...saved];
        if (idx < combined.length) {
          actions.onSelectWorkspace(combined[idx].id);
        }
        return;
      }

      if (e.key === "d") {
        if (actions.selectedWorkspaceId) {
          const ws = actions.workspaces.find(
            (w) => w.id === actions.selectedWorkspaceId,
          );
          if (ws && ws.windowId === null) {
            actions.onDeleteWorkspace(actions.selectedWorkspaceId);
          }
        }
        return;
      }

      if (e.key === "r") {
        if (actions.selectedWorkspaceId) {
          const ws = actions.workspaces.find(
            (w) => w.id === actions.selectedWorkspaceId,
          );
          if (ws && ws.windowId === null) {
            actions.onRestoreWorkspace(actions.selectedWorkspaceId);
          }
        }
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
