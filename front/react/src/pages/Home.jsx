import React from 'react';

export default function Home() {
  const urgentShifts = [
    { id: 1, hospital: 'City General Hospital', time: 'Tonight, 11:00 PM - 7:00 AM', pay: '$42/hr', urgency: 'High Match' },
    { id: 2, hospital: 'St. Jude Medical Center', time: 'Tomorrow, 7:00 AM - 3:00 PM', pay: '$38/hr', urgency: 'Urgent SOS' },
  ];

  return (
    <div style={styles.container}>
      
      {/* Top Specialty & Status Badges */}
      <div style={styles.topBadgeRow}>
        <div style={styles.specialtyBadge}>
          ⚡ ICU SPECIALIST DUTY
        </div>
        <div style={styles.verifiedBadge}>
          ✓ Verified RN
        </div>
      </div>

      {/* Greeting Section */}
      <div style={styles.greetingSection}>
        <div>
          <h1 style={styles.greetingTitle}>Good morning, Sarah</h1>
        </div>
        <div style={styles.activeStatusBox}>
          <span style={styles.greenDot} />
          <span style={styles.activeStatusText}>Active RN • 88% Match</span>
        </div>
      </div>

      {/* Credential Health Card */}
      <div style={styles.credentialCard}>
        <div style={styles.credentialHeader}>
          <div style={styles.credentialTitleRow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={styles.credentialTitle}>Credential Health</span>
          </div>
          <span style={styles.credentialPercent}>85% Complete</span>
        </div>
        {/* Progress Bar */}
        <div style={styles.progressBarBg}>
          <div style={styles.progressBarFill} />
        </div>
        <div style={styles.credentialFooter}>
          <span style={styles.reminderText}>⚡ Next: Total ACLS renewal reminder</span>
          <span style={styles.updateLink}>Update &gt;</span>
        </div>
      </div>

      {/* Live Active Shift Card */}
      <div style={styles.liveShiftCard}>
        <div style={styles.liveShiftTopBar}>
          <div style={styles.timeBadgeRow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={styles.timeText}>07:00 – 19:00</span>
            <span style={styles.shiftTypeLabel}>(12h Shift)</span>
          </div>
          <div style={styles.startsInBadge}>
            <span style={styles.redDot} /> Starts in 42m
          </div>
        </div>

        <div style={styles.hospitalInfoBox}>
          <div style={styles.hospitalIcon}>🏥</div>
          <div style={styles.hospitalDetails}>
            <h3 style={styles.hospitalName}>St. Jude Memorial Hospital</h3>
            <p style={styles.hospitalSub}>Critical Care • ICU Ward (Floor 3)</p>
            <p style={styles.stationText}>📍 Bay 304-312 Station</p>
          </div>
        </div>

        <div style={styles.supervisorRow}>
          <div style={styles.supervisorInfo}>
            <div style={styles.supervisorAvatar}>DR</div>
            <div>
              <span style={styles.supervisorName}>Dr. Evelyn Reed</span>
              <span style={styles.supervisorRole}>Charge Nurse Supervisor</span>
            </div>
          </div>
          <div style={styles.actionIconsRow}>
            <button style={styles.actionIconButton}>📞</button>
            <button style={styles.actionIconButton}>💬</button>
          </div>
        </div>

        <button style={styles.gpsCheckInBtn}>
          📍 GPS Geofenced Check-In
        </button>
        <p style={styles.geofenceSubText}>Geofence locked. Within 150m of ER Entrance.</p>
      </div>

      {/* This Week's Momentum Section */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleRow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
          </svg>
          <h2 style={styles.sectionTitleText}>This Week's Momentum</h2>
        </div>
        <span style={styles.activePeakTag}>Active Peak</span>
      </div>

      <div style={styles.momentumGrid}>
        <div style={styles.momentumCard}>
          <span style={styles.cardSmallLabel}>CONFIRMED SHIFTS</span>
          <div style={styles.cardLargeValue}>3 <span style={styles.cardSubValue}>/ 36 hrs</span></div>
          <div style={styles.shiftDotsRow}>
            <span style={styles.dotActive} />
            <span style={styles.dotActive} />
            <span style={styles.dotActive} />
            <span style={styles.dotInactive} />
            <span style={styles.dotInactive} />
          </div>
        </div>

        <div style={styles.momentumCard}>
          <span style={styles.cardSmallLabel}>EST. WEEK PAYOUT</span>
          <div style={styles.cardLargeValue}>$2,180 <span style={styles.cardSubValue}>.00</span></div>
          <div style={styles.trendGreen}>↗ +$830 vs last week</div>
        </div>
      </div>

      {/* Urgent SOS Vacancies */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitleText}>Urgent SOS Vacancies</h2>
          <span style={styles.hotBadge}>HOT</span>
        </div>
        <span style={styles.seeAllLink}>See 14 more &gt;</span>
      </div>

      {/* Vacancy Card 1 */}
      <div style={styles.vacancyCard}>
        <div style={styles.vacancyCardTop}>
          <div>
            <h3 style={styles.vacancyTitle}>Critical Care RN</h3>
            <p style={styles.vacancyHospital}>Kypto General Hospital</p>
          </div>
          <div style={styles.payRateBox}>
            <span style={styles.payRateBig}>$68<span style={styles.payRateUnit}>/hr</span></span>
            <span style={styles.overtimeTag}>Overtime Eligible</span>
          </div>
        </div>
        <div style={styles.vacancyTagsRow}>
          <span style={styles.tagRed}>⚡ 2 Urgent Spots</span>
          <span style={styles.tagGrey}>📍 2.1 mi away</span>
          <span style={styles.tagGrey}>🛡️ Bay (304)</span>
        </div>
        <div style={styles.vacancyCardFooter}>
          <span style={styles.matchText}>⚡ Auto-credential match: <strong style={{color:'#0f172a'}}>88%</strong></span>
          <button style={styles.quickApplyBtn}>Quick Apply ⚡</button>
        </div>
      </div>

      {/* Vacancy Card 2 */}
      <div style={styles.vacancyCard}>
        <div style={styles.vacancyCardTop}>
          <div>
            <h3 style={styles.vacancyTitle}>Emergency Room Nurse (Night)</h3>
            <p style={styles.vacancyHospital}>Highland Medical Center</p>
          </div>
          <div style={styles.payRateBox}>
            <span style={styles.payRateBig}>$72<span style={styles.payRateUnit}>/hr</span></span>
            <span style={styles.overtimeTag}>+ $15 Night Diff</span>
          </div>
        </div>
        <div style={styles.vacancyTagsRow}>
          <span style={styles.tagCyan}>⚡ 1 Vacancy</span>
          <span style={styles.tagGrey}>📍 5.7 mi away</span>
          <span style={styles.tagGrey}>🌙 Night (19:00 - 07:00)</span>
        </div>
        <div style={styles.vacancyCardFooter}>
          <span style={styles.matchText}>🔥 Instant SOS Booking</span>
          <button style={styles.quickApplyBtn}>Quick Apply ⚡</button>
        </div>
      </div>

      {/* Pending Signature Banner */}
      <div style={styles.pendingCard}>
        <div style={styles.pendingLeft}>
          <div style={styles.pendingIconBox}>
            <span style={styles.redDotAbsolute} />
            📝
          </div>
          <div>
            <h4 style={styles.pendingTitle}>1 Offer Pending Signature</h4>
            <p style={styles.pendingSub}>2 under clinical peer review</p>
          </div>
        </div>
        <button style={styles.reviewBtn}>Review &gt;</button>
      </div>

      {/* Unit Briefing & Hospital Map */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitleText}>Unit Briefing &amp; Hospital Map</h2>
        </div>
        <span style={styles.seeAllLink}>Floor 3 Layout</span>
      </div>

      <div style={styles.mapBannerCard}>
        <div style={styles.mapOverlayContent}>
          <span style={styles.mapSubTag}>ST. JUDE ICU WING 3</span>
          <h3 style={styles.mapTitle}>Triage Pod</h3>
          <p style={styles.mapBedText}>B • Bed 304</p>
        </div>
        <button style={styles.mapButton}>
          📍 Pinpointing
        </button>
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    boxSizing: 'border-box',
    paddingBottom: '40px',
  },
  topBadgeRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  specialtyBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '8px',
    letterSpacing: '0.4px',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    fontSize: '11px',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '8px',
  },
  greetingSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  activeStatusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  greenDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  redDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
  },
  redDotAbsolute: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    border: '1.5px solid #ffffff',
  },
  credentialCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '22px 24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  credentialHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  credentialTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
  },
  credentialPercent: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#2563eb',
  },
  progressBarBg: {
    width: '100%',
    height: '9px',
    backgroundColor: '#f1f5f9',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '85%',
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '5px',
  },
  credentialFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  reminderText: {
    color: '#64748b',
    fontWeight: '500',
  },
  updateLink: {
    color: '#2563eb',
    fontWeight: '700',
    cursor: 'pointer',
  },
  liveShiftCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    border: '1.5px solid #2563eb',
    boxShadow: '0 12px 30px -8px rgba(37, 99, 235, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  liveShiftTopBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timeText: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0f172a',
  },
  shiftTypeLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  startsInBadge: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '700',
    padding: '5px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  hospitalInfoBox: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  hospitalIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
  },
  hospitalDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  hospitalName: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  hospitalSub: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
  },
  stationText: {
    fontSize: '13px',
    color: '#2563eb',
    fontWeight: '600',
    margin: '3px 0 0 0',
  },
  supervisorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1px solid #f1f5f9',
  },
  supervisorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  supervisorAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supervisorName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    display: 'block',
  },
  supervisorRole: {
    fontSize: '12px',
    color: '#64748b',
  },
  actionIconsRow: {
    display: 'flex',
    gap: '10px',
  },
  actionIconButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  gpsCheckInBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    padding: '15px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 6px 16px rgba(30, 58, 138, 0.25)',
  },
  geofenceSubText: {
    fontSize: '12px',
    color: '#16a34a',
    textAlign: 'center',
    fontWeight: '600',
    margin: '-8px 0 0 0',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionTitleText: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  activePeakTag: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  hotBadge: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '11px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  seeAllLink: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#2563eb',
    cursor: 'pointer',
  },
  momentumGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  momentumCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardSmallLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  cardLargeValue: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
  },
  shiftDotsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },
  dotActive: {
    width: '24px',
    height: '6px',
    backgroundColor: '#2563eb',
    borderRadius: '3px',
  },
  dotInactive: {
    width: '24px',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
  },
  trendGreen: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#16a34a',
    marginTop: '6px',
  },
  vacancyCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '22px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  },
  vacancyCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vacancyTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 3px 0',
  },
  vacancyHospital: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  payRateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  payRateBig: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#16a34a',
  },
  payRateUnit: {
    fontSize: '12px',
    fontWeight: '600',
  },
  overtimeTag: {
    fontSize: '11px',
    color: '#2563eb',
    fontWeight: '700',
  },
  vacancyTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tagRed: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  tagCyan: {
    backgroundColor: '#ecfeff',
    color: '#0891b2',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  tagGrey: {
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  vacancyCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '14px',
  },
  matchText: {
    fontSize: '13px',
    color: '#64748b',
  },
  quickApplyBtn: {
    backgroundColor: '#047857',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(4, 120, 87, 0.2)',
  },
  pendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '18px 24px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  },
  pendingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  pendingIconBox: {
    position: 'relative',
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#ecfeff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  pendingTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 3px 0',
  },
  pendingSub: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  reviewBtn: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
  },
  mapBannerCard: {
    position: 'relative',
    height: '160px',
    borderRadius: '16px',
    backgroundColor: '#1e293b',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.85)), url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80")',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
  },
  mapOverlayContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    zIndex: 2,
  },
  mapSubTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#93c5fd',
    letterSpacing: '0.5px',
  },
  mapTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
  },
  mapBedText: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: 0,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    zIndex: 2,
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },
};