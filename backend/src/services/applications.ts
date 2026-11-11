import type { PipelineStage } from 'mongoose'
import { Applications, Contracts, Jobs, Shifts, Workers } from '../models.js'
import { changed } from '../realtime.js'
import { DOCUMENT_REQUESTS, documentRequestBody } from '../lib/documentRequests.js'
import { presentDayPay, resolvePayRules } from '../lib/payRules.js'
import { escapeRegex, httpError, nowIso, paging, shiftHours, uid, ymd } from '../lib/util.js'
import { liveShiftStatus } from './payroll.js'
import { notify } from './notifications.js'
import type { Application, ApplicationStatus, Contract, Job, Shift, Worker } from '../types.js'

const OPEN: ApplicationStatus[] = ['under_review', 'needs_update', 'shortlisted']
const ACTION: Record<ApplicationStatus, string> = {
  under_review: 'Application received',
  needs_update: 'Hospital asked for missing documents',
  shortlisted: 'Hospital shortlisted this worker',
  rejected: 'Hospital declined this application',
  offered: 'Hospital selected this worker',
  confirmed: 'Hospital confirmed the hire',
}

function joined(match: Record<string, unknown>): PipelineStage[] {
  return [
    { $match: match },
    { $lookup: { from: 'workers', localField: 'workerId', foreignField: 'id', as: 'worker' } },
    { $lookup: { from: 'jobs', localField: 'jobId', foreignField: 'id', as: 'job' } },
    { $set: { worker: { $first: '$worker' }, job: { $first: '$job' } } },
    {
      $project: {
        _id: 0,
        id: 1,
        hospitalId: 1,
        jobId: 1,
        workerId: 1,
        status: 1,
        appliedAt: 1,
        timeline: 1,
        messages: { $ifNull: ['$messages', []] },
        workerName: { $ifNull: ['$worker.name', 'Worker'] },
        role: { $ifNull: ['$worker.role', ''] },
        qualifications: { $ifNull: ['$worker.qualifications', []] },
        certifications: { $ifNull: ['$worker.certifications', []] },
        skills: { $ifNull: ['$worker.skills', []] },
        experience: { $ifNull: ['$worker.experience', ''] },
        verified: { $ifNull: ['$worker.verified', false] },
        credentialExpiry: { $ifNull: ['$worker.credentialExpiry', ''] },
        jobTitle: { $ifNull: ['$job.title', ''] },
        department: { $ifNull: ['$job.department', ''] },
        amount: { $ifNull: ['$job.amount', 0] },
        paymentUnit: { $ifNull: ['$job.paymentUnit', 'shift'] },
        shiftDate: { $ifNull: ['$job.date', ''] },
        startTime: { $ifNull: ['$job.startTime', ''] },
        endTime: { $ifNull: ['$job.endTime', ''] },
        location: { $ifNull: ['$job.location', ''] },
        jobQualifications: { $ifNull: ['$job.qualifications', []] },
        jobCertifications: { $ifNull: ['$job.certifications', []] },
        jobSkills: { $ifNull: ['$job.skills', []] },
      },
    },
  ]
}

export async function listApplications(hospitalId: string, query: { q?: string; status?: string; page?: number; limit?: number }) {
  const match: Record<string, unknown> = { hospitalId }
  if (query.status) match.status = query.status
  const pipeline = joined(match)
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i')
    pipeline.push({ $match: { $or: [{ workerName: pattern }, { role: pattern }, { jobTitle: pattern }] } })
  }
  const { page, limit, skip } = paging(query.page, query.limit)
  pipeline.push({ $sort: { appliedAt: -1 } }, { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'value' }] } })
  const [result] = await Applications.aggregate<{ items: unknown[]; total: { value: number }[] }>(pipeline)
  return { items: result?.items || [], total: result?.total[0]?.value || 0, page, limit }
}

export async function getApplication(hospitalId: string, id: string) {
  const [row] = await Applications.aggregate(joined({ hospitalId, id }))
  return row || null
}

async function setStatus(hospitalId: string, id: string, status: ApplicationStatus, note: string) {
  const application = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!application) return null
  if (application.status === 'confirmed' && status !== 'confirmed') throw httpError(409, 'This hire is already confirmed')
  if (application.status === 'rejected' && status !== 'under_review') throw httpError(409, 'This application was declined')
  const now = nowIso()
  await Applications.updateOne(
    { hospitalId, id },
    { $set: { status }, $push: { timeline: { status, at: now, note } } },
  )
  changed(hospitalId, 'applications', 'workers')
  return getApplication(hospitalId, id)
}

export async function shortlistApplication(hospitalId: string, id: string) {
  const current = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!current) return null
  if (!OPEN.includes(current.status) && current.status !== 'offered') throw httpError(409, 'This application can no longer be shortlisted')
  return setStatus(hospitalId, id, 'shortlisted', ACTION.shortlisted)
}

export async function rejectApplication(hospitalId: string, id: string, reason: string) {
  const current = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!current) return null
  if (current.status === 'confirmed') throw httpError(409, 'This hire is already confirmed')
  if (current.status === 'rejected') throw httpError(409, 'This application was declined')
  const note = reason.trim()
  if (note.length < 4) throw httpError(400, 'Add a reason for declining')
  const now = nowIso()
  const body = `Your application was declined. ${note}`
  await Applications.updateOne(
    { hospitalId, id },
    {
      $set: { status: 'rejected' },
      $push: {
        messages: { id: uid(), code: 'declined', body, dueBy: '', at: now },
        timeline: { status: 'rejected', at: now, note },
      },
    },
  )
  changed(hospitalId, 'applications', 'notifications')
  const worker = await Workers.findOne({ hospitalId, id: current.workerId }, { name: 1 }).lean<Worker>()
  await notify(hospitalId, {
    type: 'application',
    title: `Declined ${worker?.name || 'an application'}`,
    body: note,
    href: `/applications?id=${id}`,
  })
  return getApplication(hospitalId, id)
}

export async function offerApplication(hospitalId: string, id: string) {
  const current = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!current) return null
  if (!OPEN.includes(current.status) && current.status !== 'offered') throw httpError(409, 'This application cannot be selected')
  const next = await setStatus(hospitalId, id, 'offered', ACTION.offered)
  const worker = await Workers.findOne({ hospitalId, id: current.workerId }, { name: 1 }).lean<Worker>()
  await notify(hospitalId, {
    type: 'application',
    title: `Selected ${worker?.name || 'a worker'}`,
    body: 'The offer is saved. The worker app will show this update.',
    href: `/applications?id=${id}`,
  })
  return next
}

export async function confirmApplication(hospitalId: string, id: string) {
  const current = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!current) return null
  if (current.status === 'confirmed') return getApplication(hospitalId, id)
  if (current.status === 'rejected') throw httpError(409, 'This application was declined')
  await placeWorker(hospitalId, current)
  const next = await setStatus(hospitalId, id, 'confirmed', ACTION.confirmed)
  changed(hospitalId, 'contracts', 'shifts')
  const worker = await Workers.findOne({ hospitalId, id: current.workerId }, { name: 1 }).lean<Worker>()
  await notify(hospitalId, {
    type: 'placement',
    priority: 'high',
    title: `${worker?.name || 'Worker'} confirmed`,
    body: 'The hire is saved. They will show under Attendance.',
    href: `/applications?id=${id}`,
  })
  return next
}

export async function requestDocuments(hospitalId: string, id: string, code: string, dueBy: string, label?: string) {
  const current = await Applications.findOne({ hospitalId, id }).lean<Application>()
  if (!current) return null
  if (current.status === 'confirmed' || current.status === 'rejected') throw httpError(409, 'This application is closed')
  const due = dueBy.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < ymd()) throw httpError(400, 'Choose a due date from today onwards')
  const custom = (label || '').trim()
  if ((code === 'other' || !DOCUMENT_REQUESTS.some((item) => item.code === code)) && custom.length < 2) {
    throw httpError(400, 'Enter the document name')
  }
  const body = documentRequestBody(code, due, custom)
  const now = nowIso()
  await Applications.updateOne(
    { hospitalId, id },
    {
      $set: { status: 'needs_update' },
      $push: {
        messages: { id: uid(), code, body, dueBy: due, at: now },
        timeline: { status: 'needs_update', at: now, note: body },
      },
    },
  )
  changed(hospitalId, 'applications', 'notifications')
  const worker = await Workers.findOne({ hospitalId, id: current.workerId }, { name: 1 }).lean<Worker>()
  await notify(hospitalId, {
    type: 'application',
    title: `Asked ${worker?.name || 'the worker'} to update`,
    body,
    href: `/applications?id=${id}`,
  })
  return getApplication(hospitalId, id)
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)
  return ymd(value)
}

async function placeWorker(hospitalId: string, application: Application) {
  const existing = await Contracts.findOne({ hospitalId, jobId: application.jobId, workerId: application.workerId })
  if (existing) return
  const job = await Jobs.findOne({ hospitalId, id: application.jobId }).lean<Job>()
  if (!job) return
  const hours = shiftHours(job.startTime, job.endTime) || 8
  const startDate = job.date
  const endDate = addDays(job.date, 6)
  const now = nowIso()
  const contract: Contract = {
    id: uid(),
    hospitalId,
    workerId: application.workerId,
    jobId: job.id,
    title: `${job.role} — 7 day contract`,
    role: job.role,
    department: job.department,
    location: job.location,
    startDate,
    endDate,
    rate: job.amount,
    paymentUnit: job.paymentUnit,
    hoursPerShift: hours,
    payRules: resolvePayRules(job.payRules, presentDayPay(job.amount, job.paymentUnit, hours)),
    status: 'active',
    createdAt: now,
  }
  await Contracts.create(contract)
  const shifts: Shift[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startDate, index)
    const shift: Shift = {
      id: uid(),
      hospitalId,
      workerId: application.workerId,
      contractId: contract.id,
      department: job.department,
      location: job.location,
      date,
      startTime: job.startTime,
      endTime: job.endTime,
      amount: job.amount,
      paymentUnit: job.paymentUnit,
      status: 'upcoming',
      attendance: { status: 'pending' },
      supervisor: '',
      supervisorRole: '',
      geofence: '',
      attendanceLog: [],
      notes: [],
    }
    shift.status = liveShiftStatus(shift)
    return shift
  })
  await Shifts.insertMany(shifts)
}
