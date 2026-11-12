import bcrypt from 'bcryptjs'
import { HIDE, Hospitals, Jobs, Sessions, Subscriptions, Users } from '../models.js'
import { TRIAL, trialWindow } from '../billing.js'
import { currentSubscription } from './billing.js'
import { catalogRoles } from '../catalog.js'
import { changed } from '../realtime.js'
import { httpError, includesLabel, uid } from '../lib/util.js'
import { notify } from './notifications.js'
import type { Hospital, User } from '../types.js'

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

export async function registerHospital(input: { hospitalName: string; email: string; password: string; phone: string; city: string; state: string; country: string; address: string }) {
  if (await findUserByEmail(input.email)) throw httpError(409, 'An account with this email already exists')
  const id = uid()
  const trial = trialWindow()
  const place = placeOf(input)
  const hospital: Hospital = {
    id,
    name: input.hospitalName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    ...place,
    address: input.address.trim(),
    departments: ['General Medicine'],
    customRoles: [],
    locations: [place.city],
    verified: false,
    representative: '',
    representativeRole: '',
    plan: 'trial',
    renewalDate: trial.renewalDate,
    notifications: { applications: true, reviews: true, shifts: true, payroll: true, billing: true },
    permissions: ['jobs.read', 'jobs.write', 'workers.read', 'billing.read', 'notifications.read'],
  }
  const user: User = {
    id: uid(),
    email: hospital.email,
    passwordHash: await bcrypt.hash(input.password, 10),
    role: 'hospital',
    hospitalId: id,
  }
  await Hospitals.create(hospital)
  await Users.create(user)
  await Subscriptions.create({
    hospitalId: id,
    plan: 'trial',
    status: 'trial',
    months: 0,
    startedAt: trial.startedAt,
    renewalDate: trial.renewalDate,
    locationLimit: TRIAL.locations,
    requestLimit: TRIAL.activeRequests,
  })
  await notify(id, {
    type: 'billing',
    title: `Your ${TRIAL.days}-day free trial has started`,
    body: 'Every hospital feature is open. Choose a plan before the trial ends to keep posting requests.',
    href: '/subscription',
  })
  return { user, hospital }
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
