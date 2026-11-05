import { Router, type Response } from 'express'
import { z } from 'zod'
import { getCatalog } from '../catalog.js'
import { asyncHandler, type AuthedRequest } from '../http.js'
import { getHospital, updateHospital } from '../services/accounts.js'
import { addApplicationNote, getApplication, listApplications } from '../services/applications.js'
import { changePlan, getSubscription, listBilling } from '../services/billing.js'
import { cancelJob, createJob, getJob, listJobs, submitJob, updateJob, type JobInput } from '../services/jobs.js'
import { addShiftNote, createTicket, getShift, getWorker, listShifts, listWorkers } from '../services/workforce.js'

export const hospitalRouter = Router()

const jobSchema = z.object({
  title: z.string().min(3, 'Add a job title'),
  department: z.string().trim().min(2, 'Choose a department'),
  role: z.string().trim().min(2, 'Choose a role'),
  description: z.string().min(10, 'Describe the requirement'),
  qualifications: z.array(z.string()).min(1, 'Add at least one qualification'),
  experience: z.string().min(1, 'Add experience'),
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
  certifications: z.array(z.string()),
  workersNeeded: z.number().int().min(1).max(50),
  date: z.string().min(8, 'Choose a date'),
  startTime: z.string().min(4, 'Add a start time'),
  endTime: z.string().min(4, 'Add an end time'),
  shiftType: z.enum(['day', 'night', 'rotating']),
  location: z.string().min(2, 'Add a location'),
  amount: z.number().positive('Enter compensation'),
  currency: z.literal('INR'),
  paymentUnit: z.enum(['hourly', 'shift', 'daily']),
  notes: z.string().optional().default(''),
  urgent: z.boolean().default(false),
  status: z.enum(['draft', 'pending_review']).optional(),
})

const pageQuery = {
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}

export function hospitalId(req: AuthedRequest) {
  return req.hospitalId!
}

export function found<T>(res: Response, value: T | null | undefined, key: string, missing: string) {
  if (!value) {
    res.status(404).json({ message: missing })
    return
  }
  res.json({ [key]: value })
}

hospitalRouter.get('/catalog', asyncHandler(async (_req, res) => {
  res.json({ catalog: await getCatalog() })
}))

hospitalRouter.get('/hospitals/me', asyncHandler(async (req, res) => {
  res.json({ hospital: await getHospital(hospitalId(req)) })
}))

hospitalRouter.patch('/hospitals/me', asyncHandler(async (req, res) => {
  const body = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(8).optional(),
    city: z.string().min(2).optional(),
    address: z.string().min(5).optional(),
    departments: z.array(z.string().min(2)).optional(),
    representative: z.string().optional(),
    representativeRole: z.string().optional(),
    notifications: z.object({
      applications: z.boolean(),
      reviews: z.boolean(),
      shifts: z.boolean(),
      payroll: z.boolean(),
      billing: z.boolean(),
    }).optional(),
  }).parse(req.body)
  res.json({ hospital: await updateHospital(hospitalId(req), body) })
}))

hospitalRouter.get('/hospital/jobs', asyncHandler(async (req, res) => {
  const query = z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    urgent: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    shiftType: z.string().optional(),
    ...pageQuery,
  }).parse(req.query)
  res.json(await listJobs(hospitalId(req), query))
}))

hospitalRouter.get('/jobs/:jobId', asyncHandler(async (req, res) => {
  found(res, await getJob(hospitalId(req), req.params.jobId), 'job', 'Request not found')
}))

hospitalRouter.post('/jobs', asyncHandler(async (req, res) => {
  const body = jobSchema.parse(req.body) as JobInput
  res.status(201).json({ job: await createJob(hospitalId(req), body) })
}))

hospitalRouter.patch('/jobs/:jobId', asyncHandler(async (req, res) => {
  const body = jobSchema.partial().parse(req.body)
  found(res, await updateJob(hospitalId(req), req.params.jobId, body), 'job', 'Request not found')
}))

hospitalRouter.post('/jobs/:jobId/submit', asyncHandler(async (req, res) => {
  found(res, await submitJob(hospitalId(req), req.params.jobId), 'job', 'Request not found')
}))

hospitalRouter.post('/jobs/:jobId/cancel', asyncHandler(async (req, res) => {
  found(res, await cancelJob(hospitalId(req), req.params.jobId), 'job', 'Request not found')
}))

hospitalRouter.get('/hospital/applications', asyncHandler(async (req, res) => {
  const query = z.object({ q: z.string().optional(), status: z.string().optional(), ...pageQuery }).parse(req.query)
  res.json(await listApplications(hospitalId(req), query))
}))

hospitalRouter.get('/applications/:applicationId', asyncHandler(async (req, res) => {
  found(res, await getApplication(hospitalId(req), req.params.applicationId), 'application', 'Application not found')
}))

hospitalRouter.post('/applications/:applicationId/notes', asyncHandler(async (req, res) => {
  const body = z.object({ message: z.string().trim().min(2, 'Write a short note') }).parse(req.body)
  found(res, await addApplicationNote(hospitalId(req), req.params.applicationId, body.message), 'application', 'Application not found')
}))

hospitalRouter.get('/hospital/shifts', asyncHandler(async (req, res) => {
  const query = z.object({ status: z.string().optional(), department: z.string().optional(), date: z.string().optional() }).parse(req.query)
  res.json({ items: await listShifts(hospitalId(req), query) })
}))

hospitalRouter.get('/hospital/shifts/:shiftId', asyncHandler(async (req, res) => {
  found(res, await getShift(hospitalId(req), req.params.shiftId), 'shift', 'Shift not found')
}))

hospitalRouter.post('/hospital/shifts/:shiftId/notes', asyncHandler(async (req, res) => {
  const body = z.object({ message: z.string().trim().min(2, 'Write a short note') }).parse(req.body)
  found(res, await addShiftNote(hospitalId(req), req.params.shiftId, body.message), 'shift', 'Shift not found')
}))

hospitalRouter.get('/hospital/workers', asyncHandler(async (req, res) => {
  const query = z.object({ q: z.string().optional() }).parse(req.query)
  res.json({ items: await listWorkers(hospitalId(req), query.q) })
}))

hospitalRouter.get('/hospital/workers/:workerId', asyncHandler(async (req, res) => {
  found(res, await getWorker(hospitalId(req), req.params.workerId), 'worker', 'Worker not found')
}))

hospitalRouter.get('/hospital/workers/:workerId/documents', asyncHandler(async (_req, res) => {
  res.status(403).json({ message: 'Credential documents stay with admin review and are not available in the hospital portal.' })
}))

hospitalRouter.get('/hospital/subscription', asyncHandler(async (req, res) => {
  res.json(await getSubscription(hospitalId(req)))
}))

hospitalRouter.post('/subscriptions/change', asyncHandler(async (req, res) => {
  const body = z.object({ plan: z.enum(['starter', 'professional', 'enterprise']) }).parse(req.body)
  res.json({ subscription: await changePlan(hospitalId(req), body.plan) })
}))

hospitalRouter.get('/hospital/billing', asyncHandler(async (req, res) => {
  res.json(await listBilling(hospitalId(req)))
}))

hospitalRouter.post('/support', asyncHandler(async (req, res) => {
  const body = z.object({
    subject: z.string().trim().min(3, 'Add a subject'),
    message: z.string().trim().min(10, 'Describe what you need'),
  }).parse(req.body)
  res.status(201).json({ ticket: await createTicket(hospitalId(req), body.subject, body.message) })
}))
