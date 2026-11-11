import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ArrowRight, CalendarDays, Clock3, MapPin, Phone, Plus, ShieldCheck, Siren } from 'lucide-react'
import { applications, contracts, jobs, notifications, shifts, subscription } from '../../services/api'
import { useSession } from '../../app/session'
import { cn, dayLabel, daysLeft, greeting, initials, money, PLAN_LABEL, startsIn, unitLabel, when } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import { buttonClass } from '../../components/ui/Button'
import { Card, CardHeader, rowClass } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/States'

export default function DashboardPage() {
  const { hospital } = useSession()
  const jobQuery = useQuery({ queryKey: ['jobs', { limit: 20 }], queryFn: () => jobs({ limit: 20 }) })
  const appQuery = useQuery({ queryKey: ['applications', { limit: 50 }], queryFn: () => applications({ limit: 50 }) })
  const shiftQuery = useQuery({ queryKey: ['shifts'], queryFn: () => shifts() })
  const noteQuery = useQuery({ queryKey: ['notifications', 'recent'], queryFn: () => notifications({ limit: 5 }) })
  const planQuery = useQuery({ queryKey: ['subscription'], queryFn: subscription })
  const payQuery = useQuery({ queryKey: ['contracts'], queryFn: () => contracts() })

  if (jobQuery.isLoading || appQuery.isLoading || shiftQuery.isLoading) return <PageSkeleton />
  if (jobQuery.isError || appQuery.isError || shiftQuery.isError) {
    return <ErrorState message="The dashboard could not load." onRetry={() => { jobQuery.refetch(); appQuery.refetch(); shiftQuery.refetch() }} />
  }

  const jobItems = jobQuery.data?.items || []
  const appItems = appQuery.data?.items || []
  const shiftItems = shiftQuery.data || []
  const activeJobs = jobItems.filter((job) => job.status === 'approved' || job.status === 'pending_review')
  const pending = jobItems.filter((job) => job.status === 'pending_review')
  const approved = jobItems.filter((job) => job.status === 'approved')
  const needed = approved.reduce((sum, job) => sum + job.workersNeeded, 0)
  const confirmed = appItems.filter((item) => item.status === 'confirmed').length
  const coverage = needed ? Math.min(100, Math.round((confirmed / needed) * 100)) : 0
  const featured = shiftItems.find((shift) => shift.status === 'active') || shiftItems.find((shift) => shift.status === 'upcoming')
  const sub = planQuery.data?.subscription
  const readyToPay = payQuery.data?.counts.readyToPay || 0
  const toMark = payQuery.data?.counts.toMark || 0

  const stats = [
    { label: 'Requests', value: activeJobs.length, hint: pending.length ? `${pending.length} waiting` : 'Open now', to: '/find' },
    { label: 'Applications', value: appQuery.data?.total || 0, hint: 'To review', to: '/applications' },
    { label: 'Shifts', value: shiftItems.filter((shift) => shift.status === 'upcoming' || shift.status === 'active').length, hint: 'Coming up', to: '/shifts' },
    { label: 'Confirmed', value: confirmed, hint: 'On duty', to: '/applications?status=confirmed' },
  ]

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2">
            <Badge status={hospital.verified ? 'approved' : 'pending_review'}>{hospital.verified ? 'Verified hospital' : 'Verification pending'}</Badge>
            {sub && <Badge status={sub.status === 'active' ? 'offered' : sub.status}>{PLAN_LABEL[sub.plan]} · {daysLeft(sub.renewalDate)} days left</Badge>}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[28px] md:text-[32px]">{greeting(hospital.name)}</h1>
          <p className="mt-1 text-[13px] text-muted sm:text-sm">Request staff, check who is in, and pay them.</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link to="/find?compose=1" className={buttonClass('sos', 'md', 'w-full sm:w-auto')}><Siren className="h-4 w-4" /> Need staff now</Link>
          <Link to="/requests/new" className={buttonClass('primary', 'md', 'w-full sm:w-auto')}><Plus className="h-4 w-4" /> New request</Link>
        </div>
      </div>

      {(readyToPay > 0 || toMark > 0) && (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {toMark > 0 && (
            <Link
              to="/attendance"
              className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-warn/30 bg-warn-soft px-3 py-3 sm:px-4 sm:py-3.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">Manage attendance</span>
                <span className="block truncate text-xs text-muted">{toMark} day{toMark === 1 ? '' : 's'} to mark</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-warn" />
            </Link>
          )}
          {readyToPay > 0 && (
            <Link
              to="/pay"
              className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-action/30 bg-action-soft px-3 py-3 sm:px-4 sm:py-3.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">Pay {readyToPay} staff</span>
                <span className="block truncate text-xs text-muted">{money(payQuery.data?.counts.due || 0)}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-action" />
            </Link>
          )}
        </div>
      )}

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4" aria-label="Overview">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group min-w-0 bg-white px-3 py-3 transition-colors hover:bg-[#fbfefd] sm:px-4 sm:py-4">
            <p className="truncate text-[11px] font-medium text-muted group-hover:text-brand-deep sm:text-xs">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold leading-none tracking-tight text-ink sm:mt-1.5 sm:text-[26px]">{stat.value}</p>
            <p className="mt-1 truncate text-[11px] text-faint sm:mt-1.5 sm:text-xs">{stat.hint}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {featured ? (
            <Card className="p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-navy" />
                  <span className="font-semibold text-ink">{featured.startTime} – {featured.endTime}</span>
                  <span className="text-muted">· {dayLabel(featured.date)}</span>
                </div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', featured.status === 'active' ? 'bg-action-soft text-navy ring-navy/20' : 'bg-sos-soft text-[#c42a2a] ring-sos/20')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', featured.status === 'active' ? 'bg-navy' : 'bg-sos')} />
                  {featured.status === 'active' ? 'On shift now' : startsIn(featured.date, featured.startTime)}
                </span>
              </div>

              <div className="mt-4 flex gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint text-brand"><MapPin className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-ink sm:text-[17px]">{featured.department}</h2>
                  <p className="truncate text-xs text-muted sm:text-sm">{featured.location}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-navy ring-1 ring-line">{initials(featured.workerName)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{featured.workerName}</p>
                    <p className="truncate text-xs text-muted">{featured.workerRole} · reports to {featured.supervisor}</p>
                  </div>
                </div>
                <a href={`tel:${hospital.phone}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-white text-muted transition-colors hover:border-brand hover:text-brand-deep" aria-label="Call the hospital desk">
                  <Phone className="h-4 w-4" />
                </a>
              </div>

              <Link to={`/shifts?id=${featured.id}`} className={buttonClass('navy', 'md', 'mt-4 h-12 w-full')}>
                Mark attendance <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-xs font-medium text-[#067647]">{featured.geofence}</p>
            </Card>
          ) : (
            <Card><EmptyState title="No shifts on the board" body="Confirmed placements show up here once a worker is assigned." /></Card>
          )}

          <Card>
            <CardHeader
              title="Your requests"
              description={pending.length ? `${pending.length} still waiting` : 'Open requests'}
              action={<Link to="/find" className="shrink-0 text-sm font-semibold text-action hover:text-navy">All</Link>}
            />
            {jobItems.filter((job) => job.status !== 'cancelled').length === 0 ? (
              <EmptyState title="No requests yet" body="Create a staffing request to start receiving applications." />
            ) : (
              <ul className="divide-y divide-line">
                {jobItems.filter((job) => job.status !== 'cancelled').slice(0, 5).map((job) => (
                  <li key={job.id}>
                    <Link to={`/find?id=${job.id}`} className={cn('group flex items-start gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5 md:px-5', rowClass)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink group-hover:text-brand-deep">{job.title}</p>
                          {job.urgent && <Badge status="urgent">Urgent</Badge>}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{job.department}</span>
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{dayLabel(job.date)} · {job.startTime}–{job.endTime}</span>
                          <span>{appItems.filter((item) => item.jobId === job.id).length} applications</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink">{money(job.amount)}<span className="text-xs font-medium text-muted">{unitLabel(job.paymentUnit)}</span></p>
                        <div className="mt-1"><Badge status={job.status} /></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-navy" /> Staffing coverage</p>
              <span className="text-sm font-semibold text-navy">{coverage}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-action-soft">
              <div className="h-full rounded-full bg-navy transition-[width] duration-500" style={{ width: `${coverage}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted">{confirmed} of {needed} confirmed.</p>
          </Card>

          <Card className="hidden p-4 md:block md:p-5">
            <p className="text-sm font-semibold text-ink">Applications this week</p>
            <div className="mt-2 h-32 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lastDays(appItems.map((item) => item.appliedAt))}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#55657A' }} />
                  <Tooltip cursor={{ fill: '#F6F9FC' }} contentStyle={{ borderRadius: 12, border: '1px solid #E3EAF1', fontSize: 12 }} />
                  <Bar dataKey="count" name="Applications" fill="#0B9685" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent activity" action={<Link to="/notifications" className="shrink-0 text-sm font-semibold text-action hover:text-navy">All</Link>} />
            {(noteQuery.data?.items || []).length === 0 ? (
              <EmptyState title="Quiet for now" body="Updates about requests and shifts will appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {(noteQuery.data?.items || []).slice(0, 5).map((note) => (
                  <li key={note.id}>
                    <Link to={note.href} className={cn('flex gap-3 px-4 py-3 md:px-5', rowClass)}>
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', note.read ? 'bg-line-strong' : 'bg-brand')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{note.title}</span>
                        <span className="block text-xs leading-5 text-muted">{note.body}</span>
                        <span className="mt-0.5 block text-[11px] text-faint">{when(note.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function lastDays(dates: string[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = date.toDateString()
    return {
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      count: dates.filter((value) => new Date(value).toDateString() === key).length,
    }
  })
}
