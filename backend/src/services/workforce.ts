import { Contracts, HIDE, Shifts, Tickets, Workers } from '../models.js'
import { changed } from '../realtime.js'
import { escapeRegex, nowIso, uid } from '../lib/util.js'
import { payForStatus } from '../lib/payRules.js'
import { listContracts, liveShiftStatus, rulesFor } from './payroll.js'
import type { Contract, Shift, Worker } from '../types.js'

async function withWorkers(hospitalId: string, shifts: Shift[]) {
  const [workers, contracts] = await Promise.all([
    Workers.find({ hospitalId, id: { $in: [...new Set(shifts.map((item) => item.workerId))] } }, HIDE).lean<Worker[]>(),
    Contracts.find({ hospitalId, id: { $in: [...new Set(shifts.map((item) => item.contractId).filter(Boolean))] } }, HIDE).lean<Contract[]>(),
  ])
  return shifts.map((shift) => {
    const worker = workers.find((item) => item.id === shift.workerId)
    const contract = contracts.find((item) => item.id === shift.contractId)
    const payRules = contract ? rulesFor(contract) : undefined
    return {
      ...shift,
      status: liveShiftStatus(shift),
      workerName: worker?.name || 'Unassigned',
      workerRole: worker?.role || '',
      verified: worker?.verified || false,
      qualifications: worker?.qualifications || [],
      contractTitle: contract?.title || '',
      attendanceLocked: contract?.status === 'paid',
      payRules,
      earned: payRules ? payForStatus(shift.attendance?.status || 'pending', payRules) : 0,
    }
  })
}

export async function listShifts(hospitalId: string, query: { status?: string; department?: string; date?: string; workerId?: string }) {
  const filter: Record<string, unknown> = { hospitalId }
  if (query.department) filter.department = query.department
  if (query.date) filter.date = query.date
  if (query.workerId) filter.workerId = query.workerId
  const rows = await Shifts.find(filter, HIDE).sort({ date: 1, startTime: 1 }).lean<Shift[]>()
  const cards = await withWorkers(hospitalId, rows)
  return query.status ? cards.filter((shift) => shift.status === query.status) : cards
}

export async function getShift(hospitalId: string, id: string) {
  const shift = await Shifts.findOne({ hospitalId, id }, HIDE).lean<Shift>()
  if (!shift) return null
  const [card] = await withWorkers(hospitalId, [shift])
  return card
}

export async function addShiftNote(hospitalId: string, id: string, message: string) {
  const result = await Shifts.updateOne({ hospitalId, id }, { $push: { notes: { id: uid(), message, at: nowIso() } } })
  if (!result.matchedCount) return null
  changed(hospitalId, 'shifts')
  return getShift(hospitalId, id)
}

export async function listWorkers(hospitalId: string, q?: string) {
  const filter: Record<string, unknown> = { hospitalId }
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: pattern }, { role: pattern }, { skills: pattern }]
  }
  const [workers, counts, open] = await Promise.all([
    Workers.find(filter, HIDE).sort({ name: 1 }).lean<Worker[]>(),
    Shifts.aggregate<{ _id: string; total: number }>([{ $match: { hospitalId } }, { $group: { _id: '$workerId', total: { $sum: 1 } } }]),
    Contracts.aggregate<{ _id: string; total: number }>([{ $match: { hospitalId, status: { $in: ['active', 'completed'] } } }, { $group: { _id: '$workerId', total: { $sum: 1 } } }]),
  ])
  return workers.map((worker) => ({
    ...worker,
    assignments: counts.find((row) => row._id === worker.id)?.total || 0,
    openContracts: open.find((row) => row._id === worker.id)?.total || 0,
  }))
}

export async function getWorker(hospitalId: string, id: string) {
  const worker = await Workers.findOne({ hospitalId, id }, HIDE).lean<Worker>()
  if (!worker) return null
  const [shifts, contracts] = await Promise.all([
    listShifts(hospitalId, { workerId: id }),
    listContracts(hospitalId, { workerId: id }),
  ])
  const attendance = { present: 0, late: 0, halfDay: 0, absent: 0 }
  for (const shift of shifts) {
    const status = shift.attendance?.status
    if (status === 'present') attendance.present += 1
    if (status === 'late') attendance.late += 1
    if (status === 'half_day') attendance.halfDay += 1
    if (status === 'absent') attendance.absent += 1
  }
  return { ...worker, assignments: shifts.length, shifts: shifts.reverse(), contracts: contracts.items, attendance }
}

export async function createTicket(hospitalId: string, subject: string, message: string) {
  const ticket = { id: uid(), hospitalId, subject, message, status: 'open' as const, createdAt: nowIso() }
  await Tickets.create(ticket)
  return ticket
}
