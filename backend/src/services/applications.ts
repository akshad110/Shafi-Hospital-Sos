import type { PipelineStage } from 'mongoose'
import { Applications } from '../models.js'
import { changed } from '../realtime.js'
import { escapeRegex, nowIso, paging, uid } from '../lib/util.js'

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
        notes: 1,
        workerName: { $ifNull: ['$worker.name', 'Worker'] },
        role: { $ifNull: ['$worker.role', ''] },
        qualifications: { $ifNull: ['$worker.qualifications', []] },
        skills: { $ifNull: ['$worker.skills', []] },
        experience: { $ifNull: ['$worker.experience', ''] },
        verified: { $ifNull: ['$worker.verified', false] },
        jobTitle: { $ifNull: ['$job.title', ''] },
        department: { $ifNull: ['$job.department', ''] },
        amount: { $ifNull: ['$job.amount', 0] },
        paymentUnit: { $ifNull: ['$job.paymentUnit', 'shift'] },
        shiftDate: { $ifNull: ['$job.date', ''] },
        startTime: { $ifNull: ['$job.startTime', ''] },
        endTime: { $ifNull: ['$job.endTime', ''] },
        location: { $ifNull: ['$job.location', ''] },
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

export async function addApplicationNote(hospitalId: string, id: string, message: string) {
  const result = await Applications.updateOne({ hospitalId, id }, { $push: { notes: { id: uid(), message, at: nowIso() } } })
  if (!result.matchedCount) return null
  changed(hospitalId, 'applications')
  return getApplication(hospitalId, id)
}
