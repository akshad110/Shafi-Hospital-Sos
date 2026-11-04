import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function HospitalSignup({ switchToLogin }) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    hospitalName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Backend ke fields ke mutabiq data bhejna
      await signup({
        hospitalName: formData.hospitalName,
        name: formData.hospitalName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        role: 'hospital'
      });
    } catch (err) {
      setError(err.message || 'Registration fail ho gayi. Kripya dobara try karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerBox}>
          <div style={styles.logoIcon}>⚡</div>
          <h2 style={styles.title}>New Hospital Registration</h2>
          <p style={styles.subtitle}>Join Shafi SOS & Get 7 Days Free Trial</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Hospital Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sunrise Women's Hospital"
              value={formData.hospitalName}
              onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Official Email *</label>
              <input
                type="email"
                required
                placeholder="admin@sunrisehosp.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+1 (555) 019-2831"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Hospital Address *</label>
            <input
              type="text"
              required
              placeholder="123 Health Ave, Los Angeles, CA"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Create Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? 'Creating Account...' : 'Complete Registration & Start Trial'}
          </button>
        </form>

        <div style={styles.footerText}>
          Pehle se account hai?{' '}
          <button onClick={switchToLogin} style={styles.linkBtn}>
            Login Here
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    padding: '32px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(13, 148, 136, 0.1)',
  },
  headerBox: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logoIcon: {
    fontSize: '28px',
    backgroundColor: '#ccfbf1',
    width: '56px',
    height: '56px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px auto',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#0d9488',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '14px',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  },
  footerText: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#0d9488',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
  },
};