import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.box}>
        <ShieldAlert size={64} color="var(--risk-high)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '2rem', color: 'var(--risk-high)', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          You do not have the required permissions to view this page.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-main)',
  },
  box: {
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '400px',
    border: '1px solid var(--risk-high)',
    boxShadow: '0 20px 40px rgba(255, 0, 0, 0.1)',
  }
};

export default Unauthorized;
