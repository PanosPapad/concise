import { useState, useEffect } from "preact/hooks";
import { BackupEntry } from "../../shared/types";
import {
  getAllBackups,
  restoreFromBackup,
  restoreSingleWorkspaceFromBackup,
} from "../../shared/storage";

interface Props {
  onClose: () => void;
  onRefresh: () => void;
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "16px",
    marginBottom: "24px",
  },
  backBtn: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    border: "1px solid #1e2a50",
    backgroundColor: "transparent",
    color: "#6b6b88",
    cursor: "pointer",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#eaeaf5",
    margin: "0",
    flex: "1",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#6b6b88",
    fontSize: "14px",
  },
  backupList: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "12px",
  },
  backupCard: (isSelected: boolean) => ({
    backgroundColor: isSelected ? "#1c2545" : "#13132a",
    borderRadius: "10px",
    border: isSelected ? "1px solid #4F46E5" : "1px solid #1e2a50",
    overflow: "hidden" as const,
    cursor: "pointer",
  }),
  backupHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "14px 16px",
  },
  backupTime: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#eaeaf5",
  },
  backupMeta: {
    fontSize: "12px",
    color: "#6b6b88",
  },
  backupActions: {
    display: "flex" as const,
    gap: "8px",
    alignItems: "center" as const,
  },
  restoreAllBtn: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4F46E5",
    color: "#eaeaf5",
    cursor: "pointer",
  },
  previewSection: {
    borderTop: "1px solid #1e2a50",
    padding: "12px 16px",
  },
  previewTitle: {
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    color: "#6b6b88",
    letterSpacing: "0.8px",
    marginBottom: "8px",
  },
  workspaceRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "8px 0",
    borderBottom: "1px solid #1e2a5040",
  },
  workspaceInfo: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
  },
  workspaceDot: (color: string) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: "0",
  }),
  workspaceName: {
    fontSize: "13px",
    color: "#c0c0d0",
  },
  workspaceTabs: {
    fontSize: "11px",
    color: "#50506a",
  },
  restoreOneBtn: {
    padding: "4px 10px",
    fontSize: "11px",
    borderRadius: "6px",
    border: "1px solid #1e2a50",
    backgroundColor: "transparent",
    color: "#6b6b88",
    cursor: "pointer",
  },
};

function formatBackupTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupHistoryPanel({ onClose, onRefresh }: Props) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllBackups()
      .then((list) => {
        setBackups([...list].reverse());
      })
      .catch(console.error);
  }, []);

  const handleRestoreAll = async (timestamp: number) => {
    if (!window.confirm("Restore all workspaces from this backup? This will overwrite current data.")) return;
    setLoading(true);
    try {
      await restoreFromBackup(timestamp);
      onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreOne = async (workspaceId: string, timestamp: number) => {
    if (!window.confirm("Restore this workspace from backup?")) return;
    setLoading(true);
    try {
      await restoreSingleWorkspaceFromBackup(workspaceId, timestamp);
      onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClose}>
          Back
        </button>
        <h2 style={styles.title}>Backup History</h2>
      </div>

      {backups.length === 0 ? (
        <div style={styles.emptyState}>
          No backups yet. Backups are created automatically every 30 minutes.
        </div>
      ) : (
        <div style={styles.backupList}>
          {backups.map((backup) => {
            const isSelected = backup.timestamp === selectedTimestamp;
            const workspaceEntries = Object.entries(backup.workspaces);
            return (
              <div
                key={backup.timestamp}
                style={styles.backupCard(isSelected)}
                onClick={() =>
                  setSelectedTimestamp(
                    isSelected ? null : backup.timestamp,
                  )
                }
              >
                <div style={styles.backupHeader}>
                  <div>
                    <div style={styles.backupTime}>
                      {formatBackupTime(backup.timestamp)}
                    </div>
                    <div style={styles.backupMeta}>
                      {workspaceEntries.length} workspace
                      {workspaceEntries.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={styles.backupActions}>
                    <button
                      style={styles.restoreAllBtn}
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreAll(backup.timestamp);
                      }}
                    >
                      Restore All
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div style={styles.previewSection}>
                    <div style={styles.previewTitle}>Workspaces in backup</div>
                    {workspaceEntries.map(([id, ws]) => (
                      <div key={id} style={styles.workspaceRow}>
                        <div style={styles.workspaceInfo}>
                          <div style={styles.workspaceDot(ws.color)} />
                          <span style={styles.workspaceName}>{ws.name}</span>
                          <span style={styles.workspaceTabs}>
                            {ws.tabs.length} tab
                            {ws.tabs.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <button
                          style={styles.restoreOneBtn}
                          disabled={loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreOne(id, backup.timestamp);
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
