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
import { PLAN_MONTHLY } from '../billing.js'
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
  await Plans.updateOne({ code: 'starter' }, { $set: { price: PLAN_MONTHLY.starter, months: 1 } })
  await Plans.updateOne({ code: 'professional' }, { $set: { price: PLAN_MONTHLY.professional * 6, months: 6 } })
  await Plans.updateOne({ code: 'enterprise' }, { $set: { price: PLAN_MONTHLY.enterprise * 12, months: 12 } })
  await Workers.updateMany({ certifications: { $exists: false } }, { $set: { certifications: [] } })
  await Applications.updateMany({ messages: { $exists: false } }, { $set: { messages: [] } })
  await Applications.updateMany({ documentReviews: { $exists: false } }, { $set: { documentReviews: [] } })
  await Workers.updateMany({ documents: { $exists: false } }, { $set: { documents: [] } })
  await Catalogs.updateOne({ key: 'documentRejectReasons' }, { $set: { key: 'documentRejectReasons', value: CATALOG_SEED.documentRejectReasons } }, { upsert: true })
  await Jobs.updateMany({ status: 'pending_review' }, { $set: { status: 'approved' } })
  await Jobs.updateMany({ requiredDocuments: { $exists: false } }, { $set: { requiredDocuments: [] } })
  await Applications.updateMany({ uploads: { $exists: false } }, { $set: { uploads: [] } })
  await Catalogs.updateOne({ key: 'documentRequests' }, { $set: { key: 'documentRequests', value: CATALOG_SEED.documentRequests } }, { upsert: true })
  await Catalogs.updateOne({ key: 'faqs' }, { $set: { value: CATALOG_SEED.faqs } }, { upsert: true })
  for (const [id, certifications] of Object.entries(DEMO_CERTS)) {
    await Workers.updateOne(
      { id, $or: [{ certifications: { $exists: false } }, { certifications: { $size: 0 } }] },
      { $set: { certifications } },
    )
  }
}
