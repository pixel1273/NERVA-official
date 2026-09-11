import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Activity, ArrowLeft, Phone, Lock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Step 1
  const [phone, setPhone] = useState('');
  // Step 2
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  // Step 3
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [validationErrors, setValidationErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setValidationErrors({ phone: t('auth.errors.invalidPhone') });
      return;
    }
    setValidationErrors({});
    setLoading(true);

    try {
      // TODO backend: POST /api/auth/forgot-password { phone } → { otp_debug }
      await new Promise(resolve => setTimeout(resolve, 800));
      const demoOtp = '123456'; 
      showToast(`${t('auth.otpDemoNotice')}: ${demoOtp}`);
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < 6 && /^\d$/.test(pasted[i])) {
          newOtp[index + i] = pasted[i];
        }
      }
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex(val => val === '');
      if (nextEmpty !== -1) {
        otpRefs.current[nextEmpty].focus();
      } else {
        otpRefs.current[5].focus();
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setValidationErrors({ otp: t('auth.errors.invalidOtp') });
      return;
    }
    setValidationErrors({});
    setLoading(true);

    try {
      // TODO backend: POST /api/auth/verify-otp { phone, otp } → { success: true }
      await new Promise(resolve => setTimeout(resolve, 800));
      if (otpString !== '123456') {
        throw new Error('Invalid OTP');
      }
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const errs = {};
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = t('auth.errors.invalidPassword');
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = t('auth.errors.passwordMismatch');
    }
    setValidationErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setLoading(true);
    try {
      // TODO backend: POST /api/auth/reset-password { phone, otp, new_password }
      await new Promise(resolve => setTimeout(resolve, 800));
      
      showToast('Password reset successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowOrb1}></div>
      <div style={styles.glowOrb2}></div>

      {toast && (
        <div style={{...styles.toast, backgroundColor: toast.type === 'error' ? 'var(--risk-high)' : 'var(--accent-primary)', color: toast.type === 'error' ? 'white' : 'black'}}>
          {toast.message}
        </div>
      )}

      <div className="glass-panel" style={styles.loginBox}>
        <div style={styles.header}>
          <ShieldAlert size={40} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
          <h1 style={styles.title}>{t('auth.forgotPassword')}</h1>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <Phone size={18} style={styles.inputIcon} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.phone')}
                style={{...styles.input, borderColor: validationErrors.phone ? 'var(--risk-high)' : 'var(--border-color)'}}
                maxLength={10}
              />
            </div>
            {validationErrors.phone && <span style={styles.inlineError}>{validationErrors.phone}</span>}

            <button type="submit" className="btn-primary" style={styles.button} disabled={loading}>
              {loading ? <span style={styles.buttonContent}><Activity size={18} className="spin" /></span> : <span style={styles.buttonContent}>{t('auth.sendOtp')} <ArrowRight size={18} /></span>}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} style={styles.form}>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('auth.otpLabel')}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{...styles.otpBox, borderColor: validationErrors.otp ? 'var(--risk-high)' : 'var(--border-color)'}}
                />
              ))}
            </div>
            {validationErrors.otp && <span style={{...styles.inlineError, textAlign: 'center', display: 'block'}}>{validationErrors.otp}</span>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setStep(1)} style={styles.backButton}>
                <ArrowLeft size={18} />
              </button>
              <button type="submit" className="btn-primary" style={{...styles.button, flex: 1, marginTop: 0}} disabled={loading}>
                {loading ? <span style={styles.buttonContent}><Activity size={18} className="spin" /></span> : <span style={styles.buttonContent}>{t('auth.verify')} <CheckCircle size={18} /></span>}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                style={{...styles.input, borderColor: validationErrors.password ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.password && <span style={styles.inlineError}>{validationErrors.password}</span>}

            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPassword')}
                style={{...styles.input, borderColor: validationErrors.confirmPassword ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.confirmPassword && <span style={styles.inlineError}>{validationErrors.confirmPassword}</span>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{...styles.button, flex: 1, marginTop: 0}} disabled={loading}>
                {loading ? <span style={styles.buttonContent}><Activity size={18} className="spin" /></span> : <span style={styles.buttonContent}>Reset Password <CheckCircle size={18} /></span>}
              </button>
            </div>
          </form>
        )}

        <div style={styles.footer}>
          <p><Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Back to {t('auth.signInLink')}</Link></p>
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
  toast: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    zIndex: 100,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease-out forwards',
  },
  loginBox: {
    width: '100%',
    maxWidth: '400px',
    padding: '2rem',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    border: '1px solid rgba(0, 255, 102, 0.2)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    fontSize: '1.8rem',
    marginTop: '0.5rem',
    letterSpacing: '1px',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
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
  otpBox: {
    width: '48px',
    height: '56px',
    textAlign: 'center',
    fontSize: '1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  inlineError: {
    color: 'var(--risk-high)',
    fontSize: '0.8rem',
    marginTop: '-0.5rem',
    marginLeft: '0.5rem',
  },
  button: {
    marginTop: '0.5rem',
    padding: '1rem',
    fontSize: '1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid var(--accent-primary)',
    borderRadius: '8px',
  },
  backButton: {
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  errorBox: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid var(--risk-high)',
    borderRadius: '8px',
    color: 'var(--risk-high)',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    textAlign: 'center',
  }
};

export default ForgotPassword;
