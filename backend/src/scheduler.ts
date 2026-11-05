import { Contracts, HIDE, Hospitals, Shifts, Subscriptions, Workers } from './models.js'
import { changed } from './realtime.js'
import { nowIso, ymd } from './lib/util.js'
import { liveShiftStatus, summarize } from './services/payroll.js'
import { notify } from './services/notifications.js'
import type { Contract, Shift, Subscription } from './types.js'

const INTERVAL_MS = 60 * 1000

async function advanceShifts() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const open = await Shifts.find({ status: { $in: ['upcoming', 'active'] }, date: { $lte: ymd(tomorrow) } }, HIDE).lean<Shift[]>()
  const touched = new Set<string>()
  for (const shift of open) {
    const next = liveShiftStatus(shift)
    if (next === shift.status) continue
    await Shifts.updateOne({ id: shift.id, status: shift.status }, { $set: { status: next } })
    touched.add(shift.hospitalId)
    if (next === 'completed' && shift.attendance?.status === 'pending') {
      const worker = await Workers.findOne({ id: shift.workerId }, { name: 1 }).lean()
      await notify(shift.hospitalId, {
        type: 'attendance',
        title: 'Attendance needs marking',
        body: `${worker?.name || 'A worker'}'s ${shift.department} shift has ended without an attendance mark.`,
        href: shift.contractId ? `/attendance/${shift.contractId}` : `/shifts?id=${shift.id}`,
      })
    }
  }
  for (const hospitalId of touched) changed(hospitalId, 'shifts', 'contracts')
}

async function closeContracts() {
  const ended = await Contracts.find({ status: 'active', endDate: { $lt: ymd() } }, HIDE).lean<Contract[]>()
  for (const contract of ended) {
    const result = await Contracts.updateOne({ id: contract.id, status: 'active' }, { $set: { status: 'completed', completedAt: nowIso() } })
    if (!result.modifiedCount) continue
    const [shifts, worker] = await Promise.all([
      Shifts.find({ contractId: contract.id }, HIDE).lean<Shift[]>(),
      Workers.findOne({ id: contract.workerId }, { name: 1 }).lean(),
    ])
    const summary = summarize(contract, shifts)
    await notify(contract.hospitalId, {
      type: 'payroll',
      priority: 'high',
      title: `Contract completed — ${worker?.name || 'worker'}`,
      body: summary.pending
        ? `${contract.title} has ended. Mark ${summary.pending} remaining shift${summary.pending === 1 ? '' : 's'} to release the salary.`
        : `${contract.title} has ended. ₹${summary.gross.toLocaleString('en-IN')} is ready to pay.`,
      href: `/attendance/${contract.id}`,
    })
    changed(contract.hospitalId, 'contracts', 'workers')
  }
}

async function expireSubscriptions() {
  const lapsed = await Subscriptions.find({ status: { $in: ['trial', 'active'] }, renewalDate: { $lt: nowIso() } }, HIDE).lean<Subscription[]>()
  for (const subscription of lapsed) {
    const result = await Subscriptions.updateOne({ hospitalId: subscription.hospitalId, status: subscription.status }, { $set: { status: 'expired' } })
    if (!result.modifiedCount) continue
    await notify(subscription.hospitalId, {
      type: 'billing',
      priority: 'high',
      title: subscription.plan === 'trial' ? 'Your free trial has ended' : 'Your plan has expired',
      body: 'Choose a plan to keep posting staffing requests.',
      href: '/subscription',
    })
    changed(subscription.hospitalId, 'subscription', 'session')
  }
}

async function tick() {
  try {
    await advanceShifts()
    await closeContracts()
    await expireSubscriptions()
  } catch (error) {
    console.error('Scheduler run failed:', (error as Error).message)
  }
}

export function startScheduler() {
  void Hospitals.exists({}).then(() => tick())
  return setInterval(tick, INTERVAL_MS)
}
