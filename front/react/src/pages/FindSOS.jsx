import React, { useState } from 'react';

export default function FindSOS() {
  const [shifts, setShifts] = useState([
    {
      id: 1,
      hospital: "Sunrise Women's Hospital",
      role: "Telemetry RN",
      rate: 68,
      shift: "Night (19:00 - 07:00)",
      date: "Nov 12, 2026",
      location: "Los Angeles, CA",
      urgency: "Urgent",
      bonus: "$100 Sign-on Bonus"
    },
    {
      id: 2,
      hospital: "Mercy General Hospital",
      role: "ICU Staff Nurse",
      rate: 78,
      shift: "Day (07:00 - 19:00)",
      date: "Nov 13, 2026",
      location: "San Francisco, CA",
      urgency: "Urgent",
      bonus: "$200 Emergency Bonus"
    },
    {
      id: 3,
      hospital: "Metro Health Center",
      role: "ER Nurse Specialist",
      rate: 72,
      shift: "Day (07:00 - 19:00)",
      date: "Nov 14, 2026",
      location: "San Jose, CA",
      urgency: "Normal",
      bonus: ""
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('hospital');
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState({
    hospital: '',
    role: '',
    rate: '',
    shiftType: 'Day (07:00 - 19:00)',
    date: '',
    location: '',
    urgency: 'Urgent',
    bonus: ''
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!formData.hospital || !formData.role || !formData.rate) {
      alert("Kripya zaroori details bharein!");
      return;
    }

    const newPost = {
      id: Date.now(),
      hospital: formData.hospital,
      role: formData.role,
      rate: Number(formData.rate),
      shift: formData.shiftType,
      date: formData.date || 'Immediate',
      location: formData.location || 'Main Branch',
      urgency: formData.urgency,
      bonus: formData.bonus
    };

    setShifts([newPost, ...shifts]);
    setIsModalOpen(false);
    setFormData({
      hospital: '',
      role: '',
      rate: '',
      shiftType: 'Day (07:00 - 19:00)',
      date: '',
      location: '',
      urgency: 'Urgent',
      bonus: ''
    });

    showToast("Shift post successfully upload ho gayi! 🎉");
  };

  const filteredShifts = shifts.filter(s => 
    s.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header - Full Width */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoArea}>
            <div style={styles.logoBox}>S</div>
            <div>
              <h1 style={styles.logoTitle}>Find SOS</h1>
              <p style={styles.logoSubtitle}>Healthcare Shift Marketplace</p>
            </div>
          </div>

          <div style={styles.roleSwitcher}>
            <button
              onClick={() => setUserRole('hospital')}
              style={{
                ...styles.roleBtn,
                ...(userRole === 'hospital' ? styles.roleBtnActive : {})
              }}
            >
              Hospital Mode
            </button>
            <button
              onClick={() => setUserRole('nurse')}
              style={{
                ...styles.roleBtn,
                ...(userRole === 'nurse' ? styles.roleBtnActive : {})
              }}
            >
              Nurse Mode
            </button>
          </div>
        </div>
      </header>

      {/* Main Body - Full Width */}
      <main style={styles.main}>
        {/* Banner */}
        <div style={styles.banner}>
          <span style={styles.badge}>⚡ Emergency Staffing Portal</span>
          <h2 style={styles.bannerTitle}>
            {userRole === 'hospital' ? 'Need Urgent Staffing Support?' : 'Find Emergency SOS Shifts'}
          </h2>
          <p style={styles.bannerText}>
            {userRole === 'hospital' 
              ? 'Naye shifts post karein aur turant qualified nurses hire karein.' 
              : 'High-pay emergency healthcare shifts browse karein aur apply karein.'}
          </p>
          {userRole === 'hospital' && (
            <button onClick={() => setIsModalOpen(true)} style={styles.bannerBtn}>
              + Post New Emergency Shift
            </button>
          )}
        </div>

        {/* Search & Actions */}
        <div style={styles.controlsRow}>
          <div>
            <h3 style={styles.sectionTitle}>Available Shifts</h3>
            <p style={styles.sectionSub}>{filteredShifts.length} requirements available</p>
          </div>
          {userRole === 'hospital' && (
            <button onClick={() => setIsModalOpen(true)} style={styles.primaryBtn}>
              + Post Shift
            </button>
          )}
        </div>

        <div style={styles.searchBoxContainer}>
          <input
            type="text"
            placeholder="Search hospital, role, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Shifts List */}
        <div style={styles.shiftsList}>
          {filteredShifts.length === 0 ? (
            <div style={styles.emptyState}>No shifts found matching your search.</div>
          ) : (
            filteredShifts.map((s) => (
              <div key={s.id} style={styles.shiftCard}>
                <div style={styles.cardTop}>
                  <div style={styles.cardLeft}>
                    <div style={styles.buildingIcon}>🏥</div>
                    <div>
                      <div style={styles.hospitalRow}>
                        <h4 style={styles.hospitalName}>{s.hospital}</h4>
                        {s.urgency === 'Urgent' && <span style={styles.urgentBadge}>URGENT SOS</span>}
                      </div>
                      <p style={styles.roleText}>{s.role}</p>
                    </div>
                  </div>
                  <div style={styles.cardRight}>
                    <span style={styles.rateText}>${s.rate}<span style={styles.rateHr}>/hr</span></span>
                    {s.bonus && <span style={styles.bonusBadge}>✨ {s.bonus}</span>}
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <span>🕒 {s.shift}</span>
                  <span>📍 {s.location}</span>
                  <span>📅 {s.date}</span>
                  <div>
                    {userRole === 'nurse' ? (
                      <button onClick={() => showToast(`Applied to ${s.hospital}!`)} style={styles.applyBtn}>
                        Apply Now &rarr;
                      </button>
                    ) : (
                      <span style={styles.postedByText}>Posted by You</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Post Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Post New Emergency Shift</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreatePost} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hospital Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City General Hospital"
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Role Needed *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU Staff Nurse"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={styles.inputField}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Hourly Rate ($/hr) *</label>
                  <input
                    type="number"
                    required
                    placeholder="75"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Shift Timing</label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
                    style={styles.inputField}
                  >
                    <option value="Day (07:00 - 19:00)">Day (07:00 - 19:00)</option>
                    <option value="Night (19:00 - 07:00)">Night (19:00 - 07:00)</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date & Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 15, Los Angeles"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Publish Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 100% Full Width Styles
const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '40px',
    boxSizing: 'border-box'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    zIndex: 1000,
    fontWeight: '600',
    fontSize: '13px'
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    padding: '14px 24px',
    boxSizing: 'border-box'
  },
  headerContent: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoBox: {
    width: '38px',
    height: '38px',
    backgroundColor: '#0d9488',
    color: '#fff',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '18px'
  },
  logoTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  logoSubtitle: {
    margin: 0,
    fontSize: '11px',
    color: '#0d9488'
  },
  roleSwitcher: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '10px',
    gap: '4px'
  },
  roleBtn: {
    border: 'none',
    background: 'transparent',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#64748b'
  },
  roleBtnActive: {
    backgroundColor: '#ffffff',
    color: '#0f766e',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  main: {
    width: '100%',
    padding: '24px 24px',
    boxSizing: 'border-box'
  },
  banner: {
    width: '100%',
    background: 'linear-gradient(135deg, #0d9488, #047857)',
    borderRadius: '20px',
    padding: '32px 28px',
    color: '#ffffff',
    marginBottom: '24px',
    boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.2)',
    boxSizing: 'border-box'
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600'
  },
  bannerTitle: {
    margin: '12px 0 6px 0',
    fontSize: '24px',
    fontWeight: '800'
  },
  bannerText: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.95
  },
  bannerBtn: {
    marginTop: '16px',
    backgroundColor: '#ffffff',
    color: '#047857',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  },
  controlsRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  sectionSub: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b'
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer'
  },
  searchBoxContainer: {
    width: '100%',
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff'
  },
  shiftsList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  emptyState: {
    width: '100%',
    textAlign: 'center',
    padding: '40px',
    background: '#fff',
    borderRadius: '16px',
    color: '#64748b',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  shiftCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    boxSizing: 'border-box'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px'
  },
  cardLeft: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start'
  },
  buildingIcon: {
    backgroundColor: '#ccfbf1',
    color: '#0f766e',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '18px'
  },
  hospitalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  hospitalName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#0f172a'
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '10px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '20px'
  },
  roleText: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#0d9488',
    fontWeight: '600'
  },
  cardRight: {
    textAlign: 'right'
  },
  rateText: {
    fontSize: '20px',
    fontWeight: '900',
    color: '#0f172a'
  },
  rateHr: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 'normal'
  },
  bonusBadge: {
    display: 'block',
    fontSize: '11px',
    color: '#059669',
    fontWeight: 'bold',
    marginTop: '3px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '14px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap',
    gap: '12px'
  },
  applyBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer'
  },
  postedByText: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: '#94a3b8'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '16px'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '540px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  modalHeader: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer'
  },
  modalForm: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155'
  },
  inputField: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '14px'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#475569'
  },
  submitBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};