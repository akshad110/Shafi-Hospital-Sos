import { io, type Socket } from 'socket.io-client'
import { readAccessToken } from '../api/client'

function socketOrigin() {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  return base && /^https?:\/\//.test(base) ? new URL(base).origin : window.location.origin
}

export function openSocket(): Socket {
  return io(socketOrigin(), {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { token: readAccessToken() },
  })
}
