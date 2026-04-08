type EmptyStateProps =
  | {
      variant: 'welcome';
      onCreateWorkspace: () => void;
      untrackedCount?: never;
      isActive?: boolean;
    }
  | {
      variant: 'untracked-hint';
      onCreateWorkspace: () => void;
      untrackedCount?: number;
      isActive?: boolean;
    }
  | {
      variant: 'no-selection' | 'no-tabs';
      onCreateWorkspace?: never;
      untrackedCount?: never;
      isActive?: boolean;
    };

const styles = {
  wrapper: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: '100%',
    gap: '12px',
    textAlign: 'center' as const,
    padding: '24px',
  },
  heading: (size: number) => ({
    fontSize: `${size}px`,
    fontWeight: '600' as const,
    color: '#eaeaf5',
    margin: '0',
  }),
  sub: {
    fontSize: '14px',
    color: '#6b6b88',
    margin: '0',
  },
  hint: {
    fontSize: '13px',
    color: '#50506a',
    margin: '0',
  },
  hintSmall: {
    fontSize: '12px',
    color: '#50506a',
    margin: '0',
  },
  ctaPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.15s',
  },
  ctaGhost: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    borderRadius: '8px',
    border: '1px solid #2a3a60',
    backgroundColor: 'transparent',
    color: '#eaeaf5',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background-color 0.15s',
  },
  textMedium: {
    fontSize: '16px',
    color: '#6b6b88',
    margin: '0',
  },
};

function BrowserWindowsSvg() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginBottom: '8px' }}
    >
      {/* Back window */}
      <rect x="16" y="10" width="44" height="34" rx="4" stroke="#2a3a60" strokeWidth="1.5" fill="#13132a" />
      <line x1="16" y1="18" x2="60" y2="18" stroke="#2a3a60" strokeWidth="1.5" />
      <circle cx="22" cy="14" r="1.5" fill="#DC2626" />
      <circle cx="28" cy="14" r="1.5" fill="#D97706" />
      <circle cx="34" cy="14" r="1.5" fill="#059669" />

      {/* Front window */}
      <rect x="24" y="28" width="44" height="34" rx="4" stroke="#4F46E5" strokeWidth="1.5" fill="#0f0f1a" />
      <line x1="24" y1="36" x2="68" y2="36" stroke="#4F46E5" strokeWidth="1.5" />
      <circle cx="30" cy="32" r="1.5" fill="#DC2626" />
      <circle cx="36" cy="32" r="1.5" fill="#D97706" />
      <circle cx="42" cy="32" r="1.5" fill="#059669" />

      {/* Tab-like lines in front window */}
      <rect x="30" y="42" width="32" height="2" rx="1" fill="#1e2a50" />
      <rect x="30" y="48" width="24" height="2" rx="1" fill="#1e2a50" />
      <rect x="30" y="54" width="28" height="2" rx="1" fill="#1e2a50" />
    </svg>
  );
}

function ArrowLeftSvg() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginTop: '4px' }}
    >
      <path
        d="M10 6L4 12L10 18"
        stroke="#50506a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="#50506a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({ variant, untrackedCount, onCreateWorkspace, isActive }: EmptyStateProps) {
  if (variant === 'welcome') {
    return (
      <div style={styles.wrapper}>
        <BrowserWindowsSvg />
        <h2 style={styles.heading(24)}>Welcome to Concise</h2>
        <p style={styles.sub}>Organize your browser windows into named workspaces</p>
        <button
          style={styles.ctaPrimary}
          onClick={onCreateWorkspace}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4338CA';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4F46E5';
          }}
        >
          Create your first workspace
        </button>
        <p style={styles.hintSmall}>Or press Cmd/Ctrl+N</p>
      </div>
    );
  }

  if (variant === 'untracked-hint') {
    const plural = (untrackedCount ?? 0) !== 1 ? 's' : '';
    return (
      <div style={styles.wrapper}>
        <h2 style={styles.heading(20)}>
          You have {untrackedCount} untracked window{plural}
        </h2>
        <p style={styles.sub}>Give them names to organize your browsing</p>
        <ArrowLeftSvg />
        <p style={styles.hint}>Select an untracked window from the sidebar to assign it</p>
        <button
          style={styles.ctaGhost}
          onClick={onCreateWorkspace}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e2a50';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          Create workspace
        </button>
      </div>
    );
  }

  if (variant === 'no-selection') {
    return (
      <div style={styles.wrapper}>
        <p style={styles.textMedium}>Select a workspace from the sidebar</p>
        <p style={styles.hintSmall}>or press 1-9 to quickly select</p>
      </div>
    );
  }

  // variant === 'no-tabs'
  return (
    <div style={styles.wrapper}>
      <p style={styles.textMedium}>No tabs in this workspace</p>
      <p style={styles.hint}>
        {isActive
          ? "Open some tabs in this window — they'll appear here automatically"
          : 'This workspace was saved with no tabs'}
      </p>
    </div>
  );
}
