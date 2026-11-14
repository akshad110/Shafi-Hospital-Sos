import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { config } from '../config.js'
import { HIDE, HospitalDocuments, Hospitals, Jobs, Sessions, Subscriptions, Users } from '../models.js'
import { TRIAL, trialWindow } from '../billing.js'
import { currentSubscription } from './billing.js'
import { catalogRoles } from '../catalog.js'
import { changed } from '../realtime.js'
import { HOSPITAL_KYC_DOCS, KYC_MAX_FILE_BYTES, isAllowedKycFile, kycDocByCode } from '../lib/hospitalKyc.js'
import { httpError, includesLabel, nowIso, paging, uid } from '../lib/util.js'
import { approvalMail, rejectionMail, resetMail, sendMail } from './mail.js'
import { notify } from './notifications.js'
import type { Hospital, HospitalDocument, HospitalVerification, User } from '../types.js'

export type RegisterFile = {
  kind: string
  fileName: string
  contentType: string
  buffer: Buffer
}

export function hospitalStatus(hospital: Hospital): HospitalVerification {
  if (hospital.verificationStatus) return hospital.verificationStatus
  return hospital.verified ? 'approved' : 'pending'
}

export function publicUser(user: User, hospital: Hospital) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    permissions: hospital.permissions,
    verified: hospital.verified,
  }
}

export async function findUserByEmail(email: string) {
  return Users.findOne({ email: email.toLowerCase().trim() }, HIDE).lean<User>()
}

export async function findUserById(id: string) {
  return Users.findOne({ id }, HIDE).lean<User>()
}

export async function getHospital(id: string) {
  return Hospitals.findOne({ id }, HIDE).lean<Hospital>()
}

function placeOf(input: { city: string; state: string; country: string }) {
  return {
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country.trim(),
  }
}

function assertKycFiles(files: RegisterFile[]) {
  const byKind = new Map(files.map((file) => [file.kind, file]))
  for (const doc of HOSPITAL_KYC_DOCS) {
    const file = byKind.get(doc.code)
    if (doc.required && !file) throw httpError(400, `Upload ${doc.label}`)
    if (!file) continue
    if (!isAllowedKycFile(file.fileName, file.contentType)) throw httpError(400, `${doc.label} must be a PDF, JPG, or PNG`)
    if (file.buffer.length > KYC_MAX_FILE_BYTES) throw httpError(400, `${doc.label} must be under 4 MB`)
  }
  for (const file of files) {
    if (!kycDocByCode(file.kind)) throw httpError(400, 'Remove unknown document types and try again')
  }
}

async function lockedPasswordHash() {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10)
}

async function replaceDocuments(hospitalId: string, files: RegisterFile[]) {
  await HospitalDocuments.deleteMany({ hospitalId })
  if (!files.length) return
  await HospitalDocuments.insertMany(files.map((file) => ({
    id: uid(),
    hospitalId,
    kind: file.kind,
    label: kycDocByCode(file.kind)?.label || file.kind,
    fileName: file.fileName,
    contentType: file.contentType || 'application/octet-stream',
    size: file.buffer.length,
    data: file.buffer,
    uploadedAt: nowIso(),
  })))
}

function hospitalRecord(input: {
  id: string
  hospitalName: string
  adminName: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  address: string
}): Hospital {
  const place = placeOf(input)
  return {
    id: input.id,
    name: input.hospitalName.trim(),
    email: input.email.toLowerCase().trim(),
    phone: input.phone.trim(),
    ...place,
    address: input.address.trim(),
    departments: ['General Medicine'],
    customRoles: [],
    locations: [place.city].filter(Boolean),
    verified: false,
    verificationStatus: 'pending',
    submittedAt: nowIso(),
    reviewedAt: '',
    rejectionReason: '',
    representative: input.adminName.trim(),
    representativeRole: 'Hospital administrator',
    plan: 'trial',
    renewalDate: '',
    notifications: { applications: true, reviews: true, shifts: true, payroll: true, billing: true },
    permissions: ['jobs.read', 'jobs.write', 'workers.read', 'billing.read', 'notifications.read'],
  }
}

export async function registerHospital(input: {
  hospitalName: string
  adminName: string
  email: string
  phone: string
  city: string
  state: string
  country: string
  address: string
}, files: RegisterFile[]) {
  assertKycFiles(files)
  const email = input.email.toLowerCase().trim()
  const existing = await findUserByEmail(email)
  if (existing) {
    const hospital = await getHospital(existing.hospitalId)
    if (!hospital) throw httpError(409, 'An account with this email already exists')
    const status = hospitalStatus(hospital)
    if (status === 'pending') throw httpError(409, 'A registration with this email is already under review', 'hospital_pending')
    if (status === 'approved') throw httpError(409, 'An account with this email already exists')
    const next = hospitalRecord({ ...input, id: hospital.id, email })
    await Hospitals.updateOne({ id: hospital.id }, { $set: next })
    await Users.updateOne({ id: existing.id }, { $set: { passwordHash: await lockedPasswordHash(), email } })
    await replaceDocuments(hospital.id, files)
    return { hospital: { ...hospital, ...next } }
  }

  const id = uid()
  const hospital = hospitalRecord({ ...input, id, email })
  const user: User = {
    id: uid(),
    email,
    passwordHash: await lockedPasswordHash(),
    role: 'hospital',
    hospitalId: id,
  }
  await Hospitals.create(hospital)
  await Users.create(user)
  await replaceDocuments(id, files)
  return { hospital }
}

function temporaryPassword() {
  return `Shafi-${randomBytes(7).toString('base64url').replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 10)}`
}

async function startTrial(hospital: Hospital) {
  const existing = await currentSubscription(hospital.id)
  if (existing) return existing
  const trial = trialWindow()
  await Hospitals.updateOne({ id: hospital.id }, { $set: { plan: 'trial', renewalDate: trial.renewalDate } })
  await Subscriptions.create({
    hospitalId: hospital.id,
    plan: 'trial',
    status: 'trial',
    months: 0,
    startedAt: trial.startedAt,
    renewalDate: trial.renewalDate,
    locationLimit: TRIAL.locations,
    requestLimit: TRIAL.activeRequests,
  })
  await notify(hospital.id, {
    type: 'billing',
    title: `Your ${TRIAL.days}-day free trial has started`,
    body: 'Every hospital feature is open. Choose a plan before the trial ends to keep posting requests.',
    href: '/subscription',
  })
  return trial
}

export function documentMeta(doc: HospitalDocument) {
  return {
    id: doc.id,
    kind: doc.kind,
    label: doc.label,
    fileName: doc.fileName,
    contentType: doc.contentType,
    size: doc.size,
    uploadedAt: doc.uploadedAt,
    required: Boolean(kycDocByCode(doc.kind)?.required),
  }
}

export async function listHospitalDocuments(hospitalId: string) {
  const rows = await HospitalDocuments.find({ hospitalId }, { data: 0, _id: 0 }).lean<HospitalDocument[]>()
  return rows.map(documentMeta)
}

export async function listHospitalsForAdmin(status: HospitalVerification, page = 1, limit = 20) {
  const pageInfo = paging(page, limit)
  const filter = { verificationStatus: status }
  const [items, total] = await Promise.all([
    Hospitals.find(filter, HIDE).sort({ submittedAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit).lean<Hospital[]>(),
    Hospitals.countDocuments(filter),
  ])
  const ids = items.map((item) => item.id)
  const counts = await HospitalDocuments.aggregate<{ _id: string; count: number }>([
    { $match: { hospitalId: { $in: ids } } },
    { $group: { _id: '$hospitalId', count: { $sum: 1 } } },
  ])
  const byId = new Map(counts.map((row) => [row._id, row.count]))
  return {
    items: items.map((hospital) => ({
      ...hospital,
      verificationStatus: hospitalStatus(hospital),
      documentCount: byId.get(hospital.id) || 0,
    })),
    total,
    page: pageInfo.page,
    limit: pageInfo.limit,
  }
}

export async function getHospitalForAdmin(id: string) {
  const hospital = await getHospital(id)
  if (!hospital) throw httpError(404, 'Hospital not found')
  const documents = await listHospitalDocuments(id)
  const letters = await listHospitalLetters(id)
  return { hospital: { ...hospital, verificationStatus: hospitalStatus(hospital) }, documents, letters }
}

export async function getHospitalDocumentFile(hospitalId: string, docId: string) {
  const doc = await HospitalDocuments.findOne({ id: docId, hospitalId }).select('+data').lean<HospitalDocument>()
  if (!doc || !doc.data) throw httpError(404, 'Document not found')
  const data = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from((doc.data as unknown as { buffer: ArrayBuffer }).buffer)
  return { ...documentMeta(doc), data }
}

function mailCollection() {
  return mongoose.connection.collection('outboundMail')
}

function redactLetter(text: string, kind: string) {
  if (kind === 'approval') return text.replace(/Temporary password: .+/i, 'Temporary password: delivered by email')
  if (kind === 'password_reset') return text.replace(/https?:\/\/\S+/g, '[reset link delivered]')
  return text
}

export async function listHospitalLetters(hospitalId: string) {
  const rows = await mailCollection().find({ hospitalId, status: { $ne: 'replaced' } }).sort({ createdAt: -1 }).limit(8).toArray()
  return rows.map((row) => ({
    id: String(row.id || ''),
    kind: String(row.kind || ''),
    to: String(row.to || ''),
    subject: String(row.subject || ''),
    text: String(row.text || ''),
    status: String(row.status || 'ready'),
    detail: String(row.detail || ''),
    createdAt: row.createdAt || null,
  }))
}

async function queueOutbound(input: { hospitalId: string; kind: string; to: string; subject: string; text: string }) {
  if (input.kind === 'approval' || input.kind === 'rejection') {
    await mailCollection().updateMany(
      { hospitalId: input.hospitalId, kind: input.kind, status: 'ready' },
      { $set: { status: 'replaced', text: 'Replaced by a newer message.', detail: 'A newer email was prepared.' } },
    )
  }
  const id = uid()
  await mailCollection().insertOne({
    id,
    hospitalId: input.hospitalId,
    kind: input.kind,
    to: input.to,
    subject: input.subject,
    text: input.text,
    status: 'ready',
    detail: 'Waiting for an administrator to send this email.',
    createdAt: new Date(),
    sentAt: null,
  })
  return id
}

export async function deliverHospitalMail(hospitalId: string, mailId: string) {
  const mail = await mailCollection().findOne({ id: mailId, hospitalId })
  if (!mail) throw httpError(404, 'Email not found')
  if (mail.status === 'sent') throw httpError(409, 'This email was already sent')
  if (mail.status === 'replaced') throw httpError(409, 'This email was replaced by a newer one')
  const { sent } = await sendMail({ to: String(mail.to || ''), subject: String(mail.subject || ''), text: String(mail.text || '') })
  if (!sent) {
    const detail = 'Email hosting is not connected yet. This message stays here until Resend is added after the site is hosted.'
    await mailCollection().updateOne({ id: mailId }, { $set: { status: 'ready', detail } })
    return { status: 'waiting' as const, detail }
  }
  await mailCollection().updateOne({ id: mailId }, {
    $set: { status: 'sent', sentAt: new Date(), detail: 'Sent', text: redactLetter(String(mail.text || ''), String(mail.kind || '')) },
  })
  return { status: 'sent' as const, detail: 'Sent' }
}

export async function approveHospital(id: string) {
  const hospital = await getHospital(id)
  if (!hospital) throw httpError(404, 'Hospital not found')
  if (hospitalStatus(hospital) === 'approved') throw httpError(409, 'This hospital is already approved')
  const user = await Users.findOne({ hospitalId: id }, HIDE).lean<User>()
  if (!user) throw httpError(404, 'Hospital account not found')
  const password = temporaryPassword()
  const reviewedAt = nowIso()
  await Users.updateOne({ id: user.id }, { $set: { passwordHash: await bcrypt.hash(password, 10) } })
  await Sessions.deleteMany({ userId: user.id })
  const updated = await Hospitals.findOneAndUpdate(
    { id },
    { $set: { verified: true, verificationStatus: 'approved', reviewedAt, rejectionReason: '' } },
    { new: true, projection: HIDE },
  ).lean<Hospital>()
  if (!updated) throw httpError(404, 'Hospital not found')
  await startTrial(updated)
  const mail = approvalMail({
    adminName: updated.representative || 'there',
    hospitalName: updated.name,
    email: updated.email,
    password,
  })
  const mailId = await queueOutbound({ hospitalId: id, kind: 'approval', to: updated.email, ...mail })
  return { hospital: { ...updated, verificationStatus: 'approved' as const }, emailed: false, temporaryPassword: password, mailId }
}

export async function rejectHospital(id: string, reason: string) {
  const hospital = await getHospital(id)
  if (!hospital) throw httpError(404, 'Hospital not found')
  if (hospitalStatus(hospital) === 'approved') throw httpError(409, 'An approved hospital cannot be rejected here')
  const reviewedAt = nowIso()
  const updated = await Hospitals.findOneAndUpdate(
    { id },
    { $set: { verified: false, verificationStatus: 'rejected', reviewedAt, rejectionReason: reason } },
    { new: true, projection: HIDE },
  ).lean<Hospital>()
  if (!updated) throw httpError(404, 'Hospital not found')
  const user = await Users.findOne({ hospitalId: id }, HIDE).lean<User>()
  if (user) {
    await Users.updateOne({ id: user.id }, { $set: { passwordHash: await lockedPasswordHash() } })
    await Sessions.deleteMany({ userId: user.id })
  }
  const mail = rejectionMail({
    adminName: updated.representative || 'there',
    hospitalName: updated.name,
    reason,
  })
  const mailId = await queueOutbound({ hospitalId: id, kind: 'rejection', to: updated.email, ...mail })
  return { hospital: { ...updated, verificationStatus: 'rejected' as const }, emailed: false, mailId }
}

const EDITABLE: (keyof Hospital)[] = ['name', 'phone', 'city', 'state', 'country', 'address', 'departments', 'locations', 'representative', 'representativeRole', 'notifications']

export async function updateHospital(id: string, patch: Partial<Hospital>) {
  const update: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (patch[key] === undefined) continue
    if (key === 'locations' && Array.isArray(patch.locations)) {
      update.locations = patch.locations.map((item) => item.trim()).filter(Boolean)
      continue
    }
    update[key] = typeof patch[key] === 'string' ? (patch[key] as string).trim() : patch[key]
  }
  if (Array.isArray(update.locations)) {
    const subscription = await currentSubscription(id)
    const limit = subscription?.locationLimit ?? TRIAL.locations
    if ((update.locations as string[]).length > limit) {
      throw httpError(409, `Your plan allows ${limit} location${limit === 1 ? '' : 's'}. Upgrade to add more SOS sites.`)
    }
  }
  const hospital = await Hospitals.findOneAndUpdate({ id }, { $set: update }, { new: true, projection: HIDE }).lean<Hospital>()
  if (hospital) {
    if (update.city !== undefined || update.state !== undefined || update.country !== undefined) {
      await Jobs.updateMany(
        { hospitalId: id, status: { $in: ['draft', 'approved'] } },
        { $set: { city: hospital.city, state: hospital.state, country: hospital.country } },
      )
    }
    changed(id, 'session')
  }
  return hospital
}

export async function rememberChoices(hospitalId: string, input: { department?: string; role?: string; location?: string }) {
  const department = input.department?.trim()
  const role = input.role?.trim()
  const location = input.location?.trim()
  const hospital = await getHospital(hospitalId)
  if (!hospital) return
  const add: Record<string, string> = {}
  if (department && !includesLabel(hospital.departments, department)) add.departments = department
  if (role && !includesLabel(await catalogRoles(), role) && !includesLabel(hospital.customRoles || [], role)) add.customRoles = role
  const sites = hospital.locations || []
  if (location && !includesLabel(sites, location)) {
    const subscription = await currentSubscription(hospitalId)
    const limit = subscription?.locationLimit ?? TRIAL.locations
    if (sites.length < limit) add.locations = location
  }
  if (Object.keys(add).length) {
    await Hospitals.updateOne({ id: hospitalId }, { $addToSet: add })
    changed(hospitalId, 'session')
  }
}

export async function requestHospitalPasswordReset(email: string) {
  const message = 'If this hospital can sign in, a reset email is waiting. It is sent when email hosting is connected, or from the admin panel until then.'
  const user = await findUserByEmail(email)
  const hospital = user ? await getHospital(user.hospitalId) : null
  if (!user || !hospital || hospitalStatus(hospital) !== 'approved') return { ok: true, message }
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  await mongoose.connection.collection('hospitalPasswordResets').insertOne({
    id: uid(),
    userId: user.id,
    hospitalId: hospital.id,
    email: user.email,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
  })
  const mail = resetMail({
    adminName: hospital.representative || 'there',
    hospitalName: hospital.name,
    link: `${config.appUrl}/reset-password?token=${token}`,
  })
  const mailId = await queueOutbound({ hospitalId: hospital.id, kind: 'password_reset', to: user.email, ...mail })
  await deliverHospitalMail(hospital.id, mailId).catch(() => undefined)
  return { ok: true, message }
}

export async function resetHospitalPassword(token: string, password: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const row = await mongoose.connection.collection('hospitalPasswordResets').findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })
  if (!row) throw httpError(400, 'This reset link is invalid or has expired')
  await Users.updateOne({ id: String(row.userId) }, { $set: { passwordHash: await bcrypt.hash(password, 10) } })
  await Sessions.deleteMany({ userId: String(row.userId) })
  await mongoose.connection.collection('hospitalPasswordResets').updateOne({ _id: row._id }, { $set: { usedAt: new Date() } })
  return { ok: true }
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await findUserById(userId)
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return false
  await Users.updateOne({ id: userId }, { $set: { passwordHash: await bcrypt.hash(next, 10) } })
  await Sessions.deleteMany({ userId })
  return true
}

export async function rememberRefresh(token: string, userId: string, expiresAt: number) {
  await Sessions.create({ token, userId, expiresAt: new Date(expiresAt) })
}

export async function takeRefresh(token: string) {
  const row = await Sessions.findOneAndDelete({ token }).lean()
  if (!row || row.expiresAt.getTime() <= Date.now()) return null
  return row
}

export async function dropRefresh(token: string) {
  await Sessions.deleteOne({ token })
}
