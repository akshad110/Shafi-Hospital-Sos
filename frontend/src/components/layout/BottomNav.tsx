import { NavLink } from 'react-router-dom'
import { ClipboardCheck, ClipboardList, Home, UserRound, Wallet } from 'lucide-react'
import { cn } from '../../lib/utils'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/find', label: 'Requests', icon: ClipboardList, end: false },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck, end: false },
  { to: '/pay', label: 'Pay', icon: Wallet, end: true },
  { to: '/profile', label: 'More', icon: UserRound, end: false },
]

export function BottomNav({ payroll = 0, mark = 0 }: { payroll?: number; mark?: number }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon
        const badge = item.to === '/pay' ? payroll : item.to === '/attendance' ? mark : 0
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[10px] font-semibold leading-tight transition-colors', isActive ? 'text-brand-deep' : 'text-faint active:text-ink')}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand" />}
                <span className={cn('relative grid h-7 w-10 place-items-center rounded-full transition-colors', isActive && 'bg-mint')}>
                  <Icon className="h-[18px] w-[18px]" />
                  {badge > 0 && (
                    <span className={cn('absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-0.5 text-[9px] font-bold leading-none text-white', item.to === '/pay' ? 'bg-action' : 'bg-warn')}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
