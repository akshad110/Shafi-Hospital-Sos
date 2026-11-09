import bcrypt from 'bcryptjs'
import { TRIAL, trialWindow } from '../billing.js'
import { CATALOG_SEED } from '../catalog.js'
import { presentDayPay, resolvePayRules } from '../lib/payRules.js'
import { shiftHours, ymd } from '../lib/util.js'
import { liveShiftStatus, summarize } from '../services/payroll.js'
import type {
  Application,
  AttendanceStatus,
  Contract,
  Hospital,
  Job,
  Notification,
  Payout,
  Plan,
  Shift,
  Subscription,
  User,
  Worker,
} from '../types.js'

const HOSPITAL = 'h-city'

function at(days: number, hours = 0, minutes = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function day(days: number) {
  return ymd(at(days))
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

interface ShiftPlan {
  contract: Contract
  supervisor: [string, string]
  marks: AttendanceStatus[]
  startTime: string
  endTime: string
}

function contractShifts({ contract, supervisor, marks, startTime, endTime }: ShiftPlan): Shift[] {
  const start = new Date(`${contract.startDate}T00:00:00`)
  const full = shiftHours(startTime, endTime)
  return marks.map((mark, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const dateKey = ymd(date)
    const checkIn = mark === 'late' ? addMinutes(startTime, 22) : addMinutes(startTime, -6)
    const checkOut = mark === 'half_day' ? addMinutes(startTime, Math.round((full / 2) * 60)) : addMinutes(endTime, 3)
    const markedAt = new Date(`${dateKey}T${startTime}:00`).toISOString()
    const attendance: Shift['attendance'] =
      mark === 'pending'
        ? { status: 'pending' }
        : mark === 'absent'
          ? { status: 'absent', hours: 0, note: 'No-show, informed the ward desk', markedAt, markedBy: 'hospital' }
          : {
              status: mark,
              checkIn,
              checkOut,
              hours: mark === 'half_day' ? full / 2 : mark === 'late' ? Math.round((full - 22 / 60) * 100) / 100 : full,
              note: mark === 'late' ? 'Arrived 22 minutes late' : mark === 'half_day' ? 'Left after half shift (approved)' : undefined,
              markedAt,
              markedBy: 'gate',
            }
    const log =
      mark === 'pending'
        ? []
        : mark === 'absent'
          ? [{ label: 'Absent — marked by hospital', at: markedAt }]
          : [
              { label: `Checked in at the gate (${checkIn})`, at: markedAt },
              { label: `Checked out (${checkOut})`, at: markedAt },
            ]
    const shift: Shift = {
      id: `${contract.id}-s${index + 1}`,
      hospitalId: HOSPITAL,
      workerId: contract.workerId,
      contractId: contract.id,
      department: contract.department,
      location: contract.location,
      date: dateKey,
      startTime,
      endTime,
      amount: contract.rate,
      paymentUnit: contract.paymentUnit,
      status: 'upcoming',
      attendance,
      supervisor: supervisor[0],
      supervisorRole: supervisor[1],
      geofence: 'Check-in opens within 150m of the hospital gate.',
      attendanceLog: log,
      notes: [],
    }
    shift.status = liveShiftStatus(shift)
    return shift
  })
}

function jobWithPay(job: Job): Job {
  return { ...job, payRules: resolvePayRules(undefined, presentDayPay(job.amount, job.paymentUnit, job.paymentUnit === 'hourly' ? 8 : 12)) }
}

function contractWithPay(contract: Contract): Contract {
  return { ...contract, payRules: resolvePayRules(undefined, presentDayPay(contract.rate, contract.paymentUnit, contract.hoursPerShift)) }
}

export function createSeed() {
  const trial = trialWindow()
  const soon = new Date(Date.now() + 50 * 60 * 1000)

  const users: User[] = [
    { id: 'u-city', email: 'admin@cityhospital.com', passwordHash: bcrypt.hashSync('Hospital@123', 10), role: 'hospital', hospitalId: HOSPITAL },
  ]

  const hospitals: Hospital[] = [
    {
      id: HOSPITAL,
      name: 'City General Hospital',
      email: 'admin@cityhospital.com',
      phone: '+91 20 4000 2100',
      city: 'Pune',
      address: '14 Koregaon Park Road, Pune 411001',
      departments: ['Critical Care', 'Emergency', 'Laboratory', 'General Medicine'],
      customRoles: [],
      locations: ['Koregaon Park'],
      verified: true,
      representative: 'Dr. Meera Kulkarni',
      representativeRole: 'Medical Superintendent',
      plan: 'trial',
      renewalDate: trial.renewalDate,
      notifications: { applications: true, reviews: true, shifts: true, payroll: true, billing: true },
      permissions: ['jobs.read', 'jobs.write', 'workers.read', 'billing.read', 'notifications.read'],
    },
  ]

  const plans: Plan[] = [
    { code: 'starter', name: 'Starter', months: 1, price: 1999, currency: 'INR', locations: 1, activeRequests: 5, features: ['One hospital location', 'Five active staffing requests', 'Application tracking', 'Email notifications'] },
    { code: 'professional', name: 'Professional', months: 6, price: 26995, currency: 'INR', locations: 3, activeRequests: 20, features: ['Three locations', 'Twenty active staffing requests', 'Shift attendance records', 'Priority admin review'], popular: true },
    { code: 'enterprise', name: 'Enterprise', months: 12, price: 95990, currency: 'INR', locations: 10, activeRequests: 50, features: ['Ten locations', 'Fifty active staffing requests', 'Dedicated support manager', 'Advanced workforce directory'] },
  ]

  const subscriptions: Subscription[] = [
    { hospitalId: HOSPITAL, plan: 'trial', status: 'trial', months: 0, startedAt: trial.startedAt, renewalDate: trial.renewalDate, locationLimit: TRIAL.locations, requestLimit: TRIAL.activeRequests },
  ]

  const workers: Worker[] = [
    { id: 'w-ananya', hospitalId: HOSPITAL, name: 'Ananya Deshpande', phone: '+91 98220 11021', role: 'ICU Nurse', qualifications: ['B.Sc Nursing', 'ACLS'], skills: ['Ventilator care', 'Hemodynamic monitoring'], experience: '6 years', verified: true, city: 'Pune', credentialExpiry: day(40), availability: 'Days', payoutAccount: { method: 'bank_transfer', bankName: 'HDFC Bank', accountLast4: '4521', ifsc: 'HDFC0001234' } },
    { id: 'w-rahul', hospitalId: HOSPITAL, name: 'Rahul Mehta', phone: '+91 98500 44310', role: 'ER Nurse', qualifications: ['GNM', 'BLS'], skills: ['Triage', 'Trauma bay'], experience: '4 years', verified: true, city: 'Pune', credentialExpiry: day(120), availability: 'Nights', payoutAccount: { method: 'upi', upiId: 'rahul.mehta@okicici' } },
    { id: 'w-priya', hospitalId: HOSPITAL, name: 'Priya Shah', phone: '+91 99230 77812', role: 'Lab Technician', qualifications: ['DMLT'], skills: ['Hematology', 'Sample accession'], experience: '3 years', verified: false, city: 'Pune', credentialExpiry: day(18), availability: 'Rotating', payoutAccount: { method: 'upi', upiId: 'priyashah@oksbi' } },
    { id: 'w-joseph', hospitalId: HOSPITAL, name: "Joseph D'Souza", phone: '+91 97300 55890', role: 'Caregiver', qualifications: ['Caregiver certificate'], skills: ['Ward support', 'Patient mobility'], experience: '5 years', verified: true, city: 'Pune', credentialExpiry: day(200), availability: 'Days', payoutAccount: { method: 'bank_transfer', bankName: 'State Bank of India', accountLast4: '8830', ifsc: 'SBIN0004512' } },
  ]

  const jobs: Job[] = [
    jobWithPay({ id: 'j-icu', hospitalId: HOSPITAL, title: 'ICU Registered Nurse', department: 'Critical Care', role: 'ICU Nurse', description: 'Cover a 12-hour ICU vacancy on floor 3. Ventilator competency is required.', qualifications: ['B.Sc Nursing'], experience: '3+ years', skills: ['Ventilator care', 'ACLS'], certifications: ['RN license', 'ACLS'], workersNeeded: 2, date: ymd(soon), startTime: '07:00', endTime: '19:00', shiftType: 'day', location: 'ICU Ward · Floor 3 · Bay 304-312', amount: 950, currency: 'INR', paymentUnit: 'shift', notes: 'Report to the charge desk 15 minutes early.', status: 'approved', urgent: true, createdAt: at(-4, 9).toISOString(), updatedAt: at(-4, 11).toISOString() }),
    jobWithPay({ id: 'j-er', hospitalId: HOSPITAL, title: 'Emergency Room Nurse (Night)', department: 'Emergency', role: 'ER Nurse', description: 'Night coverage for the emergency bay. Trauma experience preferred.', qualifications: ['GNM or B.Sc Nursing'], experience: '2+ years', skills: ['Triage'], certifications: ['BLS'], workersNeeded: 1, date: day(1), startTime: '19:00', endTime: '07:00', shiftType: 'night', location: 'Emergency · Ground floor', amount: 1100, currency: 'INR', paymentUnit: 'shift', notes: 'Night differential included in the listed amount.', status: 'approved', urgent: true, createdAt: at(-1, 16).toISOString(), updatedAt: at(-1, 18).toISOString() }),
    jobWithPay({ id: 'j-lab', hospitalId: HOSPITAL, title: 'Lab Technician — Hematology', department: 'Laboratory', role: 'Lab Technician', description: 'Same-day hematology bench support while a staff member is on leave.', qualifications: ['DMLT'], experience: '1+ years', skills: ['Hematology'], certifications: ['State lab registration'], workersNeeded: 1, date: day(2), startTime: '08:00', endTime: '16:00', shiftType: 'day', location: 'Laboratory · Block B', amount: 180, currency: 'INR', paymentUnit: 'hourly', notes: '', status: 'pending_review', urgent: false, createdAt: at(0, 8).toISOString(), updatedAt: at(0, 8).toISOString() }),
    jobWithPay({ id: 'j-care', hospitalId: HOSPITAL, title: 'Ward Caregiver', department: 'General Medicine', role: 'Caregiver', description: 'Draft request for a daytime caregiver on the general ward.', qualifications: ['Caregiver certificate'], experience: '1+ years', skills: ['Patient mobility'], certifications: [], workersNeeded: 1, date: day(3), startTime: '08:00', endTime: '16:00', shiftType: 'day', location: 'General Ward · Floor 2', amount: 700, currency: 'INR', paymentUnit: 'shift', notes: '', status: 'draft', urgent: false, createdAt: at(0, 10).toISOString(), updatedAt: at(0, 10).toISOString() }),
  ]

  const applications: Application[] = [
    { id: 'a-ananya', hospitalId: HOSPITAL, jobId: 'j-icu', workerId: 'w-ananya', status: 'confirmed', appliedAt: at(-4, 12).toISOString(), timeline: [{ status: 'under_review', at: at(-4, 12).toISOString(), note: 'Application received' }, { status: 'shortlisted', at: at(-4, 15).toISOString(), note: 'Credentials matched the ICU brief' }, { status: 'offered', at: at(-4, 17).toISOString(), note: 'Admin released an offer' }, { status: 'confirmed', at: at(-4, 19).toISOString(), note: 'Worker accepted a 7-day contract' }], notes: [] },
    { id: 'a-rahul', hospitalId: HOSPITAL, jobId: 'j-er', workerId: 'w-rahul', status: 'shortlisted', appliedAt: at(-1, 9).toISOString(), timeline: [{ status: 'under_review', at: at(-1, 9).toISOString(), note: 'Application received' }, { status: 'shortlisted', at: at(-1, 17).toISOString(), note: 'Awaiting admin offer' }], notes: [] },
    { id: 'a-priya', hospitalId: HOSPITAL, jobId: 'j-lab', workerId: 'w-priya', status: 'under_review', appliedAt: at(0, 9, 30).toISOString(), timeline: [{ status: 'under_review', at: at(0, 9, 30).toISOString(), note: 'Waiting for license check' }], notes: [] },
    { id: 'a-joseph', hospitalId: HOSPITAL, jobId: 'j-care', workerId: 'w-joseph', status: 'offered', appliedAt: at(-3, 11).toISOString(), timeline: [{ status: 'under_review', at: at(-3, 11).toISOString(), note: 'Application received' }, { status: 'offered', at: at(-2, 13).toISOString(), note: 'Offer sent. Request is still a draft on the hospital side.' }], notes: [] },
  ]

  const contracts: Contract[] = [
    contractWithPay({ id: 'c-ananya-icu', hospitalId: HOSPITAL, workerId: 'w-ananya', jobId: 'j-icu', title: 'ICU cover — 7 day contract', role: 'ICU Nurse', department: 'Critical Care', location: 'ICU Ward · Floor 3', startDate: day(-3), endDate: day(3), rate: 950, paymentUnit: 'shift', hoursPerShift: 12, status: 'active', createdAt: at(-4, 19).toISOString() }),
    contractWithPay({ id: 'c-rahul-er', hospitalId: HOSPITAL, workerId: 'w-rahul', title: 'Emergency nights — 7 day contract', role: 'ER Nurse', department: 'Emergency', location: 'Emergency · Ground floor', startDate: day(-8), endDate: day(-2), rate: 1100, paymentUnit: 'shift', hoursPerShift: 12, status: 'completed', createdAt: at(-9, 12).toISOString(), completedAt: at(-1, 7).toISOString() }),
    contractWithPay({ id: 'c-priya-lab', hospitalId: HOSPITAL, workerId: 'w-priya', title: 'Hematology bench — 4 day contract', role: 'Lab Technician', department: 'Laboratory', location: 'Laboratory · Block B', startDate: day(-4), endDate: day(-1), rate: 180, paymentUnit: 'hourly', hoursPerShift: 8, status: 'completed', createdAt: at(-5, 12).toISOString(), completedAt: at(0, 0, 5).toISOString() }),
    contractWithPay({ id: 'c-joseph-ward', hospitalId: HOSPITAL, workerId: 'w-joseph', title: 'General ward support — 7 day contract', role: 'Caregiver', department: 'General Medicine', location: 'General Ward · Floor 2', startDate: day(-14), endDate: day(-8), rate: 700, paymentUnit: 'shift', hoursPerShift: 8, status: 'paid', createdAt: at(-15, 12).toISOString(), completedAt: at(-7, 0, 5).toISOString(), paidAt: at(-6, 11).toISOString(), payoutId: 'p-joseph-ward' }),
  ]

  const shifts: Shift[] = [
    ...contractShifts({ contract: contracts[0], supervisor: ['Dr. Evelyn Reed', 'Charge Nurse Supervisor'], marks: ['present', 'late', 'present', 'pending', 'pending', 'pending', 'pending'], startTime: '07:00', endTime: '19:00' }),
    ...contractShifts({ contract: contracts[1], supervisor: ['Dr. Arjun Borse', 'ER Consultant'], marks: ['present', 'present', 'late', 'present', 'half_day', 'present', 'present'], startTime: '19:00', endTime: '07:00' }),
    ...contractShifts({ contract: contracts[2], supervisor: ['Dr. Kavita Rao', 'Lab Supervisor'], marks: ['present', 'present', 'half_day', 'pending'], startTime: '08:00', endTime: '16:00' }),
    ...contractShifts({ contract: contracts[3], supervisor: ['Sister Lata Pawar', 'Ward In-charge'], marks: ['present', 'present', 'present', 'absent', 'present', 'present', 'present'], startTime: '08:00', endTime: '16:00' }),
  ]
  const josephShifts = shifts.filter((shift) => shift.contractId === 'c-joseph-ward')
  const josephSummary = summarize(contracts[3], josephShifts)
  const { toMark, payRules: _rules, ...breakdown } = josephSummary
  void toMark
  void _rules
  const payouts: Payout[] = [
    { id: 'p-joseph-ward', number: 'PAY-1001', hospitalId: HOSPITAL, workerId: 'w-joseph', contractId: 'c-joseph-ward', gross: josephSummary.gross, adjustment: 0, amount: josephSummary.gross, currency: 'INR', method: 'bank_transfer', reference: 'NEFT/SBIN/882301', note: '', breakdown, status: 'paid', paidAt: at(-6, 11).toISOString() },
  ]

  const rahulSummary = summarize(contracts[1], shifts.filter((shift) => shift.contractId === 'c-rahul-er'))

  const notifications: Notification[] = [
    { id: 'n-rahul-ready', hospitalId: HOSPITAL, type: 'payroll', category: 'payroll', priority: 'high', title: 'Contract completed — Rahul Mehta', body: `Emergency nights — 7 day contract has ended. ₹${rahulSummary.gross.toLocaleString('en-IN')} is ready to pay.`, href: '/attendance/c-rahul-er', read: false, createdAt: at(-1, 7, 5).toISOString() },
    { id: 'n-priya-mark', hospitalId: HOSPITAL, type: 'attendance', category: 'shifts', priority: 'normal', title: 'Attendance needs marking', body: "Priya Shah's Laboratory shift has ended without an attendance mark.", href: '/attendance/c-priya-lab', read: false, createdAt: at(0, 0, 5).toISOString() },
    { id: 'n-application', hospitalId: HOSPITAL, type: 'application', category: 'applications', priority: 'normal', title: 'New application received', body: 'Priya Shah applied for Lab Technician — Hematology.', href: '/applications', read: false, createdAt: at(0, 9, 30).toISOString() },
    { id: 'n-review', hospitalId: HOSPITAL, type: 'review', category: 'reviews', priority: 'normal', title: 'Request is with admin review', body: 'Lab Technician — Hematology is waiting for approval before it can go live.', href: '/find?id=j-lab', read: false, createdAt: at(0, 8, 5).toISOString() },
    { id: 'n-trial', hospitalId: HOSPITAL, type: 'billing', category: 'billing', priority: 'normal', title: `Your ${TRIAL.days}-day free trial has started`, body: 'Every hospital feature is open. Choose a plan before the trial ends to keep posting requests.', href: '/subscription', read: false, createdAt: trial.startedAt },
    { id: 'n-joseph-paid', hospitalId: HOSPITAL, type: 'payroll', category: 'payroll', priority: 'normal', title: "Salary paid to Joseph D'Souza", body: `₹${josephSummary.gross.toLocaleString('en-IN')} recorded for General ward support (PAY-1001).`, href: '/attendance/c-joseph-ward', read: true, readAt: at(-6, 12).toISOString(), createdAt: at(-6, 11).toISOString() },
    { id: 'n-placement', hospitalId: HOSPITAL, type: 'placement', category: 'applications', priority: 'normal', title: 'Worker confirmed', body: 'Ananya Deshpande accepted the 7-day ICU contract.', href: '/attendance/c-ananya-icu', read: true, readAt: at(-4, 20).toISOString(), createdAt: at(-4, 19).toISOString() },
  ]

  return {
    users,
    hospitals,
    catalogs: Object.entries(CATALOG_SEED).map(([key, value]) => ({ key, value })),
    plans,
    subscriptions,
    invoices: [],
    workers,
    jobs,
    applications,
    contracts,
    shifts,
    payouts,
    notifications,
    tickets: [],
  }
}
