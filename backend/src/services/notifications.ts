import { HIDE, Hospitals, Notifications } from '../models.js'
import { notificationCreated, notificationsSynced } from '../realtime.js'
import { nowIso, uid } from '../lib/util.js'
import type { Notification, NotificationCategory, NotificationPrefs } from '../types.js'

const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  application: 'applications',
  placement: 'applications',
  review: 'reviews',
  shift: 'shifts',
  attendance: 'shifts',
  payroll: 'payroll',
  billing: 'billing',
}

export const CATEGORIES: NotificationCategory[] = ['applications', 'reviews', 'shifts', 'payroll', 'billing', 'system']

export interface NotifyInput {
  type: string
  title: string
  body: string
  href: string
  priority?: 'normal' | 'high'
}

async function unreadCount(hospitalId: string) {
  return Notifications.countDocuments({ hospitalId, read: false })
}

export async function notify(hospitalId: string, input: NotifyInput) {
  const category = CATEGORY_BY_TYPE[input.type] || 'system'
  if (category !== 'system') {
    const hospital = await Hospitals.findOne({ id: hospitalId }, { notifications: 1 }).lean()
    const prefs = hospital?.notifications as NotificationPrefs | undefined
    if (prefs && prefs[category] === false) return null
  }
  const notification: Notification = {
    id: uid(),
    hospitalId,
    type: input.type,
    category,
    priority: input.priority || 'normal',
    title: input.title,
    body: input.body,
    href: input.href,
    read: false,
    createdAt: nowIso(),
  }
  await Notifications.create(notification)
  notificationCreated(notification, await unreadCount(hospitalId))
  return notification
}

export async function listNotifications(hospitalId: string, query: { status?: 'unread' | 'read'; category?: string; limit?: number }) {
  const filter: Record<string, unknown> = { hospitalId }
  if (query.status) filter.read = query.status === 'read'
  if (query.category && CATEGORIES.includes(query.category as NotificationCategory)) filter.category = query.category
  const limit = Math.min(200, Math.max(1, query.limit || 100))
  const [items, unread, grouped] = await Promise.all([
    Notifications.find(filter, HIDE).sort({ createdAt: -1 }).limit(limit).lean(),
    unreadCount(hospitalId),
    Notifications.aggregate<{ _id: string; total: number; unread: number }>([
      { $match: { hospitalId } },
      { $group: { _id: '$category', total: { $sum: 1 }, unread: { $sum: { $cond: ['$read', 0, 1] } } } },
    ]),
  ])
  const categories = Object.fromEntries(CATEGORIES.map((key) => {
    const row = grouped.find((item) => item._id === key)
    return [key, { total: row?.total || 0, unread: row?.unread || 0 }]
  }))
  const total = grouped.reduce((sum, row) => sum + row.total, 0)
  return { items, unread, total, categories }
}

export async function setNotificationRead(hospitalId: string, id: string, read: boolean) {
  const notification = await Notifications.findOneAndUpdate(
    { hospitalId, id },
    read ? { $set: { read: true, readAt: nowIso() } } : { $set: { read: false }, $unset: { readAt: 1 } },
    { new: true, projection: HIDE },
  ).lean()
  if (notification) notificationsSynced(hospitalId, await unreadCount(hospitalId))
  return notification
}

export async function markAllNotificationsRead(hospitalId: string, category?: string) {
  const filter: Record<string, unknown> = { hospitalId, read: false }
  if (category) filter.category = category
  const result = await Notifications.updateMany(filter, { $set: { read: true, readAt: nowIso() } })
  notificationsSynced(hospitalId, await unreadCount(hospitalId))
  return result.modifiedCount
}

export async function deleteNotification(hospitalId: string, id: string) {
  const result = await Notifications.deleteOne({ hospitalId, id })
  notificationsSynced(hospitalId, await unreadCount(hospitalId))
  return result.deletedCount > 0
}

export async function clearReadNotifications(hospitalId: string) {
  const result = await Notifications.deleteMany({ hospitalId, read: true })
  notificationsSynced(hospitalId, await unreadCount(hospitalId))
  return result.deletedCount
}
