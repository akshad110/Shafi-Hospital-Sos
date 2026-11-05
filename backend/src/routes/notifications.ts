import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http.js'
import {
  CATEGORIES,
  clearReadNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from '../services/notifications.js'
import { found, hospitalId } from './hospital.js'

export const notificationsRouter = Router()

const category = z.enum(CATEGORIES as [string, ...string[]]).optional()

notificationsRouter.get('/notifications', asyncHandler(async (req, res) => {
  const query = z.object({
    status: z.enum(['unread', 'read']).optional(),
    category,
    limit: z.coerce.number().optional(),
  }).parse(req.query)
  res.json(await listNotifications(hospitalId(req), query))
}))

notificationsRouter.patch('/notifications/:notificationId', asyncHandler(async (req, res) => {
  const body = z.object({ read: z.boolean() }).parse(req.body)
  found(res, await setNotificationRead(hospitalId(req), req.params.notificationId, body.read), 'notification', 'Notification not found')
}))

notificationsRouter.patch('/notifications/:notificationId/read', asyncHandler(async (req, res) => {
  found(res, await setNotificationRead(hospitalId(req), req.params.notificationId, true), 'notification', 'Notification not found')
}))

notificationsRouter.post('/notifications/read-all', asyncHandler(async (req, res) => {
  const body = z.object({ category }).parse(req.body || {})
  res.json({ updated: await markAllNotificationsRead(hospitalId(req), body.category) })
}))

notificationsRouter.delete('/notifications/:notificationId', asyncHandler(async (req, res) => {
  const removed = await deleteNotification(hospitalId(req), req.params.notificationId)
  if (!removed) {
    res.status(404).json({ message: 'Notification not found' })
    return
  }
  res.json({ ok: true })
}))

notificationsRouter.delete('/notifications', asyncHandler(async (req, res) => {
  z.object({ scope: z.literal('read') }).parse(req.query)
  res.json({ removed: await clearReadNotifications(hospitalId(req)) })
}))
