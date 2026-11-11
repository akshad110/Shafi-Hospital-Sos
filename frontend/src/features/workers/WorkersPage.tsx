import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck } from 'lucide-react'
import { worker, workers } from '../../services/api'
import { Link } from 'react-router-dom'
import { cn, contractBadge, dateOnly, daysLeft, errorMessage, initials, money } from '../../lib/utils'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Shift } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Card, interactiveCard } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const HISTORY_PREVIEW = 3

export default function WorkersPage() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState('')
  const term = useDebounced(q)
  const query = useQuery({ queryKey: ['workers', term], queryFn: () => workers(term || undefined) })
  const activeId = selected || (wide ? query.data?.[0]?.id || '' : '')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workers"
        title="Your workers"
        description="People who have applied or worked here."
        actions={
          <div className="w-full sm:w-72">
            <SearchInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name, role or skill" aria-label="Search workers" />
          </div>
        }
      />

      {query.isLoading && <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-36" />)}</div>}
      {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && <Card><EmptyState title="No workers found" body="The directory fills as people apply to your requests." /></Card>}

      {query.data && query.data.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {query.data.map((person) => {
              const active = activeId === person.id
              const expiring = daysLeft(person.credentialExpiry) <= 30
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelected(person.id)}
                  className={cn('rounded-2xl border bg-white p-4 text-left', active ? 'border-brand ring-1 ring-brand' : cn('border-line', interactiveCard))}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy/10 text-sm font-bold text-navy">{initials(person.name)}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-semibold text-ink">{person.name}{person.verified && <BadgeCheck className="h-4 w-4 text-action" />}</span>
                      <span className="block text-xs text-muted">{person.role} · {person.experience}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {person.skills.map((skill) => <span key={skill} className="rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line">{skill}</span>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <Badge status={person.verified ? 'approved' : 'pending_review'}>{person.verified ? 'Verified' : 'Verification pending'}</Badge>
                    <span className={cn('text-xs font-medium', expiring ? 'text-[#c42a2a]' : 'text-muted')}>
                      {expiring ? 'Credential expiring' : person.openContracts ? `${person.openContracts} open contract${person.openContracts === 1 ? '' : 's'}` : `${person.assignments} shifts here`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {wide && activeId && <aside className="sticky top-24 self-start"><Card className="p-5"><WorkerDetail id={activeId} /></Card></aside>}
        </div>
      )}

      {!wide && (
        <Modal open={Boolean(selected)} title="Worker profile" onClose={() => setSelected('')}>
          {selected && <WorkerDetail id={selected} />}
        </Modal>
      )}
    </div>
  )
}

function WorkerDetail({ id }: { id: string }) {
  const query = useQuery({ queryKey: ['worker', id], queryFn: () => worker(id) })
  if (query.isLoading) return <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-28" /></div>
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
  const person = query.data
  const expiring = daysLeft(person.credentialExpiry) <= 30

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-sm font-bold text-white">{initials(person.name)}</span>
        <div>
          <h2 className="flex items-center gap-1 font-semibold text-ink">{person.name}{person.verified && <BadgeCheck className="h-4 w-4 text-action" />}</h2>
          <p className="text-xs text-muted">{person.role} · {person.city}</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Experience</dt><dd className="font-medium text-ink">{person.experience}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Availability</dt><dd className="font-medium text-ink">{person.availability}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Qualifications</dt><dd className="text-right font-medium text-ink">{person.qualifications.join(', ') || '—'}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Certificates</dt><dd className="text-right font-medium text-ink">{(person.certifications || []).join(', ') || '—'}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Credential expiry</dt><dd className={cn('font-medium', expiring ? 'text-[#c42a2a]' : 'text-ink')}>{dateOnly(person.credentialExpiry)}</dd></div>
        {person.phone && <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Phone</dt><dd className="font-medium text-ink"><a href={`tel:${person.phone.replace(/\s/g, '')}`} className="hover:text-brand-deep">{person.phone}</a></dd></div>}
        {person.payoutAccount && (
          <div className="flex justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-muted">Payout</dt>
            <dd className="text-right font-medium text-ink">{person.payoutAccount.method === 'upi' ? person.payoutAccount.upiId : `${person.payoutAccount.bankName} ••${person.payoutAccount.accountLast4}`}</dd>
          </div>
        )}
      </dl>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Attendance here</h3>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-center sm:grid-cols-4">
        {[
          { label: 'Present', value: person.attendance.present, tone: 'text-[#05603a]' },
          { label: 'Late', value: person.attendance.late, tone: 'text-[#8f5300]' },
          { label: 'Half day', value: person.attendance.halfDay, tone: 'text-[#6d3fd6]' },
          { label: 'Absent', value: person.attendance.absent, tone: 'text-[#c42a2a]' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-canvas px-1 py-2">
            <p className={cn('text-lg font-semibold leading-none', item.tone)}>{item.value}</p>
            <p className="mt-1 text-[10px] font-medium text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Contracts</h3>
      {person.contracts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No contracts with this hospital yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {person.contracts.map((item) => (
            <li key={item.id}>
              <Link to={`/attendance/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:border-brand hover:bg-mint">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{item.title}</span>
                  <span className="text-xs text-muted">{dateOnly(item.startDate)} – {dateOnly(item.endDate)} · {money(item.summary.gross)}</span>
                </span>
                <Badge status={contractBadge(item)} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ShiftHistory shifts={person.shifts} />
    </div>
  )
}

function ShiftHistory({ shifts }: { shifts: Shift[] }) {
  const [all, setAll] = useState(false)

  return (
    <div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Shift history</h3>
        {shifts.length > HISTORY_PREVIEW && (
          <button type="button" onClick={() => setAll(true)} className="text-xs font-semibold text-brand-deep hover:underline">
            View all
          </button>
        )}
      </div>
      {shifts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No shifts at this hospital yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {shifts.slice(0, HISTORY_PREVIEW).map((shift) => (
            <ShiftHistoryRow key={shift.id} shift={shift} />
          ))}
        </ul>
      )}
      <Modal
        open={all}
        title="Shift history"
        description={`${shifts.length} shift${shifts.length === 1 ? '' : 's'} at this hospital`}
        onClose={() => setAll(false)}
      >
        <ul className="-mx-4 divide-y divide-line sm:-mx-5">
          {shifts.map((shift) => (
            <ShiftHistoryRow key={shift.id} shift={shift} padded />
          ))}
        </ul>
      </Modal>
    </div>
  )
}

function ShiftHistoryRow({ shift, padded }: { shift: Shift; padded?: boolean }) {
  return (
    <li>
      <Link to={`/shifts?id=${shift.id}`} className={`flex items-center justify-between gap-3 text-sm hover:text-brand-deep ${padded ? 'px-4 py-3 sm:px-5' : 'py-2.5'}`}>
        <span>
          <span className="block font-medium text-ink">{shift.department}</span>
          <span className="text-xs text-muted">{dateOnly(shift.date)} · {shift.startTime}–{shift.endTime}</span>
        </span>
        <Badge status={shift.attendance.status === 'pending' ? shift.status : shift.attendance.status} />
      </Link>
    </li>
  )
}
