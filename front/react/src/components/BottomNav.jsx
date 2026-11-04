import React from 'react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      id: 'apps',
      label: 'Apps',
      badge: '3',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'shifts',
      label: 'Shifts',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav style={styles.bottomNav}>
      <div style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={styles.navButton}
            >
              {/* Icon Pill with Active State */}
              <div
                style={{
                  ...styles.iconWrapper,
                  backgroundColor: isActive ? '#ccfbf1' : 'transparent',
                  color: isActive ? '#0d9488' : '#64748b',
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0px)',
                  boxShadow: isActive ? '0 4px 12px rgba(13, 148, 136, 0.15)' : 'none',
                }}
              >
                {item.icon}

                {/* Optional Badge Indicator on Icon */}
                {item.badge && (
                  <span
                    style={{
                      ...styles.badgeDot,
                      backgroundColor: item.badge === 'LIVE' ? '#ef4444' : '#0d9488',
                    }}
                  />
                )}
              </div>

              {/* Active Label Style */}
              <span
                style={{
                  ...styles.label,
                  color: isActive ? '#0d9488' : '#64748b',
                  fontWeight: isActive ? '700' : '500',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid #e2e8f0',
    padding: '8px 12px 20px 12px',
    zIndex: 1000,
    boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.04)',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '550px',
    margin: '0 auto',
    width: '100%',
  },
  navButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    flex: 1,
    padding: '4px 0',
    WebkitTapHighlightColor: 'transparent',
  },
  iconWrapper: {
    position: 'relative',
    width: '52px',
    height: '32px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  badgeDot: {
    position: 'absolute',
    top: '4px',
    right: '12px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    border: '1.5px solid #ffffff',
  },
  label: {
    fontSize: '11px',
    letterSpacing: '-0.2px',
    transition: 'all 0.2s ease',
  },
};