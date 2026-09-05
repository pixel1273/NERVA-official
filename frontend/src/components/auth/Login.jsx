import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, Lock, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // FastAPI OAuth2PasswordRequestForm expects form-data
      const formDataBody = new FormData();
      formDataBody.append('username', formData.username);
      formDataBody.append('password', formData.password);

      const response = await fetch(`http://${window.location.hostname}:8000/api/auth/login`, {
        method: 'POST',
        body: formDataBody,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication failed. Please check your credentials.');
      }

      const data = await response.json();

      // Also fetch user profile to get the role
      const meResponse = await fetch(`http://${window.location.hostname}:8000/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const userData = await meResponse.json();

      login(data.access_token, userData);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowOrb1}></div>
      <div style={styles.glowOrb2}></div>

      <div className="glass-panel" style={styles.loginBox}>
        <div style={styles.header}>
          <ShieldAlert size={48} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
          <h1 style={styles.title}>
            NERVA <span className="text-glow">COMMAND</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Secure Access — Ground & Central Operations
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <User size={18} style={styles.inputIcon} />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Operator ID / Username"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Secure Password"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.buttonContent}>
                <Activity size={18} className="spin" /> Authenticating...
              </span>
            ) : (
              <span style={styles.buttonContent}>
                INITIALIZE SESSION <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p>UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.</p>
        </div>
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
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '50vw',
    height: '50vw',
    background: 'radial-gradient(circle, rgba(0, 255, 102, 0.08) 0%, transparent 60%)',
    zIndex: 0,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '40vw',
    height: '40vw',
    background: 'radial-gradient(circle, rgba(0, 255, 102, 0.05) 0%, transparent 60%)',
    zIndex: 0,
  },
  loginBox: {
    width: '100%',
    maxWidth: '420px',
    padding: '3rem 2rem',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    border: '1px solid rgba(0, 255, 102, 0.2)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '2rem',
    marginTop: '1rem',
    letterSpacing: '2px',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem 0.8rem 3rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  button: {
    marginTop: '1rem',
    padding: '1rem',
    fontSize: '1rem',
    letterSpacing: '1px',
    display: 'flex',
    justifyContent: 'center',
    border: '1px solid var(--accent-primary)',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  footer: {
    marginTop: '2.5rem',
    textAlign: 'center',
    fontSize: '0.7rem',
    color: 'var(--risk-high)',
    letterSpacing: '1px',
    opacity: 0.8,
  },
  errorBox: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid var(--risk-high)',
    borderRadius: '8px',
    color: 'var(--risk-high)',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
  }
};
