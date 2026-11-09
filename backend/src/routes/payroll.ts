import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http.js'
import { getContract, listContracts, listPayouts, markAttendance, markRemaining, payContract } from '../services/payroll.js'
import { found, hospitalId } from './hospital.js'

export const payrollRouter = Router()

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM').optional()

payrollRouter.get('/hospital/contracts', asyncHandler(async (req, res) => {
  const query = z.object({ status: z.enum(['active', 'completed', 'paid', 'cancelled']).optional(), workerId: z.string().optional() }).parse(req.query)
  res.json(await listContracts(hospitalId(req), query))
}))

payrollRouter.get('/hospital/contracts/:contractId', asyncHandler(async (req, res) => {
  found(res, await getContract(hospitalId(req), req.params.contractId), 'contract', 'Contract not found')
}))

payrollRouter.patch('/hospital/shifts/:shiftId/attendance', asyncHandler(async (req, res) => {
  const body = z.object({
    status: z.enum(['pending', 'present', 'late', 'half_day', 'absent']),
    checkIn: time,
    checkOut: time,
    note: z.string().max(200).optional(),
  }).parse(req.body)
  found(res, await markAttendance(hospitalId(req), req.params.shiftId, body, req.userId), 'shift', 'Shift not found')
}))

payrollRouter.post('/hospital/contracts/:contractId/attendance', asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['present', 'late', 'half_day', 'absent']) }).parse(req.body)
  found(res, await markRemaining(hospitalId(req), req.params.contractId, body.status, req.userId), 'result', 'Contract not found')
}))

payrollRouter.post('/hospital/contracts/:contractId/pay', asyncHandler(async (req, res) => {
  const body = z.object({
    method: z.enum(['bank_transfer', 'upi', 'cash', 'cheque']),
    reference: z.string().max(80).optional(),
    adjustment: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    note: z.string().max(200).optional(),
  }).parse(req.body)
  const payout = await payContract(hospitalId(req), req.params.contractId, body)
  if (!payout) {
    res.status(404).json({ message: 'Contract not found' })
    return
  }
  res.status(201).json({ payout })
}))

payrollRouter.get('/hospital/payouts', asyncHandler(async (req, res) => {
  res.json({ items: await listPayouts(hospitalId(req)) })
}))
