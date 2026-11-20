import { io, type Socket } from 'socket.io-client'
import { apiBase, readAccessToken } from '../api/client'

function socketOrigin() {
  const base = apiBase()
  return /^https?:\/\//.test(base) ? new URL(base).origin : window.location.origin
}

let socket: Socket | null = null
let refs = 0
let closeTimer: ReturnType<typeof setTimeout> | undefined

export function openSocket(): Socket {
  refs += 1
  window.clearTimeout(closeTimer)
  if (socket) {
    if (!socket.connected && !socket.active) socket.connect()
    return socket
  }
  socket = io(socketOrigin(), {
    path: '/socket.io',
    withCredentials: true,
    transports: import.meta.env.DEV ? ['polling', 'websocket'] : ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    timeout: 12000,
    auth: (cb) => cb({ token: readAccessToken() }),
  })
  return socket
}

export function closeSocket() {
  refs = Math.max(0, refs - 1)
  if (refs > 0) return
  closeTimer = window.setTimeout(() => {
    if (refs > 0) return
    socket?.removeAllListeners()
    socket?.disconnect()
    socket = null
  }, 400)
}
