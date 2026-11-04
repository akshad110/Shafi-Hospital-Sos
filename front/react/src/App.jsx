import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopBar from './components/Topbar';

import HospitalLogin from './pages/HospitalLogin';
import HospitalSignup from './pages/HospitalSignup';
import Home from './pages/Home';
import FindSOS from './pages/FindSOS';
import Applications from './pages/Applications';
import MyShifts from './pages/MyShifts';
import Profile from './pages/Profile';

// Main Dashboard Layout (Jab Hospital Logged-in hoga)
function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace('/', '') || 'home';

  const handleTabChange = (tabId) => {
    navigate(tabId === 'home' ? '/' : `/${tabId}`);
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      margin: 0,
      padding: 0,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Desktop Sidebar */}
        <Sidebar activeTab={currentPath} setActiveTab={handleTabChange} />

        {/* Content Area & Header Wrapper */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: '#f8fafc',
          position: 'relative',
          overflowY: 'auto'
        }}>
          
          {/* Header TopBar */}
          <TopBar />

          {/* Dynamic Protected Routes */}
          <div style={{
            flex: 1,
            paddingBottom: '100px',
            paddingTop: '24px',
            paddingLeft: '32px',
            paddingRight: '32px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/find" element={<FindSOS />} />
              <Route path="/apps" element={<Applications />} />
              <Route path="/shifts" element={<MyShifts />} />
              <Route path="/profile" element={<Profile />} />
              {/* Agar logged-in user galti se /login ya /signup khole toh wapas home bhej do */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Mobile Bottom Navigation */}
          <BottomNav activeTab={currentPath} setActiveTab={handleTabChange} />
          
        </div>
      </div>
    </div>
  );
}

// App Routes Manager (Auth & URL Routing)
function AppRoutes() {
  const { hospital, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <p style={{ fontWeight: 'bold', color: '#0d9488', fontSize: '14px' }}>Loading Shafi SOS Portal...</p>
      </div>
    );
  }

  // Agar Hospital logged-in nahi hai, toh URL ke hisab se Login ya Signup dikhao
  if (!hospital) {
    return (
      <Routes>
        <Route 
          path="/signup" 
          element={<HospitalSignup switchToLogin={() => navigate('/login')} />} 
        />
        <Route 
          path="*" 
          element={<HospitalLogin switchToSignup={() => navigate('/signup')} />} 
        />
      </Routes>
    );
  }

  // Agar logged-in hai, toh Dashboard Layout chalega
  return <DashboardLayout />;
}

// Root App Component
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}