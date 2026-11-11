import mongoose, { Schema, type SchemaDefinition } from 'mongoose'
import type {
  Application,
  CatalogEntry,
  Contract,
  Hospital,
  Invoice,
  Job,
  Notification,
  Payout,
  Plan,
  Session,
  Shift,
  Subscription,
  Ticket,
  User,
  Worker,
} from './types.js'

export const HIDE = { _id: 0 } as const

type Fields = Record<string, unknown>

function sub(fields: Fields): Schema {
  return new Schema(fields as SchemaDefinition, { _id: false })
}

function define<T>(name: string, fields: Fields, indexes: Record<string, 1 | -1>[] = []): mongoose.Model<T> {
  const schema: Schema = new Schema(fields as SchemaDefinition, { versionKey: false, strict: true, minimize: false })
  for (const index of indexes) schema.index(index)
  return (mongoose.models[name] ?? mongoose.model(name, schema, name)) as unknown as mongoose.Model<T>
}

const id = { type: String, required: true, unique: true }
const hospitalRef = { type: String, required: true, index: true }
const note = sub({ id: String, message: String, at: String })
const payRules = sub({
  presentPay: Number,
  lateAllowed: { type: Boolean, default: true },
  lateDeduction: Number,
  halfDayAllowed: { type: Boolean, default: true },
  halfDayPay: Number,
  absentAllowed: { type: Boolean, default: true },
  absentPay: { type: Number, default: 0 },
})

export const Users = define<User>('users', {
  id,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['hospital'], required: true },
  hospitalId: hospitalRef,
})

export const Hospitals = define<Hospital>('hospitals', {
  id,
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: String,
  city: { type: String, default: '', index: true },
  state: { type: String, default: '', index: true },
  country: { type: String, default: '', index: true },
  address: String,
  departments: [String],
  customRoles: { type: [String], default: [] },
  locations: [String],
  verified: { type: Boolean, default: false },
  representative: { type: String, default: '' },
  representativeRole: { type: String, default: '' },
  plan: { type: String, default: 'trial' },
  renewalDate: String,
  notifications: {
    applications: { type: Boolean, default: true },
    reviews: { type: Boolean, default: true },
    shifts: { type: Boolean, default: true },
    payroll: { type: Boolean, default: true },
    billing: { type: Boolean, default: true },
  },
  permissions: [String],
}, [{ country: 1, state: 1, city: 1 }])

export const Catalogs = define<CatalogEntry>('catalogs', {
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
})

export const Plans = define<Plan>('plans', {
  code: { type: String, required: true, unique: true },
  name: String,
  months: Number,
  price: Number,
  currency: { type: String, default: 'INR' },
  locations: Number,
  activeRequests: Number,
  features: [String],
  popular: Boolean,
})

export const Subscriptions = define<Subscription>('subscriptions', {
  hospitalId: { type: String, required: true, unique: true },
  plan: String,
  status: { type: String, enum: ['trial', 'active', 'expired'] },
  months: Number,
  startedAt: String,
  renewalDate: String,
  locationLimit: Number,
  requestLimit: Number,
})

export const Invoices = define<Invoice>('invoices', {
  id,
  hospitalId: hospitalRef,
  number: { type: String, required: true },
  amount: Number,
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['paid', 'due', 'failed'] },
  issuedAt: String,
  description: String,
}, [{ hospitalId: 1, issuedAt: -1 }])

export const Workers = define<Worker>('workers', {
  id,
  hospitalId: hospitalRef,
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  role: String,
  qualifications: [String],
  certifications: [String],
  skills: [String],
  experience: String,
  verified: Boolean,
  city: String,
  credentialExpiry: String,
  availability: String,
  documents: [sub({ id: String, name: String, kind: String, url: String, fileName: String })],
  payoutAccount: {
    method: { type: String, enum: ['upi', 'bank_transfer'] },
    upiId: String,
    bankName: String,
    accountLast4: String,
    ifsc: String,
  },
}, [{ hospitalId: 1, name: 1 }])

export const Jobs = define<Job>('jobs', {
  id,
  hospitalId: hospitalRef,
  title: { type: String, required: true },
  department: String,
  role: String,
  description: String,
  qualifications: [String],
  experience: String,
  skills: [String],
  certifications: [String],
  requiredDocuments: [sub({ id: String, name: String, instruction: String })],
  workersNeeded: Number,
  date: String,
  startTime: String,
  endTime: String,
  shiftType: { type: String, enum: ['day', 'night', 'rotating'] },
  location: String,
  city: { type: String, default: '', index: true },
  state: { type: String, default: '', index: true },
  country: { type: String, default: '', index: true },
  amount: Number,
  currency: { type: String, default: 'INR' },
  paymentUnit: { type: String, enum: ['hourly', 'shift', 'daily'] },
  payRules,
  notes: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'pending_review', 'approved', 'rejected', 'cancelled', 'filled'], index: true },
  urgent: { type: Boolean, default: false },
  createdAt: String,
  updatedAt: String,
}, [{ hospitalId: 1, createdAt: -1 }, { hospitalId: 1, status: 1 }, { country: 1, state: 1, city: 1, status: 1 }])

export const Applications = define<Application>('applications', {
  id,
  hospitalId: hospitalRef,
  jobId: { type: String, index: true },
  workerId: { type: String, index: true },
  status: { type: String, enum: ['under_review', 'needs_update', 'shortlisted', 'rejected', 'offered', 'confirmed'] },
  appliedAt: String,
  timeline: [sub({ status: String, at: String, note: String })],
  notes: [note],
  messages: [sub({ id: String, code: String, body: String, dueBy: String, at: String })],
  documentReviews: [sub({
    id: String,
    label: String,
    status: { type: String, enum: ['verified', 'rejected'] },
    reason: String,
    at: String,
  })],
  uploads: [sub({
    id: String,
    documentId: String,
    name: String,
    url: String,
    fileName: String,
    contentType: String,
    at: String,
  })],
}, [{ hospitalId: 1, appliedAt: -1 }])

export const Contracts = define<Contract>('contracts', {
  id,
  hospitalId: hospitalRef,
  workerId: { type: String, required: true, index: true },
  jobId: String,
  title: String,
  role: String,
  department: String,
  location: String,
  startDate: String,
  endDate: String,
  rate: Number,
  paymentUnit: { type: String, enum: ['hourly', 'shift', 'daily'] },
  hoursPerShift: { type: Number, default: 8 },
  payRules,
  status: { type: String, enum: ['active', 'completed', 'paid', 'cancelled'], index: true },
  createdAt: String,
  completedAt: String,
  paidAt: String,
  payoutId: String,
}, [{ hospitalId: 1, status: 1, endDate: -1 }])

export const Shifts = define<Shift>('shifts', {
  id,
  hospitalId: hospitalRef,
  workerId: { type: String, index: true },
  contractId: { type: String, index: true },
  department: String,
  location: String,
  date: String,
  startTime: String,
  endTime: String,
  amount: Number,
  paymentUnit: { type: String, enum: ['hourly', 'shift', 'daily'] },
  status: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'] },
  attendance: {
    status: { type: String, enum: ['pending', 'present', 'late', 'half_day', 'absent'], default: 'pending' },
    checkIn: String,
    checkOut: String,
    hours: Number,
    note: String,
    markedAt: String,
    markedBy: { type: String, enum: ['gate', 'hospital'] },
  },
  supervisor: String,
  supervisorRole: String,
  geofence: String,
  attendanceLog: [sub({
    label: String,
    at: String,
    by: String,
    from: String,
    to: String,
    shiftDate: String,
  })],
  notes: [note],
}, [{ hospitalId: 1, date: 1, startTime: 1 }])

const breakdown = sub({
  shifts: Number,
  present: Number,
  late: Number,
  halfDay: Number,
  absent: Number,
  pending: Number,
  hours: Number,
  units: Number,
  rate: Number,
  paymentUnit: String,
  gross: Number,
  maxGross: Number,
  earnedPresent: Number,
  earnedLate: Number,
  earnedHalf: Number,
  earnedAbsent: Number,
})

export const Payouts = define<Payout>('payouts', {
  id,
  number: { type: String, required: true, unique: true },
  hospitalId: hospitalRef,
  workerId: { type: String, index: true },
  contractId: { type: String, required: true, unique: true },
  gross: Number,
  adjustment: Number,
  amount: Number,
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['bank_transfer', 'upi', 'cash', 'cheque'] },
  reference: { type: String, default: '' },
  note: { type: String, default: '' },
  breakdown,
  status: { type: String, enum: ['paid'], default: 'paid' },
  paidAt: String,
}, [{ hospitalId: 1, paidAt: -1 }])

export const Notifications = define<Notification>('notifications', {
  id,
  hospitalId: hospitalRef,
  type: String,
  category: { type: String, enum: ['applications', 'reviews', 'shifts', 'payroll', 'billing', 'system'] },
  priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
  title: String,
  body: String,
  href: String,
  read: { type: Boolean, default: false },
  readAt: String,
  createdAt: String,
}, [{ hospitalId: 1, createdAt: -1 }, { hospitalId: 1, read: 1 }])

export const Tickets = define<Ticket>('tickets', {
  id,
  hospitalId: hospitalRef,
  subject: String,
  message: String,
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt: String,
})

const sessionSchema: Schema = new Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
} as SchemaDefinition, { versionKey: false })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const Sessions = (mongoose.models.sessions ?? mongoose.model('sessions', sessionSchema, 'sessions')) as unknown as mongoose.Model<Session>

export const allModels = [Users, Hospitals, Catalogs, Plans, Subscriptions, Invoices, Workers, Jobs, Applications, Contracts, Shifts, Payouts, Notifications, Tickets, Sessions]
