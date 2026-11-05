import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { openSocket } from '../services/socket/socket'
import { refreshSession } from '../services/api/client'
import { cn } from '../lib/utils'
import type { Notice, NoticeList } from '../types/domain'

export type LiveStatus = 'connecting' | 'live' | 'offline'

const ENTITY_KEYS: Record<string, string[]> = {
  session: ['session'],
  jobs: ['jobs'],
  applications: ['applications', 'application'],
  shifts: ['shifts', 'worker', 'contract'],
  contracts: ['contracts', 'contract', 'worker'],
  payouts: ['payouts', 'contract'],
  workers: ['workers', 'worker'],
  subscription: ['subscription', 'session'],
  billing: ['billing'],
  notifications: ['notifications'],
  catalog: ['catalog'],
}

const RealtimeContext = createContext<LiveStatus>('connecting')

export function useLiveStatus() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const [toasts, setToasts] = useState<Notice[]>([])
  const seen = useRef(new Set<string>())
  const pending = useRef(new Set<string>())
  const timer = useRef<number | undefined>(undefined)

  const dismiss = useCallback((id: string) => setToasts((list) => list.filter((item) => item.id !== id)), [])

  useEffect(() => {
    const socket = openSocket()

    const flush = () => {
      timer.current = undefined
      const keys = [...pending.current]
      pending.current.clear()
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] })
    }
    const queue = (keys: string[]) => {
      for (const key of keys) pending.current.add(key)
      if (timer.current === undefined) timer.current = window.setTimeout(flush, 120)
    }
    const setUnread = (unread: number) => {
      queryClient.setQueriesData<NoticeList>({ queryKey: ['notifications'] }, (data) => (data ? { ...data, unread } : data))
    }

    socket.on('connect', () => {
      setStatus('live')
      queue(Object.keys(ENTITY_KEYS).flatMap((entity) => ENTITY_KEYS[entity]))
    })
    socket.on('disconnect', () => setStatus('offline'))
    socket.io.on('reconnect_attempt', () => setStatus('connecting'))
    let retry: number | undefined
    socket.on('connect_error', () => {
      setStatus('offline')
      if (socket.active) return
      window.clearTimeout(retry)
      retry = window.setTimeout(() => {
        refreshSession()
          .then(() => socket.connect())
          .catch(() => queryClient.invalidateQueries({ queryKey: ['session'] }))
      }, 1500)
    })

    socket.on('data:changed', ({ entities }: { entities: string[] }) => {
      queue(entities.flatMap((entity) => ENTITY_KEYS[entity] || []))
    })
    socket.on('notification:new', ({ notification, unread }: { notification: Notice; unread: number }) => {
      setUnread(unread)
      queue(['notifications'])
      if (seen.current.has(notification.id)) return
      seen.current.add(notification.id)
      setToasts((list) => [notification, ...list].slice(0, 3))
      window.setTimeout(() => dismiss(notification.id), notification.priority === 'high' ? 9000 : 6000)
    })
    socket.on('notification:sync', ({ unread }: { unread: number }) => {
      setUnread(unread)
      queue(['notifications'])
    })

    return () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(retry)
      socket.disconnect()
    }
  }, [queryClient, dismiss])

  return (
    <RealtimeContext.Provider value={status}>
      {children}
      <Toasts items={toasts} onDismiss={dismiss} />
    </RealtimeContext.Provider>
  )
}

function Toasts({ items, onDismiss }: { items: Notice[]; onDismiss: (id: string) => void }) {
  const navigate = useNavigate()
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] flex flex-col items-end gap-2 md:bottom-6 md:right-6 md:left-auto md:w-[360px]" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2 }}
            className={cn('pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-xl', item.priority === 'high' ? 'border-sos/30' : 'border-line')}
          >
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', item.priority === 'high' ? 'bg-sos-soft text-sos' : 'bg-mint text-brand')}>
              <Bell className="h-4 w-4" />
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                onDismiss(item.id)
                navigate(item.href || '/notifications')
              }}
            >
              <span className="block text-sm font-semibold text-ink">{item.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">{item.body}</span>
            </button>
            <button type="button" onClick={() => onDismiss(item.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-canvas hover:text-ink" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
