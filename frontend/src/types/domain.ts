export interface SessionUser {
  id: string
  email: string
  role: 'hospital'
  hospitalId: string
  hospitalName: string
  permissions: string[]
  verified: boolean
}

export interface Hospital {
  id: string
  name: string
  email: string
  phone: string
  city: string
  address: string
  departments: string[]
  customRoles?: string[]
  locations: string[]
  verified: boolean
  representative: string
  representativeRole: string
  plan: 'trial' | PlanCode
  renewalDate: string
  notifications: Record<PrefKey, boolean>
  permissions: string[]
}

export interface Job {
  id: string
  title: string
  department: string
  role: string
  description: string
  qualifications: string[]
  experience: string
  skills: string[]
  certifications: string[]
  workersNeeded: number
  date: string
  startTime: string
  endTime: string
  shiftType: 'day' | 'night' | 'rotating'
  location: string
  amount: number
  currency: 'INR'
  paymentUnit: 'hourly' | 'shift' | 'daily'
  payRules?: PayRules
  notes: string
  status: string
  urgent: boolean
  createdAt: string
}

export interface Application {
  id: string
  jobId: string
  workerId: string
  status: string
  appliedAt: string
  timeline: { status: string; at: string; note: string }[]
  notes: { id: string; message: string; at: string }[]
  workerName: string
  role: string
  qualifications: string[]
  skills: string[]
  experience: string
  verified: boolean
  jobTitle: string
  department: string
  amount: number
  paymentUnit: string
  shiftDate: string
  startTime: string
  endTime: string
  location: string
}

export type AttendanceStatus = 'pending' | 'present' | 'late' | 'half_day' | 'absent'
export type PaymentUnit = 'hourly' | 'shift' | 'daily'

export interface PayRules {
  presentPay: number
  lateAllowed: boolean
  lateDeduction: number
  halfDayAllowed: boolean
  halfDayPay: number
  absentAllowed: boolean
  absentPay: number
}
export type PayoutMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque'
export type NoticeCategory = 'applications' | 'reviews' | 'shifts' | 'payroll' | 'billing' | 'system'
export type PrefKey = Exclude<NoticeCategory, 'system'>

export interface Attendance {
  status: AttendanceStatus
  checkIn?: string
  checkOut?: string
  hours?: number
  note?: string
  markedAt?: string
  markedBy?: 'gate' | 'hospital'
}

export interface AttendanceLogEntry {
  label: string
  at: string
  by?: string
  from?: AttendanceStatus
  to?: AttendanceStatus
  shiftDate?: string
}

export interface Shift {
  id: string
  workerId: string
  contractId?: string
  department: string
  location: string
  date: string
  startTime: string
  endTime: string
  amount: number
  paymentUnit: PaymentUnit
  status: string
  attendance: Attendance
  supervisor: string
  supervisorRole: string
  geofence: string
  attendanceLog: AttendanceLogEntry[]
  notes: { id: string; message: string; at: string }[]
  workerName: string
  workerRole: string
  verified: boolean
  qualifications: string[]
  contractTitle: string
  attendanceLocked: boolean
  payRules?: PayRules
  earned?: number
}

export interface PayoutAccount {
  method: 'upi' | 'bank_transfer'
  upiId?: string
  bankName?: string
  accountLast4?: string
  ifsc?: string
}

export interface Worker {
  id: string
  name: string
  phone: string
  role: string
  qualifications: string[]
  skills: string[]
  experience: string
  verified: boolean
  city: string
  credentialExpiry: string
  availability: string
  payoutAccount?: PayoutAccount
  assignments: number
  openContracts?: number
}

export interface WorkerDetail extends Worker {
  shifts: Shift[]
  contracts: ContractCard[]
  attendance: { present: number; late: number; halfDay: number; absent: number }
}

export interface PayrollSummary {
  shifts: number
  present: number
  late: number
  halfDay: number
  absent: number
  pending: number
  hours: number
  units: number
  rate: number
  paymentUnit: PaymentUnit
  gross: number
  maxGross?: number
  earnedPresent?: number
  earnedLate?: number
  earnedHalf?: number
  earnedAbsent?: number
  toMark: number
}

export interface ContractCard {
  id: string
  workerId: string
  jobId?: string
  title: string
  role: string
  department: string
  location: string
  startDate: string
  endDate: string
  rate: number
  paymentUnit: PaymentUnit
  hoursPerShift: number
  payRules?: PayRules
  status: 'active' | 'completed' | 'paid' | 'cancelled'
  createdAt: string
  completedAt?: string
  paidAt?: string
  payoutId?: string
  workerName: string
  workerRole: string
  workerVerified: boolean
  summary: PayrollSummary
  canPay: boolean
}

export interface Payout {
  id: string
  number: string
  workerId: string
  contractId: string
  gross: number
  adjustment: number
  amount: number
  currency: 'INR'
  method: PayoutMethod
  reference: string
  note: string
  breakdown: Omit<PayrollSummary, 'toMark'>
  status: 'paid'
  paidAt: string
  workerName?: string
}

export interface ContractDetail extends ContractCard {
  worker: (Omit<Worker, 'assignments'>) | null
  payout: Payout | null
  shifts: (Omit<Shift, 'workerName' | 'workerRole' | 'verified' | 'qualifications' | 'contractTitle' | 'attendanceLocked'> & { earned?: number })[]
}

export interface ContractCounts {
  active: number
  completed: number
  readyToPay: number
  paid: number
  toMark: number
  due: number
}

export interface Notice {
  id: string
  type: string
  category: NoticeCategory
  priority: 'normal' | 'high'
  title: string
  body: string
  href: string
  read: boolean
  readAt?: string
  createdAt: string
}

export interface NoticeList {
  items: Notice[]
  unread: number
  total: number
  categories: Record<NoticeCategory, { total: number; unread: number }>
}

export interface Catalog {
  roles: string[]
  supportTopics: string[]
  faqs: { q: string; a: string }[]
  supportContact: { email: string; phone: string; hours: string }
  payoutMethods: { value: PayoutMethod; label: string }[]
}

export type PlanCode = 'starter' | 'professional' | 'enterprise'

export interface Plan {
  code: PlanCode
  name: string
  months: number
  price: number
  currency: 'INR'
  locations: number
  activeRequests: number
  features: string[]
  popular?: boolean
}

export interface Subscription {
  plan: 'trial' | PlanCode
  status: 'trial' | 'active' | 'expired'
  months: number
  startedAt: string
  renewalDate: string
  locationLimit: number
  requestLimit: number
}

export interface Invoice {
  id: string
  number: string
  amount: number
  status: 'paid' | 'due' | 'failed'
  issuedAt: string
  description: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
