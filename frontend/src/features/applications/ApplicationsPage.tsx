import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Check, ChevronLeft, ChevronRight, CircleAlert, FileText } from 'lucide-react'
import {
  application,
  applications,
  confirmApplication,
  rejectApplication,
  requestApplicationDocuments,
  reviewApplicationDocument,
} from '../../services/api'
import { cn, dayLabel, errorMessage, initials, money, STATUS_LABEL, unitLabel, when } from '../../lib/utils'
import { useCatalog } from '../../hooks/useCatalog'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Application, WorkerDocument } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, rowClass } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { DateInput, Field, SearchInput, Select, TextArea, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const filters = ['', 'under_review', 'needs_update', 'shortlisted', 'offered', 'confirmed', 'rejected']
const PAGE_SIZE = 8
const OPEN = new Set(['under_review', 'needs_update', 'shortlisted', 'offered'])
const DECLINE_REASONS = [
  'Certificates do not match this role',
  'Required documents are missing',
  'Experience is not enough for this shift',
  'This position has already been filled',
  'Shift timing does not work',
  'Other',
]

const FALLBACK_REJECT = [
  { code: 'blurry', label: 'Unreadable or blurry' },
  { code: 'expired', label: 'Expired' },
  { code: 'name', label: 'Name does not match' },
  { code: 'wrong', label: 'Wrong document' },
  { code: 'incomplete', label: 'Incomplete or cut off' },
  { code: 'invalid', label: 'Looks invalid' },
  { code: 'other', label: 'Other' },
]

const FALLBACK_REQUESTS = [
  { code: 'license', label: 'Nursing / RN licence', body: 'Your nursing licence or RN licence is missing. Please upload it before {due}.' },
  { code: 'acls', label: 'ACLS certificate', body: 'Your ACLS certificate is missing. Please upload it before {due}.' },
  { code: 'bls', label: 'BLS certificate', body: 'Your BLS certificate is missing. Please upload it before {due}.' },
  { code: 'registration', label: 'State registration', body: 'Your state registration is missing. Please upload it before {due}.' },
  { code: 'id', label: 'Government ID', body: 'A government ID is missing. Please update it before {due}.' },
  { code: 'experience', label: 'Experience letter', body: 'An experience letter is missing. Please upload it before {due}.' },
  { code: 'fitness', label: 'Medical fitness record', body: 'A medical fitness or vaccination record is missing. Please upload it before {due}.' },
  { code: 'expiry', label: 'Expired certificate', body: 'A certificate is expired or expiring. Please renew it before {due}.' },
]

export default function ApplicationsPage() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const term = useDebounced(q)
  const status = params.get('status') || ''
  const selectedId = params.get('id') || ''

  const query = useQuery({
    queryKey: ['applications', { term, status, page }],
    queryFn: () => applications({ q: term || undefined, status: status || undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  function update(key: string, value?: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const items = query.data?.items || []
  const activeId = selectedId || (wide ? items[0]?.id : '')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="Who applied"
        description="Check certificates, then confirm the hire, ask for an update, or decline."
      />

      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-72">
            <SearchInput value={q} onChange={(event) => { setQ(event.target.value); setPage(1) }} placeholder="Search by worker name" aria-label="Search applications" />
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            {filters.map((item) => (
              <Chip key={item || 'all'} active={status === item} onClick={() => { update('status', item); setPage(1) }}>
                {item ? STATUS_LABEL[item] : 'All'}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
        <Card className="overflow-hidden">
          {query.isLoading && <div className="space-y-3 p-4">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-14" />)}</div>}
          {query.isError && <div className="p-4"><ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /></div>}
          {query.data && items.length === 0 && <EmptyState title="No applications yet" body="People show up here after they apply to your request." />}

          {items.length > 0 && (
            <>
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-line bg-canvas/70 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Worker</th>
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => {
                    const active = activeId === item.id
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => update('id', item.id)}
                        onKeyDown={(event) => { if (event.key === 'Enter') update('id', item.id) }}
                        className={cn('group cursor-pointer outline-none focus-visible:bg-mint/60', active ? 'bg-mint/60 shadow-[inset_3px_0_0_#0B9685]' : rowClass)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy">{initials(item.workerName)}</span>
                            <div className="min-w-0">
                              <p className={cn('flex items-center gap-1 font-semibold', active ? 'text-brand-deep' : 'text-ink group-hover:text-brand-deep')}>
                                {item.workerName}
                                {item.verified && <BadgeCheck className="h-4 w-4 text-action" aria-label="Verified" />}
                              </p>
                              <p className="text-xs text-muted">{item.role} · {item.experience}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-ink">{item.jobTitle}<span className="block text-xs text-muted">{item.department}</span></td>
                        <td className="px-4 py-3.5"><Badge status={item.status} /></td>
                        <td className="px-4 py-3.5 text-muted">{when(item.appliedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <ul className="divide-y divide-line md:hidden">
                {items.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => update('id', item.id)} className={cn('flex w-full items-start gap-3 px-4 py-4 text-left', rowClass)}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy">{initials(item.workerName)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 font-semibold text-ink">{item.workerName}{item.verified && <BadgeCheck className="h-4 w-4 text-action" />}</span>
                        <span className="block truncate text-xs text-muted">{item.role} · {item.jobTitle}</span>
                        <span className="mt-2 flex items-center gap-2"><Badge status={item.status} /><span className="text-xs text-muted">{dayLabel(item.shiftDate)}</span></span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">{money(item.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm md:px-5">
                <span className="text-muted">Page {page} of {Math.max(1, Math.ceil((query.data?.total || 0) / PAGE_SIZE))} · {query.data?.total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= (query.data?.total || 0)} onClick={() => setPage((value) => value + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </Card>
        {wide && activeId && <ApplicationTimelineCard id={activeId} />}
        </div>

        {wide && activeId && <aside className="sticky top-24 self-start"><Card className="p-5"><ApplicationDetail id={activeId} hideTimeline /></Card></aside>}
      </div>

      {!wide && (
        <Modal open={Boolean(selectedId)} title="Application" onClose={() => update('id')}>
          {selectedId && <ApplicationDetail id={selectedId} />}
        </Modal>
      )}
    </div>
  )
}

function ApplicationDetail({ id, hideTimeline = false }: { id: string; hideTimeline?: boolean }) {
  const queryClient = useQueryClient()
  const { documentRequests, documentRejectReasons } = useCatalog()
  const templates = documentRequests.length ? documentRequests : FALLBACK_REQUESTS
  const rejectReasons = documentRejectReasons?.length ? documentRejectReasons : FALLBACK_REJECT
  const [panel, setPanel] = useState<'ask' | 'decline' | 'confirm' | null>(null)
  const [code, setCode] = useState(templates[0]?.code || 'license')
  const [customDoc, setCustomDoc] = useState('')
  const [dueBy, setDueBy] = useState(plusDays(2))
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0])
  const [declineOther, setDeclineOther] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectCode, setRejectCode] = useState(FALLBACK_REJECT[0].code)
  const [rejectOther, setRejectOther] = useState('')
  const query = useQuery({ queryKey: ['application', id], queryFn: () => application(id) })

  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['application', id] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
      queryClient.invalidateQueries({ queryKey: ['contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])
  }

  const confirm = useMutation({
    mutationFn: () => confirmApplication(id),
    onSuccess: () => { setPanel(null); return refresh() },
  })
  const decline = useMutation({
    mutationFn: (reason: string) => rejectApplication(id, { reason }),
    onSuccess: () => { setPanel(null); setDeclineOther(''); return refresh() },
  })
  const requestDocs = useMutation({
    mutationFn: () => requestApplicationDocuments(id, { code, dueBy, label: code === 'other' ? customDoc.trim() : undefined }),
    onSuccess: () => { setPanel(null); setCustomDoc(''); return refresh() },
  })
  const reviewDoc = useMutation({
    mutationFn: (body: { label: string; status: 'verified' | 'rejected'; reasonCode?: string; reason?: string }) => reviewApplicationDocument(id, body),
    onSuccess: () => { setRejecting(false); setRejectOther(''); setViewing(null); return refresh() },
  })

  if (query.isLoading) return <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-32" /></div>
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
  const item = query.data
  const checks = requirementChecks(item)
  const listed = new Set(checks.map((entry) => entry.label.toLowerCase()))
  const extraDocs = (item.documents || []).filter((doc) => !listed.has(doc.name.toLowerCase()) && !checks.some((entry) => covered([doc.name], entry.label)))
  const certRows = [...checks, ...extraDocs.map((doc) => ({ label: doc.name, ok: true }))]
  const missing = checks.filter((entry) => !entry.ok)
  const busy = confirm.isPending || decline.isPending
  const open = OPEN.has(item.status)
  const actionError = confirm.error || decline.error || requestDocs.error || reviewDoc.error
  const reviews = item.documentReviews || []
  const declineNote = declineReason === 'Other' ? declineOther.trim() : declineReason
  const template = templates.find((entry) => entry.code === code)
  const customName = customDoc.trim() || 'document'
  const preview = code === 'other'
    ? `Your ${customName} is missing. Please upload it before ${dueBy}.`
    : (template?.body || 'Please update the missing document before {due}.').replace('{due}', dueBy)
  const messages = item.messages || []

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-sm font-bold text-white">{initials(item.workerName)}</span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1 font-semibold text-ink">{item.workerName}{item.verified && <BadgeCheck className="h-4 w-4 text-action" />}</h2>
          <p className="text-xs text-muted">{item.role} · {item.experience}</p>
        </div>
      </div>
      <div className="mt-3"><Badge status={item.status} /></div>

      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-muted">Request</dt><dd className="text-right font-medium text-ink">{item.jobTitle}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-muted">Shift</dt><dd className="text-right font-medium text-ink">{dayLabel(item.shiftDate)} · {item.startTime}–{item.endTime}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-muted">Pay</dt><dd className="font-medium text-ink">{money(item.amount)}{unitLabel(item.paymentUnit)}</dd></div>
      </dl>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Certificates</h3>
      <ul className="mt-2 space-y-2">
        {certRows.map((entry) => {
          const review = reviews.find((item) => item.label.toLowerCase() === entry.label.toLowerCase())
          const uploaded = findUploaded(item, entry.label)
          const openView = viewing === entry.label
          return (
            <li key={entry.label} className="rounded-xl border border-line px-3 py-2.5">
              <div className="flex items-start gap-2 text-sm">
                {review?.status === 'verified' || (entry.ok && review?.status !== 'rejected')
                  ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />}
                <span className="min-w-0 flex-1 font-medium text-ink">{entry.label}</span>
                {entry.ok
                  ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-action hover:text-navy"
                      onClick={() => { setViewing(openView ? null : entry.label); setRejecting(false); setRejectOther('') }}
                    >
                      {openView ? 'Close' : 'View'}
                    </button>
                  )
                  : <span className="shrink-0 text-[11px] text-muted">Missing</span>}
              </div>
              {review?.status === 'verified' && !openView && <p className="mt-1 pl-6 text-xs text-success">Verified</p>}
              {review?.status === 'rejected' && !openView && (
                <div className="mt-1 pl-6">
                  <p className="text-xs font-medium text-danger">Not verified</p>
                  {review.reason && <p className="text-xs leading-5 text-muted">{review.reason}</p>}
                </div>
              )}
              {!review && entry.ok && !openView && <p className="mt-1 pl-6 text-[11px] text-muted">On file · not reviewed</p>}
              {openView && (
                <div className="mt-3">
                  <DocumentPreview name={entry.label} workerName={item.workerName} role={item.role} expiry={item.credentialExpiry} fileName={uploaded?.fileName} url={uploaded?.url} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="danger" size="sm" disabled={reviewDoc.isPending} onClick={() => setRejecting(true)}>Not verified</Button>
                    <Button size="sm" disabled={reviewDoc.isPending} onClick={() => reviewDoc.mutate({ label: entry.label, status: 'verified' })}>
                      {reviewDoc.isPending && !rejecting ? 'Saving…' : 'Verified'}
                    </Button>
                  </div>
                  {rejecting && (
                    <div className="mt-3 rounded-xl bg-danger-soft/50 p-3">
                      <Field label="Reason">
                        <Select value={rejectCode} onChange={(event) => setRejectCode(event.target.value)}>
                          {rejectReasons.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
                        </Select>
                      </Field>
                      {rejectCode === 'other' && (
                        <div className="mt-3">
                          <Field label="Tell them why">
                            <TextArea rows={2} value={rejectOther} onChange={(event) => setRejectOther(event.target.value)} placeholder="Write a short reason" />
                          </Field>
                        </div>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRejecting(false)}>Go back</Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={reviewDoc.isPending || (rejectCode === 'other' && rejectOther.trim().length < 4)}
                          onClick={() => reviewDoc.mutate({
                            label: entry.label,
                            status: 'rejected',
                            reasonCode: rejectCode,
                            reason: rejectCode === 'other' ? rejectOther.trim() : undefined,
                          })}
                        >
                          {reviewDoc.isPending ? 'Saving…' : 'Send to worker'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {item.credentialExpiry && (
        <p className="mt-2 text-xs text-muted">Credentials expire {dayLabel(item.credentialExpiry)}</p>
      )}

      {open && !panel && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy} onClick={() => { setCode(suggestedCode(missing, templates)); setPanel('ask') }}>Ask to update</Button>
          <Button variant="danger" disabled={busy} onClick={() => setPanel('decline')}>Decline</Button>
          <Button className="col-span-2" disabled={busy} onClick={() => setPanel('confirm')}>Confirm hire</Button>
        </div>
      )}

      {panel === 'ask' && (
        <div className="mt-4 rounded-2xl border border-line p-3.5">
          <p className="text-sm font-semibold text-ink">Ask the worker to update</p>
          <p className="mt-0.5 text-xs text-muted">They will see this in the worker app.</p>
          <div className="mt-3">
            <Field label="What is missing?">
              <Select value={code} onChange={(event) => setCode(event.target.value)}>
                {templates.map((entry) => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
          {code === 'other' && (
            <div className="mt-3">
              <Field label="Document name">
                <TextInput value={customDoc} onChange={(event) => setCustomDoc(event.target.value)} placeholder="e.g. COVID vaccination card" maxLength={80} />
              </Field>
            </div>
          )}
          <div className="mt-3">
            <Field label="Update before">
              <DateInput value={dueBy} min={plusDays(0)} onChange={(event) => setDueBy(event.target.value)} />
            </Field>
          </div>
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-sm leading-6 text-ink">{preview}</p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPanel(null)}>Go back</Button>
            <Button disabled={requestDocs.isPending || !dueBy || (code === 'other' && customDoc.trim().length < 2)} onClick={() => requestDocs.mutate()}>{requestDocs.isPending ? 'Sending…' : 'Send to worker'}</Button>
          </div>
        </div>
      )}

      {panel === 'decline' && (
        <div className="mt-4 rounded-2xl border border-danger/25 bg-danger-soft/40 p-3.5">
          <p className="text-sm font-semibold text-ink">Decline this application?</p>
          <p className="mt-0.5 text-xs text-muted">{item.workerName} will see the reason in the worker app.</p>
          <div className="mt-3">
            <Field label="Reason">
              <Select value={declineReason} onChange={(event) => setDeclineReason(event.target.value)}>
                {DECLINE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
              </Select>
            </Field>
          </div>
          {declineReason === 'Other' && (
            <div className="mt-3">
              <Field label="Tell them why">
                <TextArea rows={3} value={declineOther} onChange={(event) => setDeclineOther(event.target.value)} placeholder="Write a short reason" />
              </Field>
            </div>
          )}
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPanel(null)}>Go back</Button>
            <Button variant="danger" disabled={decline.isPending || declineNote.length < 4} onClick={() => decline.mutate(declineNote)}>
              {decline.isPending ? 'Declining…' : 'Decline application'}
            </Button>
          </div>
        </div>
      )}

      {panel === 'confirm' && (
        <div className="mt-4 rounded-2xl border border-brand/30 bg-mint/50 p-3.5">
          <p className="text-sm font-semibold text-ink">Confirm this hire?</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {item.workerName} will be hired for {item.jobTitle}. They will show under Attendance, and the worker app will update.
          </p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPanel(null)}>Go back</Button>
            <Button disabled={confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Confirming…' : 'Confirm hire'}</Button>
          </div>
        </div>
      )}
      {actionError && <p className="mt-2 text-xs text-danger">{errorMessage(actionError)}</p>}

      {!hideTimeline && <div className="mt-5"><ApplicationTimeline events={item.timeline} status={item.status} /></div>}

      {messages.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Sent to worker</h3>
          <ul className="mt-2 space-y-2">
            {messages.slice().reverse().map((message) => (
              <li key={message.id} className="rounded-xl bg-canvas px-3 py-2.5">
                <p className="text-sm leading-5 text-ink">{message.body}</p>
                <p className="mt-1 text-[11px] text-faint">{message.dueBy ? `Due ${dayLabel(message.dueBy)} · ` : ''}{when(message.at)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ApplicationTimelineCard({ id }: { id: string }) {
  const query = useQuery({ queryKey: ['application', id], queryFn: () => application(id) })
  if (query.isLoading) {
    return <Card className="p-5"><Skeleton className="h-24" /></Card>
  }
  if (query.isError || !query.data) return null
  return (
    <Card className="p-4 md:p-5">
      <ApplicationTimeline events={query.data.timeline} status={query.data.status} />
    </Card>
  )
}

function ApplicationTimeline({ events, status }: { events: { status: string; at: string; note: string }[]; status: string }) {
  const scroller = useRef<HTMLOListElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const steps = timelineSteps(events, status)

  function updateArrows() {
    const el = scroller.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      observer.disconnect()
    }
  }, [steps])

  function slide(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 220, behavior: 'smooth' })
  }

  if (!steps.length) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Timeline</h3>
      <div className="mt-3 flex items-start gap-1.5">
        <button
          type="button"
          aria-label="Earlier events"
          disabled={!canLeft}
          onClick={() => slide(-1)}
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink shadow-sm disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <ol ref={scroller} className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-smooth pb-1">
          {steps.map((step, index) => {
            const last = index === steps.length - 1
            const tone = TIMELINE_TONE[step.tone]
            return (
              <li key={`${step.at}-${step.status}-${index}`} className="relative flex min-w-[148px] max-w-[200px] flex-1 shrink-0 flex-col pr-4">
                <div className="flex items-center">
                  <span className={cn('relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full', tone.dot)} />
                  {!last && <span className={cn('h-px min-w-0 flex-1', tone.line)} />}
                </div>
                <p className={cn('mt-2 text-[13px] font-semibold', tone.title)}>{STATUS_LABEL[step.status] || step.status}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{step.note || STATUS_LABEL[step.status] || step.status}</p>
                {step.at ? <p className="mt-1 text-[11px] text-faint">{when(step.at)}</p> : <p className="mt-1 text-[11px] text-faint">Not done</p>}
              </li>
            )
          })}
        </ol>
        <button
          type="button"
          aria-label="Later events"
          disabled={!canRight}
          onClick={() => slide(1)}
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink shadow-sm disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const OPEN_STEPS = new Set(['under_review', 'needs_update', 'shortlisted', 'offered'])

const TIMELINE_TONE = {
  done: { dot: 'bg-success', line: 'bg-success/40', title: 'text-[#05603a]' },
  progress: { dot: 'bg-warn', line: 'bg-warn/40', title: 'text-[#8f5300]' },
  pending: { dot: 'bg-danger', line: 'bg-danger/30', title: 'text-danger' },
}

function timelineFailed(event: { status: string; note: string }) {
  return event.status === 'rejected' || /not verified/i.test(event.note || '')
}

function timelineSteps(events: { status: string; at: string; note: string }[], status: string) {
  const items = events.map((event, index) => {
    const last = index === events.length - 1
    const failed = timelineFailed(event)
    const tone = failed
      ? 'pending' as const
      : last && OPEN_STEPS.has(status)
        ? 'progress' as const
        : 'done' as const
    return { ...event, tone }
  })
  if (status !== 'confirmed' && status !== 'rejected') {
    items.push({ status: 'confirmed', at: '', note: 'Hire not confirmed yet', tone: 'pending' })
  }
  return items
}

function plusDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function covered(have: string[], need: string) {
  const needle = need.trim().toLowerCase()
  return have.some((item) => {
    const value = item.trim().toLowerCase()
    return value === needle || value.includes(needle) || needle.includes(value)
  })
}

function requirementChecks(item: Application) {
  const have = [
    ...item.qualifications,
    ...item.certifications,
    ...item.skills,
    ...(item.documents || []).map((doc) => doc.name),
    ...(item.uploads || []).map((doc) => doc.name),
  ]
  const needed = (item.requiredDocuments || []).map((doc) => doc.name)
  const fallback = [...(item.jobQualifications || []), ...(item.jobCertifications || []), ...(item.jobSkills || [])]
  const unique = [...new Set((needed.length ? needed : fallback).filter(Boolean))]
  if (unique.length === 0) {
    return have.slice(0, 6).map((label) => ({ label, ok: true }))
  }
  return unique.map((label) => ({ label, ok: covered(have, label) }))
}

function suggestedCode(missing: { label: string }[], templates: { code: string; label: string }[]) {
  const blob = missing.map((entry) => entry.label.toLowerCase()).join(' ')
  const hit = templates.find((entry) => blob.includes(entry.code) || blob.includes(entry.label.toLowerCase().split(/[\s/]/)[0]))
  return hit?.code || templates[0]?.code || 'license'
}

function findUploaded(item: Application, label: string): WorkerDocument | undefined {
  const required = (item.requiredDocuments || []).find((doc) => doc.name.toLowerCase() === label.toLowerCase())
  const fromUpload = (item.uploads || []).find((doc) => {
    const matchName = covered([doc.name], label) || covered([label], doc.name)
    const matchId = required && (doc.documentId === required.id || doc.id === required.id)
    return matchName || Boolean(matchId)
  })
  if (fromUpload) return fromUpload
  return (item.documents || []).find((doc) => covered([doc.name], label) || covered([label], doc.name))
}

function DocumentPreview({
  name,
  workerName,
  role,
  expiry,
  fileName,
  url,
}: {
  name: string
  workerName: string
  role: string
  expiry?: string
  fileName?: string
  url?: string
}) {
  const image = url && /\.(png|jpe?g|webp|gif)$/i.test(url)
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-canvas">
      {url && image && <img src={url} alt={name} className="max-h-56 w-full object-contain bg-white" />}
      {url && !image && (
        <a href={url} target="_blank" rel="noreferrer" className="block px-3 py-2.5 text-sm font-semibold text-action hover:text-navy">
          Open original file
        </a>
      )}
      <div className="flex items-start gap-3 px-3 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-navy ring-1 ring-line">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="text-xs text-muted">{workerName} · {role}</p>
          <p className="text-[11px] text-faint">{fileName || 'Uploaded at registration'}{expiry ? ` · expires ${dayLabel(expiry)}` : ''}</p>
        </div>
      </div>
    </div>
  )
}
