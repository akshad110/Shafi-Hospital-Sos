import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ArrowRight, CalendarDays, Clock3, MapPin, Phone, Plus, ShieldCheck, Siren } from 'lucide-react'
import { applications, jobs, notifications, shifts, subscription } from '../../services/api'
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

  const stats = [
    { label: 'Active requests', value: activeJobs.length, hint: 'Live or in review', to: '/find' },
    { label: 'Applications', value: appQuery.data?.total || 0, hint: 'Received in total', to: '/applications' },
    { label: 'Shortlisted', value: appItems.filter((item) => item.status === 'shortlisted').length, hint: 'Waiting on admin', to: '/applications?status=shortlisted' },
    { label: 'Confirmed', value: confirmed, hint: 'Placements locked', to: '/applications?status=confirmed' },
    { label: 'Upcoming shifts', value: shiftItems.filter((shift) => shift.status === 'upcoming').length, hint: 'Scheduled', to: '/shifts' },
    { label: 'Pending approval', value: pending.length, hint: 'Not live yet', to: '/find?status=pending_review' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge status={hospital.verified ? 'approved' : 'pending_review'}>{hospital.verified ? 'Verified hospital' : 'Verification pending'}</Badge>
            {sub && <Badge status={sub.status === 'active' ? 'offered' : sub.status}>{PLAN_LABEL[sub.plan]} · {daysLeft(sub.renewalDate)} days left</Badge>}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">{greeting(hospital.name)}</h1>
          <p className="mt-1 text-sm text-muted">Manage your staffing requirements and monitor your active shifts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/find?compose=1" className={buttonClass('sos')}><Siren className="h-4 w-4" /> Urgent SOS</Link>
          <Link to="/requests/new" className={buttonClass('primary')}><Plus className="h-4 w-4" /> New request</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 xl:grid-cols-6" aria-label="Overview">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group bg-white px-4 py-4 transition-colors hover:bg-[#fbfefd]">
            <p className="text-xs font-medium text-muted group-hover:text-brand-deep">{stat.label}</p>
            <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-ink">{stat.value}</p>
            <p className="mt-1.5 text-xs text-faint">{stat.hint}</p>
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
                  <h2 className="text-[17px] font-semibold text-ink">{featured.department}</h2>
                  <p className="text-sm text-muted">{featured.location}</p>
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
                View attendance record <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-xs font-medium text-[#067647]">{featured.geofence}</p>
            </Card>
          ) : (
            <Card><EmptyState title="No shifts on the board" body="Confirmed placements show up here once a worker is assigned." /></Card>
          )}

          <Card>
            <CardHeader
              title="Active staffing requests"
              description={pending.length ? `${pending.length} waiting on admin approval — not visible to workers yet` : 'Everything submitted has been reviewed'}
              action={<Link to="/find" className="shrink-0 text-sm font-semibold text-action hover:text-navy">View all</Link>}
            />
            {jobItems.filter((job) => job.status !== 'cancelled').length === 0 ? (
              <EmptyState title="No requests yet" body="Create a staffing request to start receiving applications." />
            ) : (
              <ul className="divide-y divide-line">
                {jobItems.filter((job) => job.status !== 'cancelled').slice(0, 5).map((job) => (
                  <li key={job.id}>
                    <Link to={`/find?id=${job.id}`} className={cn('group flex items-start gap-4 px-4 py-3.5 md:px-5', rowClass)}>
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
            <p className="mt-3 text-xs text-muted">{confirmed} of {needed} approved positions confirmed.</p>
          </Card>

          <Card className="p-4 md:p-5">
            <p className="text-sm font-semibold text-ink">Applications this week</p>
            <div className="mt-2 h-32">
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
