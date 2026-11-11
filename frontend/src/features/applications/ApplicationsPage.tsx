import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Check, CircleAlert } from 'lucide-react'
import {
  application,
  applications,
  confirmApplication,
  rejectApplication,
  requestApplicationDocuments,
} from '../../services/api'
import { cn, dayLabel, errorMessage, initials, money, STATUS_LABEL, unitLabel, when } from '../../lib/utils'
import { useCatalog } from '../../hooks/useCatalog'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Application } from '../../types/domain'
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden">
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

        {wide && activeId && <aside className="sticky top-24 self-start"><Card className="p-5"><ApplicationDetail id={activeId} /></Card></aside>}
      </div>

      {!wide && (
        <Modal open={Boolean(selectedId)} title="Application" onClose={() => update('id')}>
          {selectedId && <ApplicationDetail id={selectedId} />}
        </Modal>
      )}
    </div>
  )
}

function ApplicationDetail({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { documentRequests } = useCatalog()
  const templates = documentRequests.length ? documentRequests : FALLBACK_REQUESTS
  const [panel, setPanel] = useState<'ask' | 'decline' | 'confirm' | null>(null)
  const [code, setCode] = useState(templates[0]?.code || 'license')
  const [customDoc, setCustomDoc] = useState('')
  const [dueBy, setDueBy] = useState(plusDays(2))
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0])
  const [declineOther, setDeclineOther] = useState('')
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

  if (query.isLoading) return <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-32" /></div>
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
  const item = query.data
  const checks = requirementChecks(item)
  const missing = checks.filter((entry) => !entry.ok)
  const busy = confirm.isPending || decline.isPending
  const open = OPEN.has(item.status)
  const actionError = confirm.error || decline.error || requestDocs.error
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
      <ul className="mt-2 space-y-1.5">
        {checks.map((entry) => (
          <li key={entry.label} className="flex items-start gap-2 text-sm">
            {entry.ok
              ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />}
            <span className={entry.ok ? 'text-ink' : 'font-medium text-ink'}>{entry.label}</span>
            <span className="ml-auto text-[11px] text-muted">{entry.ok ? 'On file' : 'Missing'}</span>
          </li>
        ))}
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

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Timeline</h3>
      <ol className="mt-1">
        {item.timeline.map((event, index) => {
          const last = index === item.timeline.length - 1
          return (
            <li key={`${event.at}-${event.status}-${index}`} className="relative flex gap-3 py-2">
              {index < item.timeline.length - 1 && <span className="absolute left-[5px] top-5 h-[calc(100%-8px)] w-px bg-line" />}
              <span className={cn('relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white', last ? 'bg-brand' : 'bg-line-strong')} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{STATUS_LABEL[event.status] || event.status}</p>
                <p className="text-xs leading-5 text-muted">
                  {event.note || STATUS_LABEL[event.status] || event.status}
                  <span className="text-faint"> · {when(event.at)}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>

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
  const have = [...item.qualifications, ...item.certifications, ...item.skills]
  const needed = [...(item.jobQualifications || []), ...(item.jobCertifications || []), ...(item.jobSkills || [])]
  const unique = [...new Set(needed.filter(Boolean))]
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
