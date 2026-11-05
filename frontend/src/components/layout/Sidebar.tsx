import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, ClipboardList, CreditCard, FileText, Home, LifeBuoy, Siren, UserRound, Users, Wallet } from 'lucide-react'
import { cn, initials, PLAN_LABEL } from '../../lib/utils'
import type { Hospital } from '../../types/domain'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true, permission: '' },
  { to: '/find', label: 'SOS Requests', icon: ClipboardList, end: false, permission: 'jobs.read', live: true },
  { to: '/applications', label: 'Applications', icon: FileText, end: false, permission: 'jobs.read' },
  { to: '/shifts', label: 'Manage Shifts', icon: CalendarClock, end: false, permission: '' },
  { to: '/attendance', label: 'Attendance & Payroll', icon: Wallet, end: false, permission: '' },
  { to: '/workers', label: 'Workers', icon: Users, end: false, permission: 'workers.read' },
  { to: '/subscription', label: 'Subscription', icon: CreditCard, end: false, permission: 'billing.read' },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false, permission: 'notifications.read' },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false, permission: '' },
  { to: '/help', label: 'Help & Support', icon: LifeBuoy, end: false, permission: '' },
]

export function Sidebar({ hospital, permissions, counts, onNavigate, collapsed = false }: { hospital: Hospital; permissions: string[]; counts: { review: number; payroll: number }; onNavigate?: () => void; collapsed?: boolean }) {
  const navigate = useNavigate()
  const visible = items.filter((item) => !item.permission || permissions.includes(item.permission))

  function go(to: string) {
    navigate(to)
    onNavigate?.()
  }

  return (
    <aside className={cn('flex h-full flex-col overflow-y-auto border-r border-line bg-white', collapsed ? 'w-[76px] items-center px-2 py-4' : 'w-[272px] px-3.5 py-5')}>
      <button type="button" onClick={() => go('/')} className={cn('flex items-center gap-3 rounded-xl px-1.5 py-1 text-left', collapsed && 'justify-center')}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-lg font-bold text-white shadow-sm">S</span>
        {!collapsed && (
          <span>
            <span className="block text-[15px] font-semibold leading-tight text-ink">Shafi SOS</span>
            <span className="block text-xs font-medium text-brand-deep">Hospital Portal</span>
          </span>
        )}
      </button>

      <nav className={cn('mt-6 flex flex-1 flex-col gap-0.5', collapsed && 'w-full items-center')} aria-label="Main">
        {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Workspace</p>}
        {visible.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
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
                  {!collapsed && item.live && <span className="rounded-md bg-sos-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sos ring-1 ring-inset ring-sos/20">LIVE</span>}
                  {!collapsed && item.to === '/applications' && counts.review > 0 && <span className="min-w-5 rounded-md bg-ink px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{counts.review}</span>}
                  {!collapsed && item.to === '/attendance' && counts.payroll > 0 && <span className="min-w-5 rounded-md bg-action px-1.5 text-center text-[11px] font-semibold leading-5 text-white" title="Salaries ready to pay">{counts.payroll}</span>}
                  {collapsed && item.to === '/attendance' && counts.payroll > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-action ring-2 ring-white" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {collapsed ? (
        <button type="button" onClick={() => go('/find?compose=1')} title="Quick SOS" className="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-sos text-white transition-colors hover:bg-[#d83434]">
          <Siren className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border border-sos/20 bg-white p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sos-soft text-sos"><Siren className="h-4 w-4" /></span>
            Quick SOS
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">Need staff on short notice? Raise an urgent request for admin review.</p>
          <button type="button" onClick={() => go('/find?compose=1')} className="mt-3 h-9 w-full rounded-xl bg-sos text-[13px] font-semibold text-white transition-colors hover:bg-[#d83434]">
            Raise urgent request
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
    </aside>
  )
}
