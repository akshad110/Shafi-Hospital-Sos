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
  workers: ['workers'],
  workerReviews: ['workers'],
  subscriptions: ['subscription'],
  invoices: ['billing'],
}

/**
 * Mirrors writes made by any client of the database (for example the admin panel)
 * to connected hospital sockets. Requires a replica set, which Atlas always provides.
 */
export async function watchDatabase() {
  if (!(await supportsChangeStreams())) {
    console.log('Realtime: standalone MongoDB, broadcasting API writes only (change streams need a replica set).')
    return
  }
  const collections = [...Object.keys(ENTITY_BY_COLLECTION), 'notifications', 'catalogs']
  const stream = mongoose.connection.watch(
    [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] }, 'ns.coll': { $in: collections } } }],
    { fullDocument: 'updateLookup' },
  )
  stream.on('change', async (event) => {
    if (!('fullDocument' in event) || !event.fullDocument) return
    const collection = event.ns.coll
    const doc = event.fullDocument as Record<string, unknown>
    if (collection === 'catalogs') {
      io?.emit('data:changed', { entities: ['catalog'] })
      return
    }
    const hospitalId = String(collection === 'hospitals' ? doc.id : doc.hospitalId || '')
    if (!hospitalId) return
    if (collection === 'notifications') {
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
    changed(hospitalId, ...ENTITY_BY_COLLECTION[collection])
  })
  stream.on('error', (error) => console.error('Realtime change stream stopped:', error.message))
  console.log('Realtime: watching MongoDB change streams.')
}
