import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HospitalLogin from '../pages/HospitalLogin';
import HospitalSignup from '../pages/HospitalSignup';

export default function AuthMiddleware({ children }) {
  const { hospital, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' ya 'signup' toggle karne ke liye

  // 1. Check Loading State (Auth initialization check)
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Verifying Hospital Credentials...</p>
      </div>
    );
  }

  // 2. Unauthenticated Guard (Agar logged in nahi hai)
  if (!hospital) {
    return authMode === 'login' ? (
      <HospitalLogin switchToSignup={() => setAuthMode('signup')} />
    ) : (
      <HospitalSignup switchToLogin={() => setAuthMode('login')} />
    );
  }

  // 3. Authenticated Access (Logged in hone par main content dikhayega)
  return <>{children}</>;
}

// Styling for Loading Screen
const styles = {
  loadingContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: '12px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3.5px solid #ccfbf1',
    borderTop: '3.5px solid #0d9488',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '700',
    color: '#0d9488',
  },
};