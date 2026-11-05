import type { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { Notifications } from './models.js'
import { attachRealtime, hospitalRoom } from './realtime.js'

export function attachSocket(io: Server) {
  attachRealtime(io)

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers.cookie, 'hos_access')
    if (!token) {
      next(new Error('unauthorized'))
      return
    }
    try {
      const payload = jwt.verify(token, config.accessSecret) as { hospitalId: string; role: string }
      if (payload.role !== 'hospital') {
        next(new Error('unauthorized'))
        return
      }
      socket.data.hospitalId = payload.hospitalId
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    const hospitalId = socket.data.hospitalId as string
    await socket.join(hospitalRoom(hospitalId))
    const unread = await Notifications.countDocuments({ hospitalId, read: false })
    socket.emit('notification:sync', { unread })
  })
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}
