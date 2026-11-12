import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, ClipboardCheck, ClipboardList, CreditCard, FileText, Home, LifeBuoy, Siren, UserRound, Users, Wallet } from 'lucide-react'
import { cn, initials, PLAN_LABEL } from '../../lib/utils'
import { Logo } from '../ui/Logo'
import type { Hospital } from '../../types/domain'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true, permission: '', group: 'main' },
  { to: '/find', label: 'Requests', icon: ClipboardList, end: false, permission: 'jobs.read', group: 'main' },
  { to: '/applications', label: 'Applications', icon: FileText, end: false, permission: 'jobs.read', group: 'main' },
  { to: '/shifts', label: 'Shifts', icon: CalendarClock, end: false, permission: '', group: 'main' },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck, end: false, permission: '', group: 'main' },
  { to: '/pay', label: 'Pay', icon: Wallet, end: true, permission: '', group: 'main' },
  { to: '/workers', label: 'Workers', icon: Users, end: false, permission: 'workers.read', group: 'main' },
  { to: '/subscription', label: 'Plan', icon: CreditCard, end: false, permission: 'billing.read', group: 'more' },
  { to: '/notifications', label: 'Updates', icon: Bell, end: false, permission: 'notifications.read', group: 'more' },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false, permission: '', group: 'more' },
  { to: '/help', label: 'Help', icon: LifeBuoy, end: false, permission: '', group: 'more' },
]

export function Sidebar({ hospital, permissions, counts, onNavigate, collapsed = false }: { hospital: Hospital; permissions: string[]; counts: { review: number; payroll: number; mark: number }; onNavigate?: () => void; collapsed?: boolean }) {
  const navigate = useNavigate()
  const visible = items.filter((item) => !item.permission || permissions.includes(item.permission))

  function go(to: string) {
    navigate(to)
    onNavigate?.()
  }

  return (
    <aside className={cn('flex h-full flex-col overflow-hidden border-r border-line bg-white', collapsed ? 'w-[76px] items-center px-2 py-4' : 'w-[272px] px-3.5 py-5')}>
      <div className="sticky top-0 z-10 shrink-0 bg-white pb-4">
        <button type="button" onClick={() => go('/')} className={cn('flex items-center rounded-xl px-1.5 py-1 text-left', collapsed ? 'justify-center' : 'w-full')}>
          <Logo mark={collapsed} className={collapsed ? 'h-10 w-10' : 'h-11 w-auto max-w-[210px]'} />
        </button>
      </div>

      <nav className={cn('flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto', collapsed && 'w-full items-center')} aria-label="Main">
        {visible.filter((item) => item.group === 'main').map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} counts={counts} onNavigate={onNavigate} />
        ))}
        {visible.some((item) => item.group === 'more') && (
          <>
            {!collapsed && <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">More</p>}
            {collapsed && <span className="my-2 h-px w-6 bg-line" />}
            {visible.filter((item) => item.group === 'more').map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} counts={counts} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      <div className="shrink-0 bg-white pt-3">
        {collapsed ? (
          <button type="button" onClick={() => go('/find?compose=1')} title="Need staff now" className="grid h-11 w-11 place-items-center rounded-xl bg-sos text-white transition-colors hover:bg-[#d83434]">
            <Siren className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <div className="rounded-2xl border border-sos/20 bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sos-soft text-sos"><Siren className="h-4 w-4" /></span>
              Need staff now
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Need someone today?</p>
            <button type="button" onClick={() => go('/find?compose=1')} className="mt-3 h-9 w-full rounded-xl bg-sos text-[13px] font-semibold text-white transition-colors hover:bg-[#d83434]">
              Need staff now
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => go('/subscription')}
          title={collapsed ? hospital.name : undefined}
          className={cn('mt-3 flex items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-colors duration-150 hover:border-brand/50 hover:bg-canvas', collapsed && 'border-0 p-1')}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-xs font-bold text-white">{initials(hospital.name)}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{hospital.name}</span>
              <span className="block text-xs text-muted">{PLAN_LABEL[hospital.plan]} plan</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

function NavItem({ item, collapsed, counts, onNavigate }: {
  item: (typeof items)[number]
  collapsed: boolean
  counts: { review: number; payroll: number; mark: number }
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-mint font-semibold text-brand-deep' : 'text-muted hover:bg-canvas hover:text-ink',
          collapsed && 'h-11 w-11 justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />}
          <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand' : 'text-faint group-hover:text-ink')} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.to === '/applications' && counts.review > 0 && <span className="min-w-5 rounded-md bg-ink px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{counts.review}</span>}
          {!collapsed && item.to === '/attendance' && counts.mark > 0 && <span className="min-w-5 rounded-md bg-warn px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{counts.mark > 9 ? '9+' : counts.mark}</span>}
          {!collapsed && item.to === '/pay' && counts.payroll > 0 && <span className="min-w-5 rounded-md bg-action px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{counts.payroll}</span>}
          {collapsed && item.to === '/attendance' && counts.mark > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn ring-2 ring-white" />}
          {collapsed && item.to === '/pay' && counts.payroll > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-action ring-2 ring-white" />}
        </>
      )}
    </NavLink>
  )
}
