export type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'cancelled' | 'filled'
export type ApplicationStatus = 'under_review' | 'needs_update' | 'shortlisted' | 'rejected' | 'offered' | 'confirmed'
export type ShiftStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type AttendanceStatus = 'pending' | 'present' | 'late' | 'half_day' | 'absent'
export type ContractStatus = 'active' | 'completed' | 'paid' | 'cancelled'
export type PlanCode = 'starter' | 'professional' | 'enterprise'
export type SubscriptionPlan = PlanCode | 'trial'
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
export type NotificationCategory = 'applications' | 'reviews' | 'shifts' | 'payroll' | 'billing' | 'system'

export interface User {
  id: string
  email: string
  passwordHash: string
  role: 'hospital'
  hospitalId: string
}

export interface NotificationPrefs {
  applications: boolean
  reviews: boolean
  shifts: boolean
  payroll: boolean
  billing: boolean
}

export interface Hospital {
  id: string
  name: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  address: string
  departments: string[]
  customRoles: string[]
  locations: string[]
  verified: boolean
  representative: string
  representativeRole: string
  plan: SubscriptionPlan
  renewalDate: string
  notifications: NotificationPrefs
  permissions: string[]
}

export interface Job {
  id: string
  hospitalId: string
  title: string
  department: string
  role: string
  description: string
  qualifications: string[]
  experience: string
  skills: string[]
  certifications: string[]
  requiredDocuments?: { id: string; name: string; instruction?: string }[]
  workersNeeded: number
  date: string
  startTime: string
  endTime: string
  shiftType: 'day' | 'night' | 'rotating'
  location: string
  city?: string
  state?: string
  country?: string
  amount: number
  currency: 'INR'
  paymentUnit: PaymentUnit
  payRules?: PayRules
  notes: string
  status: JobStatus
  urgent: boolean
  createdAt: string
  updatedAt: string
}

export interface PayoutAccount {
  method: 'upi' | 'bank_transfer'
  upiId?: string
  bankName?: string
  accountLast4?: string
  ifsc?: string
}

export interface WorkerDocument {
  id: string
  name: string
  kind?: string
  url?: string
  fileName?: string
}

export interface Worker {
  id: string
  hospitalId: string
  name: string
  phone: string
  role: string
  qualifications: string[]
  certifications: string[]
  skills: string[]
  experience: string
  verified: boolean
  city: string
  credentialExpiry: string
  availability: string
  payoutAccount?: PayoutAccount
  documents?: WorkerDocument[]
}

export interface Note {
  id: string
  message: string
  at: string
}

export interface WorkerMessage {
  id: string
  code: string
  body: string
  dueBy: string
  at: string
}

export interface DocumentReview {
  id: string
  label: string
  status: 'verified' | 'rejected'
  reason: string
  at: string
}

export interface Application {
  id: string
  hospitalId: string
  jobId: string
  workerId: string
  status: ApplicationStatus
  appliedAt: string
  timeline: { status: string; at: string; note: string }[]
  notes: Note[]
  messages: WorkerMessage[]
  documentReviews: DocumentReview[]
  uploads?: { id: string; documentId?: string; name: string; url?: string; fileName?: string; contentType?: string; at: string }[]
}

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
  hospitalId: string
  workerId: string
  contractId?: string
  department: string
  location: string
  date: string
  startTime: string
  endTime: string
  amount: number
  paymentUnit: PaymentUnit
  status: ShiftStatus
  attendance: Attendance
  supervisor: string
  supervisorRole: string
  geofence: string
  attendanceLog: AttendanceLogEntry[]
  notes: Note[]
}

export interface Contract {
  id: string
  hospitalId: string
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
  status: ContractStatus
  createdAt: string
  completedAt?: string
  paidAt?: string
  payoutId?: string
}

export interface PayrollBreakdown {
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
  maxGross: number
  earnedPresent: number
  earnedLate: number
  earnedHalf: number
  earnedAbsent: number
}

export interface Payout {
  id: string
  number: string
  hospitalId: string
  workerId: string
  contractId: string
  gross: number
  adjustment: number
  amount: number
  currency: 'INR'
  method: PayoutMethod
  reference: string
  note: string
  breakdown: PayrollBreakdown
  status: 'paid'
  paidAt: string
}

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
  hospitalId: string
  plan: SubscriptionPlan
  status: 'trial' | 'active' | 'expired'
  months: number
  startedAt: string
  renewalDate: string
  locationLimit: number
  requestLimit: number
}

export interface Invoice {
  id: string
  hospitalId: string
  number: string
  amount: number
  currency: 'INR'
  status: 'paid' | 'due' | 'failed'
  issuedAt: string
  description: string
}

export interface Notification {
  id: string
  hospitalId: string
  type: string
  category: NotificationCategory
  priority: 'normal' | 'high'
  title: string
  body: string
  href: string
  read: boolean
  readAt?: string
  createdAt: string
}

export interface Ticket {
  id: string
  hospitalId: string
  subject: string
  message: string
  status: 'open' | 'closed'
  createdAt: string
}

export interface Session {
  token: string
  userId: string
  expiresAt: Date
}

export interface CatalogEntry {
  key: string
  value: unknown
}
