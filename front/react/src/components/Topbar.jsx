import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; // AuthContext import kiya hai

export default function TopBar() {
  const { hospital, logout } = useAuth();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  
  // Dropdown aur Logout Modal states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    // Outside click handler to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isMobile = windowWidth < 640;

  // Hospital ka naam ya fallback name
  const displayName = hospital?.hospitalName || hospital?.name || 'Hospital Admin';
  const displayEmail = hospital?.email || 'admin@hospital.com';
  // Initials for Avatar (jaise 'City General' -> 'CG')
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HA';
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <header style={styles.topBar(isMobile)}>
        {/* Left Section: Brand & Live Status */}
        <div style={styles.leftSection}>
          <div style={styles.badgeContainer}>
            <span style={styles.brandTitle(isMobile)}>Shafi SOS</span>
            <span style={styles.roleTag}>HOSPITAL PORTAL</span>
          </div>
          <div style={styles.liveIndicator}>
            <span style={styles.pulsingDot} />
            <span style={styles.liveText(isMobile)}>
              {isMobile ? 'Live' : 'Live Dispatch Active'}
            </span>
          </div>
        </div>

        {/* Right Section: Notification & User Profile */}
        <div style={styles.rightSection}>
          {/* Notification Bell Icon */}
          <button style={styles.iconButton} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span style={styles.notifBadge}>3</span>
          </button>

          {/* Worker Quick Status Avatar Box with Dropdown Trigger */}
          <div style={styles.profileWrapper} ref={dropdownRef}>
            <div 
              style={styles.workerProfileBox(isMobile)} 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div style={styles.avatar}>{getInitials(displayName)}</div>
              {!isMobile && (
                <div style={styles.workerInfo}>
                  <span style={styles.workerName}>{displayName}</span>
                  <span style={styles.workerCount}>Active Session</span>
                </div>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Interactive Dropdown Menu */}
            {dropdownOpen && (
              <div style={styles.dropdownMenu}>
                <div style={styles.dropdownHeader}>
                  <span style={styles.dropName}>{displayName}</span>
                  <span style={styles.dropEmail}>{displayEmail}</span>
                </div>
                <div style={styles.dropdownDivider} />
                
                <button 
                  style={styles.dropdownItem} 
                  onClick={() => { setDropdownOpen(false); alert('Profile page opened'); }}
                >
                  👤 Profile Settings
                </button>
                <button 
                  style={styles.dropdownItem} 
                  onClick={() => { setDropdownOpen(false); alert('System Settings opened'); }}
                >
                  ⚙️ App Settings
                </button>
                
                <div style={styles.dropdownDivider} />
                
                <button 
                  style={styles.dropdownLogoutItem} 
                  onClick={() => { setDropdownOpen(false); setShowLogoutConfirm(true); }}
                >
                  🚪 Logout Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalIconBox}>⚠️</div>
            <h3 style={styles.modalTitle}>Logout Confirmation</h3>
            <p style={styles.modalText}>Kya aap sach mein Shafi SOS Portal se logout karna chahte hain?</p>
            
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelBtn} 
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmLogoutBtn} 
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  topBar: (isMobile) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: isMobile ? '12px 16px' : '16px 28px',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px -2px rgba(13, 148, 136, 0.05)',
  }),
  leftSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  badgeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  brandTitle: (isMobile) => ({
    fontSize: isMobile ? '16px' : '20px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.5px',
  }),
  roleTag: {
    backgroundColor: '#ccfbf1',
    color: '#0f766e',
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.6px',
    border: '1px solid #99f6e4',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pulsingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
  },
  liveText: (isMobile) => ({
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: '600',
    color: '#0d9488',
    letterSpacing: '-0.1px',
  }),
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconButton: {
    position: 'relative',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  notifBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: '800',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
  },
  profileWrapper: {
    position: 'relative',
  },
  workerProfileBox: (isMobile) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8fafc',
    padding: isMobile ? '4px' : '6px 12px 6px 6px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
  }),
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    backgroundColor: '#ccfbf1',
    color: '#0f766e',
    fontWeight: '700',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(13, 148, 136, 0.15)',
  },
  workerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  workerName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 1.2,
    maxWidth: '140px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  workerCount: {
    fontSize: '11px',
    color: '#0d9488',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: '220px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '8px',
    zIndex: 1000,
  },
  dropdownHeader: {
    padding: '8px 12px',
  },
  dropName: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  dropEmail: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '6px 0',
  },
  dropdownItem: {
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  dropdownLogoutItem: {
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '28px',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalIconBox: {
    fontSize: '32px',
    backgroundColor: '#fef2f2',
    width: '60px',
    height: '60px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
  },
  modalText: {
    margin: '8px 0 20px 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.4,
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    padding: '10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};