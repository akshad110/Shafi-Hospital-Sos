import { Contracts, HIDE, Payouts, Shifts, Workers } from '../models.js'
import { changed } from '../realtime.js'
import { payForStatus, presentDayPay, resolvePayRules, statusAllowed } from '../lib/payRules.js'
import { httpError, nowIso, shiftHours, shiftWindow, uid, ymd } from '../lib/util.js'
import { notify } from './notifications.js'
import type { AttendanceStatus, Contract, ContractStatus, PayRules, Payout, PayoutMethod, PayrollBreakdown, Shift, Worker } from '../types.js'

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  pending: 'Not marked',
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
}

export function liveShiftStatus(shift: Pick<Shift, 'status' | 'date' | 'startTime' | 'endTime'>, now = new Date()) {
  if (shift.status === 'cancelled' || shift.status === 'completed') return shift.status
  const { start, end } = shiftWindow(shift.date, shift.startTime, shift.endTime)
  if (now >= end) return 'completed'
  if (now >= start) return 'active'
  return 'upcoming'
}

export function contractStatus(contract: Pick<Contract, 'status' | 'endDate'>, today = ymd()): ContractStatus {
  if (contract.status === 'active' && contract.endDate < today) return 'completed'
  return contract.status
}

export function rulesFor(contract: Pick<Contract, 'rate' | 'paymentUnit' | 'hoursPerShift' | 'payRules'>): PayRules {
  return resolvePayRules(contract.payRules, presentDayPay(contract.rate, contract.paymentUnit, contract.hoursPerShift))
}

export function summarize(contract: Contract, shifts: Shift[]): PayrollBreakdown & { toMark: number; payRules: PayRules } {
  const today = ymd()
  const rules = rulesFor(contract)
  const result = {
    shifts: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    pending: 0,
    hours: 0,
    units: 0,
    toMark: 0,
    earnedPresent: 0,
    earnedLate: 0,
    earnedHalf: 0,
    earnedAbsent: 0,
    gross: 0,
    maxGross: 0,
  }
  for (const shift of shifts) {
    if (shift.status === 'cancelled') continue
    result.shifts += 1
    result.maxGross += rules.presentPay
    const full = shiftHours(shift.startTime, shift.endTime) || contract.hoursPerShift
    const status = shift.attendance?.status || 'pending'
    const earned = payForStatus(status, rules)
    result.gross += earned
    if (status === 'pending') {
      result.pending += 1
      if (shift.date <= today) result.toMark += 1
      continue
    }
    const hours = shift.attendance.hours ?? (status === 'half_day' ? full / 2 : status === 'absent' ? 0 : full)
    result.hours += hours
    if (status === 'absent') {
      result.absent += 1
      result.earnedAbsent += earned
    } else if (status === 'half_day') {
      result.halfDay += 1
      result.earnedHalf += earned
      result.units += 0.5
    } else if (status === 'late') {
      result.late += 1
      result.earnedLate += earned
      result.units += 1
    } else {
      result.present += 1
      result.earnedPresent += earned
      result.units += 1
    }
  }
  result.hours = Math.round(result.hours * 100) / 100
  result.units = Math.round(result.units * 100) / 100
  result.gross = Math.round(result.gross)
  result.maxGross = Math.round(result.maxGross)
  return { ...result, rate: rules.presentPay, paymentUnit: contract.paymentUnit, payRules: rules }
}

function contractView(contract: Contract, shifts: Shift[], worker?: Worker | null) {
  const status = contractStatus(contract)
  const summary = summarize(contract, shifts)
  return {
    ...contract,
    status,
    workerName: worker?.name || 'Worker',
    workerRole: worker?.role || contract.role,
    workerVerified: worker?.verified || false,
    summary,
    canPay: status === 'completed' && summary.pending === 0,
  }
}

export async function listContracts(hospitalId: string, query: { status?: string; workerId?: string }) {
  const filter: Record<string, unknown> = { hospitalId }
  if (query.workerId) filter.workerId = query.workerId
  const contracts = await Contracts.find(filter, HIDE).sort({ endDate: -1 }).lean<Contract[]>()
  const ids = contracts.map((item) => item.id)
  const [shifts, workers] = await Promise.all([
    Shifts.find({ hospitalId, contractId: { $in: ids } }, HIDE).lean<Shift[]>(),
    Workers.find({ hospitalId, id: { $in: contracts.map((item) => item.workerId) } }, HIDE).lean<Worker[]>(),
  ])
  const views = contracts.map((contract) => contractView(
    contract,
    shifts.filter((shift) => shift.contractId === contract.id),
    workers.find((worker) => worker.id === contract.workerId),
  ))
  const counts = {
    active: views.filter((item) => item.status === 'active').length,
    completed: views.filter((item) => item.status === 'completed').length,
    readyToPay: views.filter((item) => item.canPay).length,
    paid: views.filter((item) => item.status === 'paid').length,
    toMark: views.reduce((sum, item) => sum + (item.status === 'paid' ? 0 : item.summary.toMark), 0),
    due: views.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.summary.gross, 0),
  }
  const items = query.status ? views.filter((item) => item.status === query.status) : views
  return { items, counts }
}

export async function getContract(hospitalId: string, id: string) {
  const contract = await Contracts.findOne({ hospitalId, id }, HIDE).lean<Contract>()
  if (!contract) return null
  const [shifts, worker, payout] = await Promise.all([
    Shifts.find({ hospitalId, contractId: id }, HIDE).sort({ date: 1, startTime: 1 }).lean<Shift[]>(),
    Workers.findOne({ hospitalId, id: contract.workerId }, HIDE).lean<Worker>(),
    contract.payoutId ? Payouts.findOne({ hospitalId, id: contract.payoutId }, HIDE).lean<Payout>() : null,
  ])
  const rules = rulesFor(contract)
  return {
    ...contractView(contract, shifts, worker),
    worker,
    payout,
    payRules: rules,
    shifts: shifts.map((shift) => ({
      ...shift,
      status: liveShiftStatus(shift),
      earned: payForStatus(shift.attendance?.status || 'pending', rules),
    })),
  }
}

export interface AttendanceInput {
  status: AttendanceStatus
  checkIn?: string
  checkOut?: string
  note?: string
}

async function applyAttendance(shift: Shift, input: AttendanceInput) {
  const full = shiftHours(shift.startTime, shift.endTime)
  const now = nowIso()
  const set: Record<string, unknown> = {}
  if (input.status === 'pending') {
    set.attendance = { status: 'pending' }
  } else {
    const worked = input.checkIn && input.checkOut ? shiftHours(input.checkIn, input.checkOut) : undefined
    const hours = input.status === 'absent' ? 0 : worked ?? (input.status === 'half_day' ? full / 2 : full)
    set.attendance = {
      status: input.status,
      checkIn: input.status === 'absent' ? undefined : input.checkIn || shift.attendance?.checkIn,
      checkOut: input.status === 'absent' ? undefined : input.checkOut || shift.attendance?.checkOut,
      hours: Math.round(hours * 100) / 100,
      note: input.note?.trim() || undefined,
      markedAt: now,
      markedBy: 'hospital',
    }
  }
  const status = liveShiftStatus(shift)
  if (status !== shift.status) set.status = status
  await Shifts.updateOne(
    { hospitalId: shift.hospitalId, id: shift.id },
    { $set: set, $push: { attendanceLog: { label: `${ATTENDANCE_LABEL[input.status]} — marked by hospital`, at: now } } },
  )
}

async function lockedContract(hospitalId: string, contractId?: string) {
  if (!contractId) return null
  const contract = await Contracts.findOne({ hospitalId, id: contractId }, HIDE).lean<Contract>()
  if (contract?.status === 'paid') throw httpError(409, 'Salary for this contract is already paid, so attendance is locked.')
  return contract
}

async function announceIfReady(hospitalId: string, contract: Contract | null, pendingBefore: number) {
  if (!contract || contractStatus(contract) !== 'completed' || pendingBefore === 0) return
  const shifts = await Shifts.find({ hospitalId, contractId: contract.id }, HIDE).lean<Shift[]>()
  const summary = summarize(contract, shifts)
  if (summary.pending > 0) return
  const worker = await Workers.findOne({ hospitalId, id: contract.workerId }, { name: 1 }).lean()
  await notify(hospitalId, {
    type: 'payroll',
    priority: 'high',
    title: `Salary ready for ${worker?.name || 'worker'}`,
    body: `Attendance for ${contract.title} is complete. ₹${summary.gross.toLocaleString('en-IN')} is ready to pay.`,
    href: `/attendance/${contract.id}`,
  })
}

async function pendingFor(hospitalId: string, contract: Contract | null) {
  if (!contract) return 0
  const shifts = await Shifts.find({ hospitalId, contractId: contract.id }, HIDE).lean<Shift[]>()
  return summarize(contract, shifts).pending
}

export async function markAttendance(hospitalId: string, shiftId: string, input: AttendanceInput) {
  const shift = await Shifts.findOne({ hospitalId, id: shiftId }, HIDE).lean<Shift>()
  if (!shift) return null
  if (shift.status === 'cancelled') throw httpError(409, 'This shift was cancelled')
  if (shift.date > ymd()) throw httpError(409, 'Attendance can be marked from the day of the shift onwards')
  const contract = await lockedContract(hospitalId, shift.contractId)
  if (contract && !statusAllowed(input.status, rulesFor(contract))) {
    throw httpError(409, `This role does not allow marking ${input.status === 'half_day' ? 'half day' : input.status}`)
  }
  const pendingBefore = await pendingFor(hospitalId, contract)
  await applyAttendance(shift, input)
  changed(hospitalId, 'shifts', 'contracts', 'workers')
  await announceIfReady(hospitalId, contract, pendingBefore)
  return Shifts.findOne({ hospitalId, id: shiftId }, HIDE).lean<Shift>()
}

export async function markRemaining(hospitalId: string, contractId: string, status: Exclude<AttendanceStatus, 'pending'>) {
  const contract = await lockedContract(hospitalId, contractId)
  if (!contract) return null
  if (!statusAllowed(status, rulesFor(contract))) {
    throw httpError(409, `This role does not allow marking ${status === 'half_day' ? 'half day' : status}`)
  }
  const shifts = await Shifts.find({ hospitalId, contractId, status: { $ne: 'cancelled' }, 'attendance.status': 'pending', date: { $lte: ymd() } }, HIDE).lean<Shift[]>()
  const pendingBefore = await pendingFor(hospitalId, contract)
  for (const shift of shifts) await applyAttendance(shift, { status })
  if (shifts.length) {
    changed(hospitalId, 'shifts', 'contracts', 'workers')
    await announceIfReady(hospitalId, contract, pendingBefore)
  }
  return { updated: shifts.length }
}

export interface PayInput {
  method: PayoutMethod
  reference?: string
  adjustment?: number
  note?: string
}

export async function payContract(hospitalId: string, contractId: string, input: PayInput) {
  const contract = await Contracts.findOne({ hospitalId, id: contractId }, HIDE).lean<Contract>()
  if (!contract) return null
  const status = contractStatus(contract)
  if (status === 'paid') throw httpError(409, 'This salary has already been paid')
  if (status !== 'completed') throw httpError(409, 'Salary can be paid once the contract period is over')
  const shifts = await Shifts.find({ hospitalId, contractId }, HIDE).lean<Shift[]>()
  const summary = summarize(contract, shifts)
  if (summary.pending > 0) throw httpError(409, `Mark attendance for ${summary.pending} more shift${summary.pending === 1 ? '' : 's'} before paying`)
  const adjustment = Math.round(input.adjustment || 0)
  const amount = summary.gross + adjustment
  if (amount < 0) throw httpError(400, 'The deduction cannot be larger than the earned amount')
  if (adjustment !== 0 && !input.note?.trim()) throw httpError(400, 'Add a note explaining the adjustment')

  const paidAt = nowIso()
  const payoutId = uid()
  const claimed = await Contracts.findOneAndUpdate(
    { hospitalId, id: contractId, status: { $in: ['active', 'completed'] } },
    { $set: { status: 'paid', paidAt, payoutId, completedAt: contract.completedAt || paidAt } },
    { new: true },
  )
  if (!claimed) throw httpError(409, 'This salary has already been paid')

  const { toMark, ...breakdown } = summary
  void toMark
  const payout: Payout = {
    id: payoutId,
    number: `PAY-${1001 + (await Payouts.countDocuments())}`,
    hospitalId,
    workerId: contract.workerId,
    contractId,
    gross: summary.gross,
    adjustment,
    amount,
    currency: 'INR',
    method: input.method,
    reference: input.reference?.trim() || '',
    note: input.note?.trim() || '',
    breakdown,
    status: 'paid',
    paidAt,
  }
  try {
    await Payouts.create(payout)
  } catch (error) {
    await Contracts.updateOne({ hospitalId, id: contractId }, { $set: { status }, $unset: { paidAt: 1, payoutId: 1 } })
    throw error
  }
  const worker = await Workers.findOne({ hospitalId, id: contract.workerId }, { name: 1 }).lean()
  changed(hospitalId, 'contracts', 'payouts', 'workers')
  await notify(hospitalId, {
    type: 'payroll',
    title: `Salary paid to ${worker?.name || 'worker'}`,
    body: `₹${amount.toLocaleString('en-IN')} recorded for ${contract.title} (${payout.number}).`,
    href: `/attendance/${contractId}`,
  })
  return payout
}

export async function listPayouts(hospitalId: string) {
  const payouts = await Payouts.find({ hospitalId }, HIDE).sort({ paidAt: -1 }).lean<Payout[]>()
  const workers = await Workers.find({ hospitalId, id: { $in: payouts.map((item) => item.workerId) } }, { _id: 0, id: 1, name: 1 }).lean()
  return payouts.map((payout) => ({ ...payout, workerName: workers.find((worker) => worker.id === payout.workerId)?.name || 'Worker' }))
}
