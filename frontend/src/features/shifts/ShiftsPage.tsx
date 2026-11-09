import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AttendanceForm } from '../attendance/AttendanceMarker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, ChevronLeft, ChevronRight, Clock3, MapPin, Phone } from 'lucide-react'
import { addShiftNote, shifts } from '../../services/api'
import { cn, dayLabel, errorMessage, initials, money, STATUS_LABEL, unitLabel, when } from '../../lib/utils'
import type { Shift } from '../../types/domain'
import { useSession } from '../../app/session'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, rowClass } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Chip'
import { Select, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'

const tabs = ['upcoming', 'active', 'completed', 'cancelled'] as const

export default function ShiftsPage() {
  const { hospital } = useSession()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<(typeof tabs)[number]>('upcoming')
  const [department, setDepartment] = useState('')
  const [date, setDate] = useState('')
  const all = useQuery({ queryKey: ['shifts'], queryFn: () => shifts() })
  const days = useMemo(() => weekStrip(), [])
  const selectedId = params.get('id') || ''

  const source = all.data || []
  const linked = source.find((shift) => shift.id === selectedId)
  const activeTab = linked && !params.get('tab') ? (linked.status as (typeof tabs)[number]) : status
  const items = source.filter((shift) => shift.status === activeTab && (!department || shift.department === department) && (!date || shift.date === date))
  const chosen = source.find((shift) => shift.id === selectedId) || (wide ? items[0] : undefined)

  function pickTab(tab: (typeof tabs)[number]) {
    setStatus(tab)
    setParams({ tab }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shifts"
        title="Who is on duty"
        description="Tap a person to mark Present, Late, Half or Absent."
      />

      <Card className="p-3 md:p-4">
        <DayStrip days={days} date={date} source={source} onPick={(value) => setDate(date === value ? '' : value)} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={activeTab}
            onChange={pickTab}
            options={tabs.map((tab) => ({
              value: tab,
              label: `${STATUS_LABEL[tab]} ${source.filter((shift) => shift.status === tab).length}`,
            }))}
          />
          <Select value={department} onChange={(event) => setDepartment(event.target.value)} className="hidden h-10 w-56 sm:block" aria-label="Department">
            <option value="">All departments</option>
            {[...new Set([...hospital.departments, ...source.map((shift) => shift.department)])].map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 overflow-hidden">
          {all.isLoading && <div className="space-y-3 p-4">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20" />)}</div>}
          {all.isError && <div className="p-4"><ErrorState message={errorMessage(all.error)} onRetry={() => all.refetch()} /></div>}
          {all.data && items.length === 0 && <EmptyState title={`No ${STATUS_LABEL[activeTab].toLowerCase()} shifts`} body={date || department ? 'Try clearing the date or department filter.' : 'Confirmed placements show up here once a worker is assigned.'} />}
          <ul className="divide-y divide-line">
            {items.map((shift) => {
              const active = chosen?.id === shift.id
              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => setParams({ id: shift.id, tab: activeTab }, { replace: true })}
                    className={cn('group flex w-full min-w-0 items-start gap-3 px-3 py-3.5 text-left sm:gap-4 sm:px-4 sm:py-4 md:px-5', active ? 'bg-mint/60 shadow-[inset_3px_0_0_#0B9685]' : rowClass)}
                  >
                    <div className="w-11 shrink-0 rounded-xl border border-line bg-white py-1.5 text-center sm:w-14">
                      <span className="block text-[11px] font-semibold uppercase text-muted">{new Date(`${shift.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span>
                      <span className="block text-lg font-semibold leading-tight text-ink">{new Date(`${shift.date}T00:00:00`).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-semibold', active ? 'text-brand-deep' : 'text-ink group-hover:text-brand-deep')}>{shift.department}</p>
                      <p className="truncate text-sm text-muted">{shift.workerName} · {shift.workerRole}</p>
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{shift.startTime}–{shift.endTime}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{shift.location}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ink">{money(shift.amount)}<span className="text-xs font-medium text-muted">{unitLabel(shift.paymentUnit)}</span></p>
                      <div className="mt-1"><Badge status={shift.attendance.status} /></div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        {wide && chosen && <aside className="sticky top-24 self-start"><Card className="p-5"><ShiftDetail shift={chosen} /></Card></aside>}
      </div>

      {!wide && (
        <Modal open={Boolean(selectedId && chosen)} title="Shift details" onClose={() => setParams({ tab: activeTab }, { replace: true })}>
          {chosen && <ShiftDetail shift={chosen} />}
        </Modal>
      )}
    </div>
  )
}

function ShiftDetail({ shift }: { shift: Shift }) {
  const { hospital } = useSession()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const note = useMutation({
    mutationFn: () => addShiftNote(shift.id, message),
    onSuccess: () => {
      setMessage('')
      return queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Badge status={shift.status} />
        <Badge status={shift.attendance.status} />
      </div>
      {shift.contractId && (
        <Link to={`/attendance/${shift.contractId}`} className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs transition-colors hover:border-brand hover:bg-mint">
          <span className="min-w-0 truncate"><span className="text-muted">Contract · </span><span className="font-semibold text-ink">{shift.contractTitle}</span></span>
          <span className="shrink-0 font-semibold text-brand-deep">Pay →</span>
        </Link>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-sm font-bold text-white">{initials(shift.workerName)}</span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1 font-semibold text-ink">{shift.workerName}{shift.verified && <BadgeCheck className="h-4 w-4 text-action" aria-label="Verified credentials" />}</h2>
          <p className="text-xs text-muted">{shift.workerRole} · {shift.qualifications.join(', ')}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Date</dt><dd className="font-medium text-ink">{dayLabel(shift.date)}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Time</dt><dd className="font-medium text-ink">{shift.startTime}–{shift.endTime}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Department</dt><dd className="text-right font-medium text-ink">{shift.department}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Report to</dt><dd className="text-right font-medium text-ink">{shift.location}</dd></div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-muted">Pay</dt><dd className="font-medium text-ink">{money(shift.amount)}{unitLabel(shift.paymentUnit)}</dd></div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{shift.supervisor}</p>
          <p className="truncate text-xs text-muted">{shift.supervisorRole}</p>
        </div>
        <a href={`tel:${hospital.phone}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong bg-white text-muted transition-colors hover:border-brand hover:text-brand-deep" aria-label="Call the ward desk">
          <Phone className="h-4 w-4" />
        </a>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-ink">Did they come in?</h3>
      <div className="mt-2"><AttendanceForm key={`${shift.id}-${shift.attendance.markedAt || ''}`} shift={shift} locked={shift.attendanceLocked} /></div>

      {shift.notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shift.notes.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-canvas px-3 py-2 text-sm text-ink">{entry.message}<span className="mt-0.5 block text-[11px] text-muted">{when(entry.at)}</span></li>
          ))}
        </ul>
      )}
      <form className="mt-4 hidden gap-2 sm:flex" onSubmit={(event) => { event.preventDefault(); if (message.trim()) note.mutate() }}>
        <TextInput value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a note" aria-label="Shift note" />
        <Button type="submit" className="shrink-0" disabled={note.isPending || !message.trim()}>Save</Button>
      </form>
      {note.isError && <p className="mt-2 text-xs text-danger">{errorMessage(note.error)}</p>}
    </div>
  )
}

function DayStrip({
  days,
  date,
  source,
  onPick,
}: {
  days: { value: string; label: string; num: number; today: boolean }[]
  date: string
  source: Shift[]
  onPick: (value: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

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
  }, [days])

  function slide(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 168, behavior: 'smooth' })
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Earlier days"
        disabled={!canLeft}
        onClick={() => slide(-1)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink shadow-sm disabled:opacity-30 lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={scroller}
        className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth py-0.5"
      >
        {days.map((day) => {
          const on = date === day.value
          const count = source.filter((shift) => shift.date === day.value).length
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onPick(day.value)}
              className={cn(
                'relative min-w-[60px] shrink-0 snap-start rounded-xl border px-3 py-2 text-center transition-colors',
                on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-ink hover:border-brand hover:bg-mint',
                day.today && !on && 'border-navy',
              )}
            >
              <span className={cn('block text-[11px] font-semibold uppercase', on ? 'text-white/80' : 'text-muted')}>{day.label}</span>
              <span className="block text-base font-semibold">{day.num}</span>
              {count > 0 && <span className={cn('absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full', on ? 'bg-white' : 'bg-brand')} />}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-label="Later days"
        disabled={!canRight}
        onClick={() => slide(1)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink shadow-sm disabled:opacity-30 lg:hidden"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function weekStrip() {
  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index - 2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return {
      value: `${date.getFullYear()}-${month}-${day}`,
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      num: date.getDate(),
      today: index === 2,
    }
  })
}
