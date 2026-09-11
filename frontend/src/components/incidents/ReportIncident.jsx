import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, AlertTriangle, X, WifiOff } from 'lucide-react';
import { createIncidentWithAI, classifyImage } from '../../data/api';
import { saveToOfflineQueue } from '../../data/offlineQueue';
import { useTranslation } from 'react-i18next';
import './Incidents.css';

const NER_STATES_DISTRICTS = {
  'Assam': ['Golaghat', 'Sonitpur', 'Cachar', 'Kamrup', 'Dibrugarh', 'Jorhat', 'Tinsukia', 'Nagaon'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Mon', 'Wokha', 'Zunheboto'],
  'Manipur': ['Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya': ['East Khasi Hills', 'West Garo Hills', 'Ri-Bhoi', 'South West Khasi Hills'],
  'Mizoram': ['Aizawl', 'Kolasib', 'Lunglei', 'Champhai', 'Serchhip'],
  'Tripura': ['West Tripura', 'South Tripura', 'Dhalai', 'North Tripura'],
  'Arunachal Pradesh': ['Papum Pare', 'East Siang', 'West Kameng', 'Lower Dibang Valley', 'Tawang'],
  'Sikkim': ['East Sikkim', 'West Sikkim', 'North Sikkim', 'South Sikkim'],
};

export function ReportIncident() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, name: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'road_block',
    severity: 'medium',
    district: '',
    state: '',
  });
  const { t } = useTranslation();

  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Current Location'
        });
      },
      (err) => {
        console.error('Error capturing location:', err);
      }
    );
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);

      setAnalyzingImage(true);
      setImageAnalysis(null);
      try {
        const aiResult = await classifyImage(file);
        setImageAnalysis(aiResult);
        
        // Auto-populate form based on AI result
        setFormData(prev => ({
          ...prev,
          type: aiResult.damage_type === 'clear' ? 'road_damage' : aiResult.damage_type,
          severity: aiResult.severity
        }));
      } catch (err) {
        console.error("AI classification failed:", err);
      } finally {
        setAnalyzingImage(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      latitude: location.lat || 0,
      longitude: location.lng || 0,
      location_name: location.name,
      photo_url: imagePreview || null
    };

    try {
      // Use AI-powered submission for auto severity classification
      await createIncidentWithAI(payload);
      setSavedOffline(false);
      setSubmitted(true);
    } catch (err) {
      // If it's a network error, save to offline queue
      if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        try {
          await saveToOfflineQueue(payload);
          setSavedOffline(true);
          setSubmitted(true);
        } catch (queueErr) {
          alert('Could not save report offline: ' + queueErr.message);
        }
      } else {
        alert('Error submitting report: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.successContainer}>
        <div className="glass-panel" style={styles.successBox}>
          {savedOffline ? (
            <>
              <div style={styles.successIcon}><WifiOff size={48} color="var(--risk-medium)" /></div>
              <h2 style={{ color: 'var(--risk-medium)' }}>{t('report.saved_offline')}</h2>
              <p>{t('report.saved_offline_desc')}</p>
            </>
          ) : (
            <>
              <div style={styles.successIcon}>✅</div>
              <h2>{t('report.report_submitted')}</h2>
              <p>{t('report.report_submitted_desc')}</p>
            </>
          )}
          <button className="btn-primary" onClick={() => { setSubmitted(false); setSavedOffline(false); }} style={styles.button}>
            {t('report.submit_another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="incidents-page" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="var(--accent-primary)" size={32} />
          <div>
            <h2 className="page-title">{t('report.title')}</h2>
            <p className="page-subtitle">{t('report.subtitle')}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Location Section */}
        <div className="glass-panel" style={styles.section}>
          <div style={styles.sectionHeader}>
            <MapPin size={20} color="var(--accent-primary)" />
            <h3>{t('report.location')}</h3>
          </div>
          <div style={styles.locationInfo}>
            {location.lat ? (
              <p>📍 {location.name}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
            ) : (
              <p>{t('report.detecting')}</p>
            )}
            <button type="button" className="btn-secondary" onClick={captureLocation} style={styles.smallBtn}>
              {t('report.recapture')}
            </button>
          </div>
        </div>

        {/* Image Section */}
        <div className="glass-panel" style={styles.section}>
          <div style={styles.sectionHeader}>
            <Camera size={20} color="var(--accent-primary)" />
            <h3>{t('report.photo_evidence')}</h3>
          </div>
          <div style={styles.imageUploadArea}>
            {imagePreview ? (
              <div style={styles.previewContainer}>
                <img src={imagePreview} alt="Preview" style={styles.previewImage} />
                <button type="button" onClick={() => {setImage(null); setImagePreview(null); setImageAnalysis(null);}} style={styles.removeBtn}>
                  <X size={20} />
                </button>
                {analyzingImage && (
                  <div style={styles.aiBadgeAnalyzing}>
                    ⏳ AI analyzing photo...
                  </div>
                )}
                {imageAnalysis && !analyzingImage && (
                  <div style={styles.aiBadgeResult}>
                    🤖 <strong>AI Detected:</strong> {imageAnalysis.damage_type} ({imageAnalysis.severity} severity • {(imageAnalysis.confidence * 100).toFixed(0)}% conf)
                  </div>
                )}
              </div>
            ) : (
              <label style={styles.uploadLabel}>
                <Camera size={48} color="var(--text-muted)" />
                <span>{t('report.tap_to_capture')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="glass-panel" style={styles.section}>
          <div style={styles.sectionHeader}>
            <AlertTriangle size={20} color="var(--accent-primary)" />
            <h3>{t('report.incident_details')}</h3>
          </div>
          <div style={styles.inputGroup}>
            <label>{t('report.form_title')}</label>
            <input
              type="text"
              placeholder="e.g., Landslide on NH-29"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label>{t('report.form_desc')}</label>
            <textarea
              placeholder="Provide a brief description of the situation..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={styles.textarea}
            />
          </div>
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label>{t('report.type')}</label>
              <select
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={styles.input}
              >
                <option value="road_block">Road Block</option>
                <option value="landslide">Landslide</option>
                <option value="flood">Flood</option>
                <option value="bridge_issue">Bridge Issue</option>
                <option value="road_damage">Road Damage</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label>{t('report.severity')}</label>
              <select
                value={formData.severity}
                onChange={e => setFormData({...formData, severity: e.target.value})}
                style={styles.input}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label>{t('report.state')}</label>
              <select
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value, district: ''})}
                style={styles.input}
                required
              >
                <option value="">{t('report.select_state')}</option>
                {Object.keys(NER_STATES_DISTRICTS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label>{t('report.district')}</label>
              <select
                value={formData.district}
                onChange={e => setFormData({...formData, district: e.target.value})}
                style={styles.input}
                required
                disabled={!formData.state}
              >
                <option value="">{t('report.select_district')}</option>
                {formData.state && NER_STATES_DISTRICTS[formData.state]?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
          {loading ? t('report.sending') : (
            <>
              {t('report.submit')} <Send size={20} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
  },
  section: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    color: 'var(--text-primary)',
  },
  locationInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  imageUploadArea: {
    width: '100%',
    minHeight: '200px',
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeAnalyzing: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'var(--accent-primary)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backdropFilter: 'blur(4px)',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
  aiBadgeResult: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    backdropFilter: 'blur(4px)',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  input: {
    padding: '0.8rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
  },
  textarea: {
    padding: '0.8rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    minHeight: '100px',
    resize: 'vertical',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  submitBtn: {
    padding: '1.2rem',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
  },
  successContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-main)',
  },
  successBox: {
    padding: '3rem',
    textAlign: 'center',
    maxWidth: '400px',
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  button: {
    marginTop: '1.5rem',
    padding: '1rem 2rem',
    cursor: 'pointer',
  }
};
