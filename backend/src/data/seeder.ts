import type { Model } from 'mongoose'
import {
  Applications,
  Catalogs,
  Contracts,
  Hospitals,
  Invoices,
  Jobs,
  Notifications,
  Payouts,
  Plans,
  Sessions,
  Shifts,
  Subscriptions,
  Tickets,
  Users,
  Workers,
} from '../models.js'
import { CATALOG_SEED } from '../catalog.js'
import { createSeed } from './seed.js'

export async function isDatabaseEmpty() {
  return !(await Hospitals.exists({}))
}

export async function seedDatabase() {
  const seed = createSeed()
  const targets: [Model<any>, unknown[]][] = [
    [Users, seed.users],
    [Hospitals, seed.hospitals],
    [Catalogs, seed.catalogs],
    [Plans, seed.plans],
    [Subscriptions, seed.subscriptions],
    [Invoices, seed.invoices],
    [Workers, seed.workers],
    [Jobs, seed.jobs],
    [Applications, seed.applications],
    [Contracts, seed.contracts],
    [Shifts, seed.shifts],
    [Payouts, seed.payouts],
    [Notifications, seed.notifications],
    [Tickets, seed.tickets],
  ]
  await Sessions.deleteMany({})
  for (const [model, rows] of targets) {
    await model.deleteMany({})
    if (rows.length) await model.insertMany(rows)
  }
  return Object.fromEntries(targets.map(([model, rows]) => [model.collection.collectionName, rows.length]))
}

const DEMO_CERTS: Record<string, string[]> = {
  'w-ananya': ['RN license', 'ACLS'],
  'w-rahul': ['BLS'],
  'w-priya': [],
  'w-joseph': ['Caregiver certificate'],
}

export async function ensureHospitalHiring() {
  await Workers.updateMany({ certifications: { $exists: false } }, { $set: { certifications: [] } })
  await Applications.updateMany({ messages: { $exists: false } }, { $set: { messages: [] } })
  await Jobs.updateMany({ status: 'pending_review' }, { $set: { status: 'approved' } })
  await Catalogs.updateOne({ key: 'documentRequests' }, { $set: { key: 'documentRequests', value: CATALOG_SEED.documentRequests } }, { upsert: true })
  await Catalogs.updateOne({ key: 'faqs' }, { $set: { value: CATALOG_SEED.faqs } }, { upsert: true })
  for (const [id, certifications] of Object.entries(DEMO_CERTS)) {
    await Workers.updateOne(
      { id, $or: [{ certifications: { $exists: false } }, { certifications: { $size: 0 } }] },
      { $set: { certifications } },
    )
  }
}
