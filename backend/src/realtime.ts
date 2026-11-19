import mongoose from 'mongoose'
import type { Server } from 'socket.io'
import { supportsChangeStreams } from './db.js'
import { Notifications } from './models.js'
import type { Notification } from './types.js'

export type Entity =
  | 'session'
  | 'jobs'
  | 'applications'
  | 'shifts'
  | 'contracts'
  | 'payouts'
  | 'workers'
  | 'subscription'
  | 'billing'
  | 'notifications'
  | 'catalog'

let io: Server | null = null

export function attachRealtime(server: Server) {
  io = server
}

export function hospitalRoom(hospitalId: string) {
  return `hospital:${hospitalId}`
}

export function changed(hospitalId: string, ...entities: Entity[]) {
  io?.to(hospitalRoom(hospitalId)).emit('data:changed', { entities })
}

export function notificationCreated(notification: Notification, unread: number) {
  io?.to(hospitalRoom(notification.hospitalId)).emit('notification:new', { notification, unread })
}

export function notificationsSynced(hospitalId: string, unread: number) {
  io?.to(hospitalRoom(hospitalId)).emit('notification:sync', { unread })
}

const ENTITY_BY_COLLECTION: Record<string, Entity[]> = {
  hospitals: ['session'],
  jobs: ['jobs'],
  applications: ['applications'],
  shifts: ['shifts', 'contracts'],
  contracts: ['contracts'],
  payouts: ['payouts', 'contracts'],
  workers: ['workers', 'applications'],
  workerReviews: ['workers'],
  subscriptions: ['subscription'],
  invoices: ['billing'],
}

function entitiesForCollection(name: string): Entity[] | null {
  if (ENTITY_BY_COLLECTION[name]) return ENTITY_BY_COLLECTION[name]
  if (name === 'notifications' || name === 'catalogs') return null
  if (name.endsWith('.files') || name.endsWith('.chunks') || /doc|upload|file|kyc|media|attach|cert|proof|image/i.test(name)) {
    return ['applications', 'workers']
  }
  return null
}

async function hospitalIdFromDoc(doc: Record<string, unknown>) {
  const direct = String(doc.hospitalId || doc.hospital_id || '')
  if (direct) return direct
  const db = mongoose.connection.db
  if (!db) return ''
  const ids = [doc.applicationId, doc.jobId, doc.workerId, doc.userId, doc.uid]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  for (const id of ids) {
    try {
      const application = await db.collection('applications').findOne(
        { $or: [{ id }, { jobId: id }, { workerId: id }] },
        { projection: { hospitalId: 1 } },
      )
      if (application?.hospitalId) return String(application.hospitalId)
    } catch {
      /* skip */
    }
  }
  return ''
}

/**
 * Mirrors writes made by any client of the database (for example the admin panel
 * or the worker app) to connected hospital sockets. Requires a replica set.
 */
export async function watchDatabase() {
  if (!(await supportsChangeStreams())) {
    console.log('Realtime: standalone MongoDB, broadcasting API writes only (change streams need a replica set).')
    return
  }
  const stream = mongoose.connection.watch(
    [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
    { fullDocument: 'updateLookup' },
  )
  stream.on('change', async (event) => {
    if (!('fullDocument' in event) || !event.fullDocument) return
    const collection = event.ns.coll
    if (collection.startsWith('system.')) return
    const doc = event.fullDocument as Record<string, unknown>
    if (collection === 'catalogs') {
      io?.emit('data:changed', { entities: ['catalog'] })
      return
    }
    const entities = entitiesForCollection(collection)
    const hospitalId = collection === 'hospitals' ? String(doc.id || '') : await hospitalIdFromDoc(doc)
    if (collection === 'notifications') {
      if (!hospitalId) return
      const unread = await Notifications.countDocuments({ hospitalId, read: false })
      if (event.operationType === 'insert') {
        const { _id, ...notification } = doc
        void _id
        notificationCreated(notification as unknown as Notification, unread)
      } else {
        notificationsSynced(hospitalId, unread)
      }
      return
    }
    if (!entities?.length) return
    if (hospitalId) {
      changed(hospitalId, ...entities)
      return
    }
    io?.emit('data:changed', { entities })
  })
  stream.on('error', (error) => console.error('Realtime change stream stopped:', error.message))
  console.log('Realtime: watching MongoDB change streams.')
}
