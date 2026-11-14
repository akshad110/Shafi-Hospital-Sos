import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, requireAdmin } from '../http.js'
import {
  approveHospital,
  deliverHospitalMail,
  getHospitalDocumentFile,
  getHospitalForAdmin,
  listHospitalsForAdmin,
  rejectHospital,
} from '../services/accounts.js'
import type { HospitalVerification } from '../types.js'

export const adminRouter = Router()

adminRouter.use('/admin', requireAdmin)

const statusSchema = z.enum(['pending', 'approved', 'rejected'])

adminRouter.get('/admin/hospitals', asyncHandler(async (req, res) => {
  const status = statusSchema.catch('pending').parse(req.query.status)
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 20)
  res.json(await listHospitalsForAdmin(status as HospitalVerification, page, limit))
}))

adminRouter.get('/admin/hospitals/:id', asyncHandler(async (req, res) => {
  res.json(await getHospitalForAdmin(req.params.id))
}))

adminRouter.get('/admin/hospitals/:id/documents/:docId', asyncHandler(async (req, res) => {
  const file = await getHospitalDocumentFile(req.params.id, req.params.docId)
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`)
  res.send(file.data)
}))

adminRouter.post('/admin/hospitals/:id/mail/:mailId/send', asyncHandler(async (req, res) => {
  res.json(await deliverHospitalMail(req.params.id, req.params.mailId))
}))

adminRouter.post('/admin/hospitals/:id/approve', asyncHandler(async (req, res) => {
  const result = await approveHospital(req.params.id)
  res.json(result)
}))

adminRouter.post('/admin/hospitals/:id/reject', asyncHandler(async (req, res) => {
  const body = z.object({
    reason: z.string().trim().min(8, 'Enter a reason the hospital can act on'),
  }).parse(req.body)
  res.json(await rejectHospital(req.params.id, body.reason))
}))
