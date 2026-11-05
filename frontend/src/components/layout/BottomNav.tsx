import { NavLink } from 'react-router-dom'
import { CalendarClock, ClipboardList, FileText, Home, UserRound } from 'lucide-react'
import { cn } from '../../lib/utils'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/find', label: 'Requests', icon: ClipboardList, end: false },
  { to: '/applications', label: 'Applications', icon: FileText, end: false },
  { to: '/shifts', label: 'Manage Shifts', icon: CalendarClock, end: false },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('relative flex h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-semibold leading-tight transition-colors', isActive ? 'text-brand-deep' : 'text-faint active:text-ink')}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand" />}
                <span className={cn('grid h-7 w-10 place-items-center rounded-full transition-colors', isActive && 'bg-mint')}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
