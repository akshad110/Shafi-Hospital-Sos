import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, CreditCard, LifeBuoy, LogOut, Menu, UserRound } from 'lucide-react'
import { cn, initials, PLAN_LABEL } from '../../lib/utils'
import { Logo } from '../ui/Logo'
import { logout } from '../../services/api'
import { useLiveStatus } from '../../app/realtime'
import type { Hospital } from '../../types/domain'

const LIVE = {
  live: { label: 'Live updates on', dot: 'bg-success', hint: 'Changes appear instantly' },
  connecting: { label: 'Connecting…', dot: 'bg-warn', hint: 'Reconnecting to live updates' },
  offline: { label: 'Live updates paused', dot: 'bg-danger', hint: 'The portal will catch up when the connection returns' },
}

export function Topbar({ hospital, unread, onMenu }: { hospital: Hospital; unread: number; onMenu: () => void }) {
  const live = useLiveStatus()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      window.location.href = '/login'
    },
  })

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function go(to: string) {
    setOpen(false)
    navigate(to)
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-line bg-white/90 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong text-muted transition-colors hover:border-brand hover:text-brand-deep xl:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </button>
        <Logo mark className="h-9 w-9 sm:h-10 sm:w-10" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink xl:hidden">Shafi SOS</p>
          <p className="hidden min-w-0 items-center gap-1.5 text-xs font-medium text-muted md:flex md:text-sm md:font-semibold md:text-ink" title={LIVE[live].hint}>
            <span className="relative flex h-2 w-2 shrink-0">
              {live === 'live' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50 motion-reduce:hidden" />}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', LIVE[live].dot)} />
            </span>
            <span className="truncate">{LIVE[live].label}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate('/notifications')} className="relative grid h-10 w-10 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-brand hover:text-brand-deep" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <span key={unread} className="absolute -right-1 -top-1 grid h-5 min-w-5 animate-[pop_0.3s_ease-out] place-items-center rounded-full bg-sos px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
        </button>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={cn('flex items-center gap-2 rounded-full border py-1 pl-1 pr-1 transition-colors md:pr-3', open ? 'border-brand bg-mint' : 'border-line-strong hover:border-brand hover:bg-canvas')}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{initials(hospital.name)}</span>
            <span className="hidden text-left md:block">
              <span className="block max-w-40 truncate text-xs font-semibold text-ink">{hospital.name}</span>
              <span className="block text-[11px] text-muted">{PLAN_LABEL[hospital.plan]}</span>
            </span>
            <ChevronDown className={cn('hidden h-4 w-4 text-muted transition-transform md:block', open && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{hospital.name}</p>
                  <p className="truncate text-xs text-muted">{hospital.email}</p>
                </div>
                <div className="p-1.5">
                  <MenuItem icon={UserRound} label="Profile" onClick={() => go('/profile')} />
                  <MenuItem icon={CreditCard} label="Plan" onClick={() => go('/subscription')} />
                  <MenuItem icon={LifeBuoy} label="Help" onClick={() => go('/help')} />
                </div>
                <div className="border-t border-line p-1.5">
                  <button type="button" onClick={() => signOut.mutate()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Bell; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-mint hover:text-brand-deep">
      <Icon className="h-4 w-4 text-faint group-hover:text-brand" /> {label}
    </button>
  )
}
