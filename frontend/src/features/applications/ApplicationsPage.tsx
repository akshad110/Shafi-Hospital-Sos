import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck } from 'lucide-react'
import { addApplicationNote, application, applications } from '../../services/api'
import { cn, dayLabel, errorMessage, initials, money, STATUS_LABEL, unitLabel, when } from '../../lib/utils'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, rowClass } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { SearchInput, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const filters = ['', 'under_review', 'confirmed', 'rejected']
const PAGE_SIZE = 8

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
        description="Admin confirms the hire. You can add notes here."
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 overflow-hidden">
          {query.isLoading && <div className="space-y-3 p-4">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-14" />)}</div>}
          {query.isError && <div className="p-4"><ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /></div>}
          {query.data && items.length === 0 && <EmptyState title="No applications yet" body="People show up here after they apply to a request." />}

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
  const [message, setMessage] = useState('')
  const query = useQuery({ queryKey: ['application', id], queryFn: () => application(id) })
  const note = useMutation({
    mutationFn: () => addApplicationNote(id, message),
    onSuccess: () => {
      setMessage('')
      return queryClient.invalidateQueries({ queryKey: ['application', id] })
    },
  })

  if (query.isLoading) return <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-32" /></div>
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
  const item = query.data

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
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Request</dt><dd className="text-right font-medium text-ink">{item.jobTitle}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Shift</dt><dd className="text-right font-medium text-ink">{dayLabel(item.shiftDate)} · {item.startTime}–{item.endTime}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Pay</dt><dd className="font-medium text-ink">{money(item.amount)}{unitLabel(item.paymentUnit)}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[...item.qualifications, ...item.skills].map((tag) => (
          <span key={tag} className="rounded-md bg-canvas px-2 py-1 text-xs font-medium text-ink ring-1 ring-inset ring-line">{tag}</span>
        ))}
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Timeline</h3>
      <ol className="mt-3 space-y-0">
        {item.timeline.map((event, index) => (
          <li key={event.at + event.status} className="relative flex gap-3 pb-4 last:pb-0">
            {index < item.timeline.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" />}
            <span className={cn('relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-white', index === item.timeline.length - 1 ? 'bg-brand' : 'bg-line-strong')} />
            <div>
              <p className="text-sm font-semibold text-ink">{STATUS_LABEL[event.status] || event.status}</p>
              <p className="text-xs text-muted">{event.note} · {when(event.at)}</p>
            </div>
          </li>
        ))}
      </ol>

      {item.notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {item.notes.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-canvas px-3 py-2 text-sm text-ink">{entry.message}<span className="mt-0.5 block text-[11px] text-muted">{when(entry.at)}</span></li>
          ))}
        </ul>
      )}
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (message.trim()) note.mutate() }}>
        <TextInput value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add an internal note" aria-label="Internal note" />
        <Button type="submit" className="shrink-0" disabled={note.isPending || !message.trim()}>Save</Button>
      </form>
      {note.isError && <p className="mt-2 text-xs text-danger">{errorMessage(note.error)}</p>}
    </div>
  )
}
