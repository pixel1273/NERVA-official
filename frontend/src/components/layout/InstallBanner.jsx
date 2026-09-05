import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useAuth } from '../../context/AuthContext';

/**
 * A dismissible install banner shown to ground staff users.
 * Only appears when the PWA can be installed (i.e. not already in standalone mode).
 */
export function InstallBanner() {
  const { canInstall, triggerInstall } = useInstallPrompt();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('nerva_install_dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('nerva_install_dismissed', 'true');
  };

  // Only show to staff + only when installable + not dismissed
  if (!canInstall || dismissed) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <Download size={20} color="var(--accent-primary)" />
        <div style={styles.text}>
          <strong>Install NERVA on your phone</strong>
          <span style={styles.subtitle}>Works offline — report incidents without internet</span>
        </div>
      </div>
      <div style={styles.actions}>
        <button onClick={triggerInstall} className="btn-primary" style={styles.installBtn}>
          Install
        </button>
        <button onClick={handleDismiss} style={styles.dismissBtn} aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(0, 255, 102, 0.08), rgba(134, 59, 255, 0.08))',
    borderBottom: '1px solid var(--border-color)',
    gap: '1rem',
    flexWrap: 'wrap',
    animation: 'slideDown 0.3s ease-out',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
    minWidth: '200px',
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.85rem',
    lineHeight: 1.3,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  installBtn: {
    padding: '0.4rem 1rem',
    fontSize: '0.8rem',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  dismissBtn: {
    padding: '0.25rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
