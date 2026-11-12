import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Star } from 'lucide-react'
import { reviewWorker, worker, workers } from '../../services/api'
import { Link } from 'react-router-dom'
import { cn, contractBadge, dateOnly, daysLeft, errorMessage, initials, money, when } from '../../lib/utils'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Shift, WorkerReview } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, interactiveCard } from '../../components/ui/Card'
import { Field, SearchInput, TextArea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
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
      <div>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-deep sm:block md:text-xs">Workers</p>
        <div className="mt-1 flex items-center gap-3 sm:gap-4">
          <h1 className="shrink-0 text-xl font-semibold tracking-tight text-ink sm:text-2xl md:text-[28px]">Your workers</h1>
          <div className="min-w-0 max-w-[280px] flex-1">
            <SearchInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name, role or skill" aria-label="Search workers" />
          </div>
        </div>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted sm:mt-1.5 sm:text-sm sm:leading-6">People who have applied or worked here.</p>
      </div>

      {query.isLoading && <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-36" />)}</div>}
      {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && <Card><EmptyState title="No workers found" body="The directory fills as people apply to your requests." /></Card>}

      {query.data && query.data.length > 0 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              {query.data.map((person) => {
                const active = activeId === person.id
                const expiring = daysLeft(person.credentialExpiry) <= 30
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelected(person.id)}
                    className={cn('rounded-2xl border p-4 text-left', active ? 'border-brand/40 bg-mint/50' : cn('border-line bg-white', interactiveCard))}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy/10 text-sm font-bold text-navy">{initials(person.name)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-semibold text-ink">{person.name}{person.verified && <BadgeCheck className="h-4 w-4 text-action" />}</span>
                        <span className="block text-xs text-muted">{person.role} · {person.experience}</span>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(person.skills || []).map((skill) => <span key={skill} className="rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line">{skill}</span>)}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge status={person.verified ? 'approved' : 'pending_review'}>{person.verified ? 'Verified' : 'Verification pending'}</Badge>
                        {(person.ratingCount || 0) > 0 && <Stars value={person.ratingAverage || 0} label={`${person.ratingAverage} · ${person.ratingCount}`} />}
                      </span>
                      <span className={cn('text-xs font-medium', expiring ? 'text-[#c42a2a]' : 'text-muted')}>
                        {expiring ? 'Credential expiring' : person.openContracts ? `${person.openContracts} open contract${person.openContracts === 1 ? '' : 's'}` : `${person.assignments} shifts here`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {wide && activeId && (
            <aside className="min-w-0">
              <Card className="p-5"><WorkerDetail id={activeId} /></Card>
            </aside>
          )}
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
          {(person.ratingCount || 0) > 0 && (
            <div className="mt-1">
              <Stars value={person.ratingAverage || 0} label={`${person.ratingAverage} from ${person.ratingCount} review${person.ratingCount === 1 ? '' : 's'}`} />
            </div>
          )}
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Experience</dt><dd className="font-medium text-ink">{person.experience}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Availability</dt><dd className="font-medium text-ink">{person.availability}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Qualifications</dt><dd className="text-right font-medium text-ink">{(person.qualifications || []).join(', ') || '—'}</dd></div>
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
          { label: 'Present', value: person.attendance?.present ?? 0, tone: 'text-[#05603a]' },
          { label: 'Late', value: person.attendance?.late ?? 0, tone: 'text-[#8f5300]' },
          { label: 'Half day', value: person.attendance?.halfDay ?? 0, tone: 'text-[#6d3fd6]' },
          { label: 'Absent', value: person.attendance?.absent ?? 0, tone: 'text-[#c42a2a]' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-canvas px-1 py-2">
            <p className={cn('text-lg font-semibold leading-none', item.tone)}>{item.value}</p>
            <p className="mt-1 text-[10px] font-medium text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Contracts</h3>
      {(person.contracts || []).length === 0 ? (
        <p className="mt-2 text-sm text-muted">No contracts with this hospital yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {(person.contracts || []).map((item) => (
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

      <WorkerReviewForm
        key={person.id}
        workerId={person.id}
        mine={person.myReview}
        reviews={person.reviews || []}
      />

      <ShiftHistory shifts={person.shifts || []} />
    </div>
  )
}

function Stars({ value, label, className }: { value: number; label?: string; className?: string }) {
  const rounded = Math.round(value)
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[#c47b16]', className)} title={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn('h-3.5 w-3.5', star <= rounded ? 'fill-current' : 'text-line-strong')} />
      ))}
      {label && <span className="ml-1 text-[11px] font-medium text-muted">{label}</span>}
    </span>
  )
}

function WorkerReviewForm({ workerId, mine, reviews }: { workerId: string; mine?: WorkerReview | null; reviews: WorkerReview[] }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(mine?.rating || 0)
  const [comment, setComment] = useState(mine?.comment || '')
  const save = useMutation({
    mutationFn: () => reviewWorker(workerId, { rating, comment }),
    onSuccess: async () => {
      await Promise.all(['worker', 'workers'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
    },
  })

  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Review</h3>
      <p className="mt-1 text-xs text-muted">This hospital’s rating is stored for the worker SOS app.</p>
      <form
        className="mt-3 space-y-3 rounded-2xl border border-line p-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          if (rating < 1) return
          save.mutate()
        }}
      >
        <div>
          <p className="text-[13px] font-semibold text-ink">{mine ? 'Update your review' : 'Rate this worker'}</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                onClick={() => setRating(star)}
                className={cn('rounded-lg p-1 transition-colors', star <= rating ? 'text-[#c47b16]' : 'text-line-strong hover:text-[#c47b16]')}
              >
                <Star className={cn('h-6 w-6', star <= rating && 'fill-current')} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Comment" hint="Optional. The worker can see this.">
          <TextArea rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Punctual, calm with patients, good handover…" />
        </Field>
        {save.isError && <p className="text-xs font-medium text-danger">{errorMessage(save.error)}</p>}
        {save.isSuccess && <p className="text-xs font-medium text-success">Review saved. It will show in the worker SOS app.</p>}
        <Button type="submit" className="w-full" disabled={rating < 1 || save.isPending}>
          {save.isPending ? 'Saving…' : mine ? 'Update review' : 'Save review'}
        </Button>
      </form>
      {reviews.length > 0 && (
        <ul className="mt-3 space-y-2">
          {reviews.map((item) => (
            <li key={item.id} className="rounded-xl bg-canvas px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <Stars value={item.rating} />
                <span className="text-[11px] text-faint">{when(item.updatedAt || item.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-ink">{item.hospitalName}</p>
              {item.comment && <p className="mt-1 text-sm leading-5 text-muted">{item.comment}</p>}
            </li>
          ))}
        </ul>
      )}
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
        <Badge status={(shift.attendance?.status && shift.attendance.status !== 'pending') ? shift.attendance.status : shift.status} />
      </Link>
    </li>
  )
}
