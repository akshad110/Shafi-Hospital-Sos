import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, CalendarRange, ClipboardCheck, IndianRupee, Wallet } from 'lucide-react'
import { contracts, payouts } from '../../services/api'
import { cn, contractBadge, dateOnly, errorMessage, initials, money, PAYOUT_LABEL, unitLabel } from '../../lib/utils'
import type { ContractCard } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Card, CardHeader, interactiveCard } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Chip'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const tabs = ['ready', 'active', 'completed', 'paid', 'all'] as const
type Tab = (typeof tabs)[number]

const TAB_LABEL: Record<Tab, string> = {
  ready: 'Ready to pay',
  active: 'Running',
  completed: 'Needs attendance',
  paid: 'Paid',
  all: 'All',
}

function matches(item: ContractCard, tab: Tab) {
  if (tab === 'all') return true
  if (tab === 'ready') return item.canPay
  if (tab === 'completed') return item.status === 'completed' && !item.canPay
  return item.status === tab
}

export default function AttendancePage() {
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: ['contracts'], queryFn: () => contracts() })
  const history = useQuery({ queryKey: ['payouts'], queryFn: payouts })
  const items = query.data?.items || []
  const counts = query.data?.counts
  const fallback: Tab = counts?.readyToPay ? 'ready' : 'active'
  const tab = (tabs as readonly string[]).includes(params.get('tab') || '') ? (params.get('tab') as Tab) : fallback
  const visible = items.filter((item) => matches(item, tab))
  const paidTotal = (history.data || []).reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Attendance & payroll"
        title="Attendance register"
        description="Mark every shift as present, late, half day or absent. When a contract period ends and all shifts are marked, the salary is ready to pay."
      />

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4" aria-label="Payroll overview">
        <Stat icon={CalendarRange} label="Running contracts" value={counts ? String(counts.active) : '—'} hint="Bond period in progress" />
        <Stat icon={ClipboardCheck} label="Shifts to mark" value={counts ? String(counts.toMark) : '—'} hint="Past shifts without a mark" tone={counts?.toMark ? 'warn' : undefined} />
        <Stat icon={Wallet} label="Ready to pay" value={counts ? String(counts.readyToPay) : '—'} hint={counts ? `${money(counts.due)} due on completed bonds` : ''} tone={counts?.readyToPay ? 'action' : undefined} />
        <Stat icon={IndianRupee} label="Salaries paid" value={history.data ? money(paidTotal) : '—'} hint={history.data ? `${history.data.length} payout${history.data.length === 1 ? '' : 's'}` : ''} />
      </section>

      <Segmented<Tab>
        value={tab}
        onChange={(value) => setParams({ tab: value }, { replace: true })}
        options={tabs.map((value) => ({
          value,
          label: <span>{TAB_LABEL[value]} <span className="ml-1 opacity-70">{items.filter((item) => matches(item, value)).length}</span></span>,
        }))}
      />

      {query.isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-44" />)}</div>}
      {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
      {query.data && visible.length === 0 && (
        <Card>
          <EmptyState
            title={tab === 'ready' ? 'No salaries waiting' : `No ${TAB_LABEL[tab].toLowerCase()} contracts`}
            body={tab === 'ready' ? 'A salary becomes payable once its contract period ends and every shift has an attendance mark.' : 'Contracts appear here when the admin desk confirms a placement.'}
          />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => <ContractTile key={item.id} item={item} />)}
      </div>

      <Card>
        <CardHeader title="Payout history" description="Every salary recorded from this portal." />
        {history.isLoading && <div className="p-4"><Skeleton className="h-16" /></div>}
        {history.data && history.data.length === 0 && <p className="px-5 py-6 text-sm text-muted">No salaries paid yet.</p>}
        {history.data && history.data.length > 0 && (
          <ul className="divide-y divide-line">
            {history.data.map((payout) => (
              <li key={payout.id}>
                <Link to={`/attendance/${payout.contractId}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas md:px-5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{payout.workerName} <span className="font-normal text-muted">· {payout.number}</span></span>
                    <span className="text-xs text-muted">{dateOnly(payout.paidAt)} · {PAYOUT_LABEL[payout.method]}{payout.reference ? ` · ${payout.reference}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink">{money(payout.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Wallet; label: string; value: string; hint: string; tone?: 'warn' | 'action' }) {
  return (
    <div className="min-w-0 bg-white px-3 py-3 sm:px-4 sm:py-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted sm:text-xs">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', tone === 'warn' ? 'text-warn' : tone === 'action' ? 'text-action' : 'text-faint')} />
        <span className="truncate">{label}</span>
      </p>
      <p className={cn('mt-1 text-lg font-semibold leading-none tracking-tight sm:mt-1.5 sm:text-[24px]', tone === 'warn' ? 'text-[#8f5300]' : tone === 'action' ? 'text-action' : 'text-ink')}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-faint sm:mt-1.5 sm:text-xs">{hint}</p>
    </div>
  )
}

function ContractTile({ item }: { item: ContractCard }) {
  const { summary } = item
  const marked = summary.shifts - summary.pending
  const progress = summary.shifts ? Math.round((marked / summary.shifts) * 100) : 0
  return (
    <Link to={`/attendance/${item.id}`} className={cn('group block rounded-2xl border border-line bg-white p-4 md:p-5', interactiveCard)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy/10 text-sm font-bold text-navy">{initials(item.workerName)}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 truncate font-semibold text-ink group-hover:text-brand-deep">{item.workerName}{item.workerVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-action" />}</span>
            <span className="block truncate text-xs text-muted">{item.title}</span>
          </span>
        </div>
        <Badge status={contractBadge(item)} />
      </div>

      <p className="mt-3 text-xs text-muted">{dateOnly(item.startDate)} – {dateOnly(item.endDate)} · {money(item.rate)}{unitLabel(item.paymentUnit)}</p>

      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-ink">{marked}/{summary.shifts} shifts marked</span>
          {summary.toMark > 0 && item.status !== 'paid' && <span className="font-semibold text-[#8f5300]">{summary.toMark} to mark</span>}
        </div>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-canvas">
          <span className="bg-success" style={{ width: `${summary.shifts ? (summary.present / summary.shifts) * 100 : 0}%` }} />
          <span className="bg-warn" style={{ width: `${summary.shifts ? (summary.late / summary.shifts) * 100 : 0}%` }} />
          <span className="bg-violet" style={{ width: `${summary.shifts ? (summary.halfDay / summary.shifts) * 100 : 0}%` }} />
          <span className="bg-danger" style={{ width: `${summary.shifts ? (summary.absent / summary.shifts) * 100 : 0}%` }} />
        </div>
        <span className="sr-only">{progress}% marked</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-faint">{item.status === 'paid' ? 'Paid' : item.status === 'active' ? 'Earned so far' : 'Salary due'}</span>
          <span className="text-[17px] font-semibold text-ink">{money(summary.gross)}</span>
        </span>
        <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', item.canPay ? 'text-action' : 'text-brand-deep')}>
          {item.canPay ? 'Pay salary' : 'Open register'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
