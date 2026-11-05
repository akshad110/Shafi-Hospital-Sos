import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Plus, Search, Siren, Users } from 'lucide-react'
import { cancelJob, createJob, jobs, submitJob } from '../../services/api'
import { cn, dayLabel, errorMessage, money, unitLabel } from '../../lib/utils'
import { useRoleOptions } from '../../hooks/useCatalog'
import type { Job } from '../../types/domain'
import { useSession } from '../../app/session'
import { useDebounced } from '../../hooks/useDebounced'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Badge } from '../../components/ui/Badge'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card, rowClass } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { ChoiceSelect, Field, Select, TextArea, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'approved', label: 'Live' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'draft', label: 'Drafts' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function FindSosPage() {
  const { hospital } = useSession()
  const roles = useRoleOptions(hospital)
  const wide = useMediaQuery('(min-width: 1280px)')
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [shiftType, setShiftType] = useState('')
  const term = useDebounced(q)
  const status = params.get('status') || ''
  const urgent = params.get('urgent') === '1'

  const query = useQuery({
    queryKey: ['jobs', { term, role, department, shiftType, urgent, status }],
    queryFn: () => jobs({ q: term || undefined, role: role || undefined, department: department || undefined, shiftType: shiftType || undefined, urgent: urgent || undefined, status: status || undefined, limit: 30 }),
    placeholderData: keepPreviousData,
  })

  function update(key: string, value?: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const items = query.data?.items || []
  const selectedId = params.get('id')
  const chosen = items.find((job) => job.id === selectedId) || (wide ? items[0] : undefined)
  const filtersOn = Boolean(q || role || department || shiftType || status || urgent)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SOS Requests"
        title="Staffing requests"
        description="Search and track every request. Urgent requests still depend on worker availability and admin confirmation."
        actions={
          <>
            <Button variant="sos" onClick={() => update('compose', '1')}><Siren className="h-4 w-4" /> Quick SOS</Button>
            <Link to="/requests/new" className={buttonClass('primary')}><Plus className="h-4 w-4" /> New request</Link>
          </>
        }
      />

      <Card className="p-3 md:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <TextInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search title, ward or location" className="pl-10" aria-label="Search requests" />
          </div>
          <Select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Role">
            <option value="">All roles</option>
            {roles.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Department">
            <option value="">All departments</option>
            {hospital.departments.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={shiftType} onChange={(event) => setShiftType(event.target.value)} aria-label="Shift type">
            <option value="">Any shift</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="rotating">Rotating</option>
          </Select>
        </div>
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((item) => (
            <Chip key={item.value || 'all'} active={status === item.value} onClick={() => update('status', item.value)}>{item.label}</Chip>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line" />
          <Chip tone="sos" active={urgent} onClick={() => update('urgent', urgent ? '' : '1')}>Urgent only</Chip>
          {filtersOn && (
            <button type="button" className="ml-auto shrink-0 px-2 text-xs font-semibold text-action hover:text-navy" onClick={() => { setQ(''); setRole(''); setDepartment(''); setShiftType(''); setParams({}, { replace: true }) }}>
              Clear filters
            </button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm md:px-5">
            <span className="font-semibold text-ink">{query.data?.total ?? 0} requests</span>
            {query.isFetching && <span className="text-xs text-muted">Updating…</span>}
          </div>
          {query.isLoading && <div className="space-y-3 p-4">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20" />)}</div>}
          {query.isError && <div className="p-4"><ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /></div>}
          {query.data && items.length === 0 && (
            <EmptyState title="No requests match" body="Adjust the filters or create a new staffing request." action={<Link to="/requests/new" className={buttonClass('outline', 'sm')}>New request</Link>} />
          )}
          <ul className="divide-y divide-line">
            {items.map((job) => (
              <li key={job.id}>
                <JobRow job={job} active={chosen?.id === job.id} onSelect={() => update('id', job.id)} />
              </li>
            ))}
          </ul>
        </Card>

        {wide && (
          <aside className="sticky top-24 self-start">
            {chosen ? <RequestDetail job={chosen} /> : <Card className="p-6 text-sm text-muted">Select a request to see its brief.</Card>}
          </aside>
        )}
      </div>

      {!wide && (
        <Modal open={Boolean(chosen)} title="Request details" onClose={() => update('id')}>
          {chosen && <RequestDetail job={chosen} bare />}
        </Modal>
      )}
      <QuickSos open={params.get('compose') === '1'} onClose={() => update('compose')} />
    </div>
  )
}

function JobRow({ job, active, onSelect }: { job: Job; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn('group flex w-full items-start gap-4 px-4 py-4 text-left md:px-5', active ? 'bg-mint/60 shadow-[inset_3px_0_0_#0B9685]' : rowClass)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn('font-semibold', active ? 'text-brand-deep' : 'text-ink group-hover:text-brand-deep')}>{job.title}</h3>
          {job.urgent && <Badge status="urgent">Urgent</Badge>}
          <Badge status={job.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{job.role} · {job.department}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{dayLabel(job.date)} · {job.startTime}–{job.endTime}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.workersNeeded} needed</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-ink">{money(job.amount)}</p>
        <p className="text-xs text-muted">{unitLabel(job.paymentUnit).replace('/', 'per ')}</p>
      </div>
    </button>
  )
}

function RequestDetail({ job, bare }: { job: Job; bare?: boolean }) {
  const queryClient = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['jobs'] }), queryClient.invalidateQueries({ queryKey: ['notifications'] })])
  const cancel = useMutation({ mutationFn: () => cancelJob(job.id), onSuccess: () => { setConfirmCancel(false); return refresh() } })
  const submit = useMutation({ mutationFn: () => submitJob(job.id), onSuccess: refresh })
  const editable = job.status !== 'cancelled' && job.status !== 'filled'

  const body = (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge status={job.status} />
        {job.urgent && <Badge status="urgent">Urgent</Badge>}
      </div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{job.title}</h2>
      <p className="mt-1 text-sm text-muted">{job.role} · {job.department}</p>
      <p className="mt-3 text-sm leading-6 text-ink">{job.description}</p>

      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        <Row label="When" value={`${dayLabel(job.date)} · ${job.startTime}–${job.endTime}`} />
        <Row label="Where" value={job.location} />
        <Row label="Headcount" value={`${job.workersNeeded} worker${job.workersNeeded > 1 ? 's' : ''}`} />
        <Row label="Pay" value={`${money(job.amount)}${unitLabel(job.paymentUnit)}`} />
        <Row label="Skills" value={job.skills.join(', ') || '—'} />
        <Row label="Experience" value={job.experience} />
      </dl>
      {job.notes && <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-xs leading-5 text-muted">{job.notes}</p>}

      {(cancel.isError || submit.isError) && <p className="mt-3 text-sm font-medium text-danger">{errorMessage(cancel.error || submit.error)}</p>}

      {editable && (
        <div className="mt-5 space-y-2">
          {(job.status === 'draft' || job.status === 'rejected') && (
            <Button className="w-full" disabled={submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? 'Submitting…' : 'Submit for admin review'}</Button>
          )}
          {confirmCancel ? (
            <div className="rounded-xl border border-danger/25 bg-danger-soft p-3">
              <p className="text-sm font-medium text-[#b42323]">Cancel this request? Workers who applied will be notified.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmCancel(false)}>Keep it</Button>
                <Button variant="danger" size="sm" className="flex-1" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Yes, cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="w-full" onClick={() => setConfirmCancel(true)}>Cancel request</Button>
          )}
        </div>
      )}
    </>
  )

  return bare ? body : <Card className="p-5">{body}</Card>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-3.5 py-2.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

function QuickSos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hospital } = useSession()
  const roles = useRoleOptions(hospital)
  const queryClient = useQueryClient()
  const blank = {
    role: 'ICU Nurse',
    department: hospital.departments[0] || 'General Medicine',
    workersNeeded: '1',
    date: '',
    startTime: '07:00',
    endTime: '19:00',
    skills: 'ACLS',
    amount: '1000',
    location: hospital.address,
    notes: '',
  }
  const [form, setForm] = useState(blank)
  const [done, setDone] = useState(false)
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const mutation = useMutation({
    mutationFn: () => createJob({
      title: `Urgent ${form.role}`,
      department: form.department,
      role: form.role,
      description: form.notes || `Urgent cover for ${form.role}. Subject to worker availability and admin confirmation.`,
      qualifications: [form.role],
      experience: 'Relevant clinical experience',
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      certifications: [],
      workersNeeded: Number(form.workersNeeded),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      shiftType: Number(form.startTime.slice(0, 2)) >= 19 || Number(form.startTime.slice(0, 2)) < 6 ? 'night' : 'day',
      location: form.location,
      amount: Number(form.amount),
      currency: 'INR',
      paymentUnit: 'shift',
      notes: form.notes,
      urgent: true,
      status: 'pending_review',
    }),
    onSuccess: async () => {
      setDone(true)
      await Promise.all(['jobs', 'notifications', 'session'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
    },
  })

  function close() {
    setDone(false)
    setForm(blank)
    mutation.reset()
    onClose()
  }

  return (
    <Modal open={open} title="Quick SOS" description="Raise an urgent staffing request" onClose={close}>
      {done ? (
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success"><Siren className="h-5 w-5" /></span>
          <h3 className="mt-3 text-[17px] font-semibold text-ink">Urgent request sent</h3>
          <p className="mt-1 text-sm text-muted">It is with admin review now. Track it under Pending review.</p>
          <Button className="mt-5 w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <p className="rounded-xl border border-sos/20 bg-sos-soft px-3 py-2.5 text-xs leading-5 text-[#9f2323]">
            This files an urgent request, not a confirmed booking. Workers are confirmed by the admin desk.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <ChoiceSelect required value={form.role} onChange={(value) => set('role', value)} options={roles} otherLabel="Other role" otherPlaceholder="Type the role" />
            </Field>
            <Field label="Department">
              <ChoiceSelect required value={form.department} onChange={(value) => set('department', value)} options={hospital.departments} otherLabel="Other department" otherPlaceholder="Type the department" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Workers needed"><TextInput type="number" min={1} max={50} required value={form.workersNeeded} onChange={(event) => set('workersNeeded', event.target.value)} /></Field>
            <Field label="Pay per shift (₹)"><TextInput type="number" min={1} required value={form.amount} onChange={(event) => set('amount', event.target.value)} /></Field>
          </div>
          <Field label="Date"><TextInput type="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => set('date', event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><TextInput type="time" required value={form.startTime} onChange={(event) => set('startTime', event.target.value)} /></Field>
            <Field label="End"><TextInput type="time" required value={form.endTime} onChange={(event) => set('endTime', event.target.value)} /></Field>
          </div>
          <Field label="Required skills" hint="Separate with commas"><TextInput value={form.skills} onChange={(event) => set('skills', event.target.value)} /></Field>
          <Field label="Reporting location"><TextInput required value={form.location} onChange={(event) => set('location', event.target.value)} /></Field>
          <Field label="Special instructions"><TextArea rows={3} value={form.notes} onChange={(event) => set('notes', event.target.value)} /></Field>
          {mutation.isError && <p className="text-sm font-medium text-danger">{errorMessage(mutation.error)}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" variant="sos" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Submit urgent request'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
