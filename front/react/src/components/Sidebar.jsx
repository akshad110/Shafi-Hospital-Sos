import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // AuthContext import kiya hai

export default function Sidebar({ activeTab, setActiveTab }) {
  const { hospital, logout } = useAuth();
  const [hoveredTab, setHoveredTab] = useState(null);
  
  // Dropdown aur Logout Modal states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hospital details aur initials
  const displayName = hospital?.hospitalName || hospital?.name || 'Hospital Admin';
  const displayEmail = hospital?.email || 'admin@hospital.com';
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HA';
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      badge: null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'find',
      label: 'Find SOS',
      badge: 'LIVE',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      id: 'apps',
      label: 'Applications',
      badge: '3',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'shifts',
      label: 'My Shifts',
      badge: null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      badge: null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <aside style={styles.sidebar}>
        <div>
          {/* Brand Logo Section */}
          <div style={styles.logoContainer}>
            <div style={styles.logoIconBox}>
              <div style={styles.logoDot} />
              <span style={styles.logoBadgeText}>S</span>
            </div>
            <div style={styles.logoTextWrapper}>
              <span style={styles.logoTitle}>Shafi SOS</span>
              <span style={styles.logoSubtext}>Hospital Portal</span>
            </div>
          </div>

          {/* Navigation List */}
          <nav style={styles.navList}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;

              let bg = 'transparent';
              let textColor = '#64748b';
              let iconColor = '#94a3b8';

              if (isActive) {
                bg = '#f0fdf4';
                textColor = '#0d9488';
                iconColor = '#0d9488';
              } else if (isHovered) {
                bg = '#f8fafc';
                textColor = '#0f172a';
                iconColor = '#0f766e';
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    ...styles.navItem,
                    backgroundColor: bg,
                    color: textColor,
                    fontWeight: isActive ? '700' : '500',
                    boxShadow: isActive ? '0 2px 8px rgba(13, 148, 136, 0.08)' : 'none',
                  }}
                >
                  {isActive && <div style={styles.activeIndicator} />}
                  <span style={{ ...styles.iconWrapper, color: iconColor }}>{item.icon}</span>
                  <span style={styles.label}>{item.label}</span>

                  {item.badge && (
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: item.badge === 'LIVE' ? '#fee2e2' : '#e2e8f0',
                        color: item.badge === 'LIVE' ? '#dc2626' : '#334155',
                        border: item.badge === 'LIVE' ? '1px solid #fca5a5' : 'none',
                      }}
                    >
                      {item.badge === 'LIVE' && <span style={styles.livePulse} />}
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {/* Quick SOS Widget */}
          <div style={styles.sosCard}>
            <div style={styles.sosCardHeader}>
              <span style={styles.sosCardBadge}>⚡ Quick SOS</span>
              <span style={styles.sosStatusDot} />
            </div>
            <p style={styles.sosCardText}>Urgent hospital staffing requirement needed?</p>
            <button style={styles.sosCardBtn} onClick={() => setActiveTab('find')}>
              Find Immediate Shift
            </button>
          </div>

          {/* Bottom Profile Quick View with Dropdown Menu */}
          <div style={styles.profileWrapper} ref={dropdownRef}>
            <div 
              style={styles.bottomProfile} 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div style={styles.avatar}>{getInitials(displayName)}</div>
              <div style={styles.profileDetails}>
                <span style={styles.profileName}>{displayName}</span>
                <span style={styles.profileRole}>Hospital Account</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Sidebar Dropdown Menu */}
            {dropdownOpen && (
              <div style={styles.dropdownMenu}>
                <div style={styles.dropdownHeader}>
                  <span style={styles.dropName}>{displayName}</span>
                  <span style={styles.dropEmail}>{displayEmail}</span>
                </div>
                <div style={styles.dropdownDivider} />
                
                <button 
                  style={styles.dropdownItem} 
                  onClick={() => { setDropdownOpen(false); setActiveTab('profile'); }}
                >
                  👤 Profile Settings
                </button>
                <button 
                  style={styles.dropdownItem} 
                  onClick={() => { setDropdownOpen(false); alert('App Settings opened'); }}
                >
                  ⚙️ System Settings
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
      </aside>

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
  sidebar: {
    width: '270px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px 16px',
    boxSizing: 'border-box',
    flexShrink: 0,
    height: '100vh',
    position: 'sticky',
    top: 0,
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)',
    userSelect: 'none',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    paddingLeft: '6px',
  },
  logoIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '18px',
    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
    position: 'relative',
  },
  logoDot: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    border: '1.5px solid #ffffff',
  },
  logoTextWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 1.2,
  },
  logoSubtext: {
    fontSize: '11px',
    color: '#0d9488',
    fontWeight: '600',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  navItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13.5px',
    textAlign: 'left',
    transition: 'all 0.15s ease-in-out',
    width: '100%',
    boxSizing: 'border-box',
  },
  activeIndicator: {
    position: 'absolute',
    left: '0',
    top: '20%',
    height: '60%',
    width: '4px',
    backgroundColor: '#0d9488',
    borderRadius: '0 4px 4px 0',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  livePulse: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
  },
  sosCard: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #e6fffa 100%)',
    border: '1px solid #ccfbf1',
    borderRadius: '16px',
    padding: '14px',
    marginBottom: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sosCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sosCardBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0f766e',
  },
  sosStatusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  sosCardText: {
    margin: 0,
    fontSize: '11px',
    color: '#475569',
    lineHeight: 1.3,
  },
  sosCardBtn: {
    marginTop: '4px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    padding: '7px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
  },
  profileWrapper: {
    position: 'relative',
  },
  bottomProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
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
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  profileName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileRole: {
    fontSize: '11px',
    color: '#0d9488',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    left: 0,
    bottom: 'calc(100% + 8px)',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '8px',
    zIndex: 1000,
    boxSizing: 'border-box',
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