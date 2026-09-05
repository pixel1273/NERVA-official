import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Wifi, WifiOff, Camera, MapPin, CheckCircle, ChevronRight, Monitor, ExternalLink } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { getPendingCount, syncPendingReports } from '../../data/offlineQueue';
import { createIncidentWithAI } from '../../data/api';
import './InstallPage.css';

export function InstallPage() {
  const { canInstall, triggerInstall, isInstalled } = useInstallPrompt();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingReports(createIncidentWithAI);
      setPendingCount(prev => prev - result.synced);
      alert(`Synced ${result.synced} report(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
    } catch {
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="install-page">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Smartphone color="var(--accent-primary)" size={32} />
          <div>
            <h2 className="page-title">Get NERVA on Your Phone</h2>
            <p className="page-subtitle">Install the app for offline access and instant reporting</p>
          </div>
        </div>
      </header>

      {/* Status Cards */}
      <div className="install-status-grid">
        <div className="glass-panel install-status-card">
          <div className="status-icon-wrap" style={{ background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
            {isOnline ? <Wifi size={24} color="var(--risk-low)" /> : <WifiOff size={24} color="var(--risk-high)" />}
          </div>
          <div>
            <div className="status-label">Network</div>
            <div className="status-value" style={{ color: isOnline ? 'var(--risk-low)' : 'var(--risk-high)' }}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="glass-panel install-status-card">
          <div className="status-icon-wrap" style={{ background: isInstalled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }}>
            {isInstalled
              ? <CheckCircle size={24} color="var(--risk-low)" />
              : <Download size={24} color="var(--risk-medium)" />}
          </div>
          <div>
            <div className="status-label">App Status</div>
            <div className="status-value" style={{ color: isInstalled ? 'var(--risk-low)' : 'var(--risk-medium)' }}>
              {isInstalled ? 'Installed' : 'Not Installed'}
            </div>
          </div>
        </div>

        <div className="glass-panel install-status-card">
          <div className="status-icon-wrap" style={{ background: pendingCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: pendingCount > 0 ? 'var(--risk-medium)' : 'var(--risk-low)' }}>
              {pendingCount}
            </span>
          </div>
          <div>
            <div className="status-label">Pending Reports</div>
            <div className="status-value">
              {pendingCount > 0 ? (
                <button
                  className="btn-primary"
                  onClick={handleSync}
                  disabled={syncing || !isOnline}
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              ) : (
                <span style={{ color: 'var(--risk-low)' }}>All synced</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Install CTA */}
      {canInstall && (
        <div className="glass-panel install-cta">
          <div className="cta-content">
            <div className="cta-icon-pulse">
              <Download size={32} color="var(--accent-primary)" />
            </div>
            <div>
              <h3>Install NERVA App</h3>
              <p>Add to your home screen for instant access, offline reporting, and camera capture.</p>
            </div>
          </div>
          <button className="btn-primary install-cta-btn" onClick={triggerInstall}>
            <Download size={18} /> Install Now
          </button>
        </div>
      )}

      {isInstalled && (
        <div className="glass-panel install-cta" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="cta-content">
            <CheckCircle size={32} color="var(--risk-low)" />
            <div>
              <h3 style={{ color: 'var(--risk-low)' }}>App Installed ✓</h3>
              <p>NERVA is installed on your device. You can access it from your home screen.</p>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="install-features">
        <h3 className="features-title">What you get with the app</h3>
        <div className="features-grid">
          {[
            { icon: WifiOff, title: 'Offline Mode', desc: 'Report incidents even without internet. Reports sync automatically when you reconnect.' },
            { icon: Camera, title: 'Camera Capture', desc: 'Take photos of road damage, landslides, and flooding with GPS tagging.' },
            { icon: MapPin, title: 'GPS Location', desc: 'Automatic location capture for precise incident mapping and response.' },
            { icon: Smartphone, title: 'Native Experience', desc: 'Full-screen app experience — no browser bars, instant launch from home screen.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-panel feature-card">
              <Icon size={24} color="var(--accent-primary)" />
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Install Instructions */}
      <div className="glass-panel install-instructions">
        <h3>How to Install Manually</h3>
        <div className="instructions-list">
          <div className="instruction-step">
            <div className="step-number">1</div>
            <div>
              <strong>Open in Chrome</strong>
              <p>Visit this website on your Android phone using Google Chrome browser.</p>
            </div>
          </div>
          <div className="instruction-step">
            <div className="step-number">2</div>
            <div>
              <strong>Tap the menu ⋮</strong>
              <p>Tap the three-dot menu at the top-right of Chrome.</p>
            </div>
          </div>
          <div className="instruction-step">
            <div className="step-number">3</div>
            <div>
              <strong>Select "Add to Home screen"</strong>
              <p>Tap "Add to Home screen" or "Install app" from the menu.</p>
            </div>
          </div>
          <div className="instruction-step">
            <div className="step-number">4</div>
            <div>
              <strong>Done!</strong>
              <p>NERVA will appear as an app on your home screen. Launch it anytime — even offline.</p>
            </div>
          </div>
        </div>
      </div>

      {/* APK Download Section */}
      <div className="glass-panel install-apk-section">
        <div className="apk-content">
          <Monitor size={28} color="var(--accent-primary)" />
          <div>
            <h3>Prefer a native APK?</h3>
            <p>Download the NERVA APK file and install it directly on your Android device. No Play Store required.</p>
          </div>
        </div>
        <div className="apk-note">
          <span className="apk-badge">Coming Soon</span>
          <p>The APK will be available for download once the app is deployed to a production server with HTTPS.</p>
        </div>
      </div>
    </div>
  );
}
