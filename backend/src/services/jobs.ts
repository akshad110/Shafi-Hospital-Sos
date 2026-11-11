import { HIDE, Jobs } from '../models.js'
import { changed } from '../realtime.js'
import { escapeRegex, httpError, nowIso, paging, uid } from '../lib/util.js'
import { rememberChoices } from './accounts.js'
import { assertCanPost } from './billing.js'
import { notify } from './notifications.js'
import { presentDayPay, resolvePayRules } from '../lib/payRules.js'
import type { Job } from '../types.js'

export type JobInput = Omit<Job, 'id' | 'hospitalId' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Job['status'] }

export async function listJobs(hospitalId: string, query: { q?: string; status?: string; urgent?: string; role?: string; department?: string; shiftType?: string; page?: number; limit?: number }) {
  const filter: Record<string, unknown> = { hospitalId }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i')
    filter.$or = [{ title: pattern }, { department: pattern }, { role: pattern }, { location: pattern }]
  }
  if (query.status) filter.status = query.status
  if (query.urgent === 'true') filter.urgent = true
  if (query.role) filter.role = query.role
  if (query.department) filter.department = query.department
  if (query.shiftType) filter.shiftType = query.shiftType
  const { page, limit, skip } = paging(query.page, query.limit)
  const [items, total] = await Promise.all([
    Jobs.find(filter, HIDE).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Job[]>(),
    Jobs.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

export async function getJob(hospitalId: string, id: string) {
  return Jobs.findOne({ hospitalId, id }, HIDE).lean<Job>()
}

async function liveNotice(hospitalId: string, job: Job) {
  await notify(hospitalId, {
    type: 'review',
    title: 'Request is live',
    body: `${job.title} is visible to workers. You can review applications from this portal.`,
    href: `/find?id=${job.id}`,
  })
}

export async function createJob(hospitalId: string, input: JobInput) {
  const status = input.status === 'draft' ? 'draft' : 'approved'
  if (status !== 'draft') await assertCanPost(hospitalId)
  const duplicate = await Jobs.exists({
    hospitalId,
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  })
  if (duplicate) throw httpError(409, 'This request was just submitted')
  const now = nowIso()
  const job: Job = {
    ...input,
    department: input.department.trim(),
    role: input.role.trim(),
    requiredDocuments: (input.requiredDocuments || []).map((item) => ({
      id: item.id,
      name: item.name.trim(),
      instruction: item.instruction?.trim() || 'Upload an original photo or PDF of this document.',
    })),
    payRules: resolvePayRules(input.payRules, presentDayPay(input.amount, input.paymentUnit)),
    status,
    id: uid(),
    hospitalId,
    createdAt: now,
    updatedAt: now,
  }
  await Jobs.create(job)
  await rememberChoices(hospitalId, job)
  changed(hospitalId, 'jobs')
  if (status === 'approved') await liveNotice(hospitalId, job)
  return job
}

const LOCKED = new Set(['id', 'hospitalId', 'status', 'createdAt', 'updatedAt'])

export async function updateJob(hospitalId: string, id: string, patch: Partial<Job>) {
  const job = await getJob(hospitalId, id)
  if (!job) return null
  if (['filled', 'cancelled'].includes(job.status)) throw httpError(409, 'This request can no longer be edited')
  const update: Record<string, unknown> = { updatedAt: nowIso() }
  for (const [key, value] of Object.entries(patch)) {
    if (!LOCKED.has(key) && value !== undefined) update[key] = value
  }
  const next = await Jobs.findOneAndUpdate({ hospitalId, id }, { $set: update }, { new: true, projection: HIDE }).lean<Job>()
  if (next) {
    await rememberChoices(hospitalId, next)
    changed(hospitalId, 'jobs')
  }
  return next
}

export async function submitJob(hospitalId: string, id: string) {
  const job = await getJob(hospitalId, id)
  if (!job) return null
  if (job.status !== 'draft' && job.status !== 'rejected') throw httpError(409, 'Only a draft or rejected request can be submitted')
  await assertCanPost(hospitalId)
  const next = await Jobs.findOneAndUpdate(
    { hospitalId, id, status: { $in: ['draft', 'rejected'] } },
    { $set: { status: 'approved', updatedAt: nowIso() } },
    { new: true, projection: HIDE },
  ).lean<Job>()
  if (!next) throw httpError(409, 'This request was already submitted')
  changed(hospitalId, 'jobs')
  await liveNotice(hospitalId, next)
  return next
}

export async function cancelJob(hospitalId: string, id: string) {
  const job = await Jobs.findOneAndUpdate({ hospitalId, id }, { $set: { status: 'cancelled', updatedAt: nowIso() } }, { new: true, projection: HIDE }).lean<Job>()
  if (job) changed(hospitalId, 'jobs')
  return job
}
