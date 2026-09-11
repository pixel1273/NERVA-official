import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Activity, ArrowLeft, Phone, User, Lock, CheckCircle, MapPin, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
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
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    preferred_language: 'en',
    user_type: 'public'
  });

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
      // TODO backend: POST /api/auth/send-otp { phone } → { otp_debug }
      // Simulating API call
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
      // Handle paste
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

  const validateProfile = () => {
    const errs = {};
    if (profile.name.trim().length < 2) errs.name = t('auth.errors.required');
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(profile.username)) errs.username = t('auth.errors.invalidUsername');
    if (profile.password.length < 8 || !/[a-zA-Z]/.test(profile.password) || !/[0-9]/.test(profile.password)) {
      errs.password = t('auth.errors.invalidPassword');
    }
    if (profile.password !== profile.confirmPassword) {
      errs.confirmPassword = t('auth.errors.passwordMismatch');
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateProfile()) return;
    
    setLoading(true);
    try {
      const payload = {
        phone,
        otp: otp.join(''),
        name: profile.name,
        username: profile.username,
        password: profile.password,
        preferred_language: profile.preferred_language,
        user_type: profile.user_type
      };
      // call context register
      await register(payload);
      showToast('Account created successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Registration failed');
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
        
        {/* Wizard Progress */}
        <div style={styles.wizardContainer}>
          <div style={styles.wizardStep(step >= 1)}>{t('auth.step1')}</div>
          <div style={styles.wizardLine(step >= 2)}></div>
          <div style={styles.wizardStep(step >= 2)}>{t('auth.step2')}</div>
          <div style={styles.wizardLine(step >= 3)}></div>
          <div style={styles.wizardStep(step >= 3)}>{t('auth.step3')}</div>
        </div>

        <div style={styles.header}>
          <ShieldAlert size={40} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
          <h1 style={styles.title}>{t('auth.register')}</h1>
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
                  maxLength={6} // allow paste
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
          <form onSubmit={handleProfileSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                placeholder={t('auth.fullName')}
                style={{...styles.input, borderColor: validationErrors.name ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.name && <span style={styles.inlineError}>{validationErrors.name}</span>}

            <div style={styles.inputGroup}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                name="username"
                value={profile.username}
                onChange={(e) => setProfile({...profile, username: e.target.value})}
                placeholder={t('auth.username')}
                style={{...styles.input, borderColor: validationErrors.username ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.username && <span style={styles.inlineError}>{validationErrors.username}</span>}

            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                name="password"
                value={profile.password}
                onChange={(e) => setProfile({...profile, password: e.target.value})}
                placeholder={t('auth.password')}
                style={{...styles.input, borderColor: validationErrors.password ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.password && <span style={styles.inlineError}>{validationErrors.password}</span>}

            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                name="confirmPassword"
                value={profile.confirmPassword}
                onChange={(e) => setProfile({...profile, confirmPassword: e.target.value})}
                placeholder={t('auth.confirmPassword')}
                style={{...styles.input, borderColor: validationErrors.confirmPassword ? 'var(--risk-high)' : 'var(--border-color)'}}
              />
            </div>
            {validationErrors.confirmPassword && <span style={styles.inlineError}>{validationErrors.confirmPassword}</span>}

            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>
                {t('auth.preferredLanguage')}
              </label>
              <select 
                value={profile.preferred_language} 
                onChange={(e) => setProfile({...profile, preferred_language: e.target.value})}
                style={styles.select}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="as">অসমীয়া (Assamese)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="mni">মণিপুরী (Manipuri)</option>
                <option value="or">ଓଡ଼ିଆ (Odia)</option>
                <option value="brx">बड़ो (Bodo)</option>
                <option value="kha">Khasi</option>
              </select>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                {t('auth.userType')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div 
                  style={{...styles.radioCard, borderColor: profile.user_type === 'public' ? 'var(--accent-primary)' : 'var(--border-color)'}}
                  onClick={() => setProfile({...profile, user_type: 'public'})}
                >
                  <MapPin size={24} color={profile.user_type === 'public' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{t('auth.userTypePublic')}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auth.userTypePublicDesc')}</div>
                  </div>
                </div>
                
                <div 
                  style={{...styles.radioCard, borderColor: profile.user_type === 'driver' ? 'var(--accent-primary)' : 'var(--border-color)'}}
                  onClick={() => setProfile({...profile, user_type: 'driver'})}
                >
                  <Truck size={24} color={profile.user_type === 'driver' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{t('auth.userTypeDriver')}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auth.userTypeDriverDesc')}</div>
                  </div>
                </div>


              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{...styles.button, flex: 1, marginTop: 0}} disabled={loading}>
                {loading ? <span style={styles.buttonContent}><Activity size={18} className="spin" /> {t('auth.creatingAccount')}</span> : <span style={styles.buttonContent}>{t('auth.createAccount')}</span>}
              </button>
            </div>
          </form>
        )}

        <div style={styles.footer}>
          <p>{t('auth.hasAccount')} <Link to="/login" style={{ color: 'var(--accent-primary)' }}>{t('auth.signInLink')}</Link></p>
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
    maxWidth: '480px',
    padding: '2rem',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    border: '1px solid rgba(0, 255, 102, 0.2)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  wizardContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2rem',
    gap: '0.5rem',
  },
  wizardStep: (active) => ({
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
    padding: '0.3rem 0.8rem',
    borderRadius: '20px',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    backgroundColor: active ? 'rgba(0,255,102,0.1)' : 'transparent',
    transition: 'all 0.3s ease'
  }),
  wizardLine: (active) => ({
    height: '2px',
    width: '30px',
    backgroundColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
    transition: 'all 0.3s ease'
  }),
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
  select: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    outline: 'none',
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
  radioCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'rgba(255,255,255,0.02)',
    transition: 'all 0.2s ease',
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

export default Register;
