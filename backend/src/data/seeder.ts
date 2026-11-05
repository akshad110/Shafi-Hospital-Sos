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
