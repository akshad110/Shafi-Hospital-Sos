import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, History } from 'lucide-react'
import { markRemaining } from '../../services/api'
import { fallbackPayRules, payForMark } from '../../lib/payRules'
import { cn, dayLabel, errorMessage, money, today, when } from '../../lib/utils'
import type { AttendanceLogEntry, AttendanceStatus, ContractDetail } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { lockReason, QuickMarks } from './AttendanceMarker'

export const payrollKeys = ['contracts', 'contract', 'shifts', 'payouts', 'worker', 'workers', 'notifications']

const LOG_PAGE = 10

const MARK_LABEL: Record<AttendanceStatus, string> = {
  pending: 'Not marked',
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
}

export function AttendanceRegister({ item }: { item: ContractDetail }) {
  const queryClient = useQueryClient()
  const locked = item.status === 'paid'
  const due = item.shifts.filter((shift) => shift.status !== 'cancelled' && shift.attendance.status === 'pending' && shift.date <= today()).length
  const [askAll, setAskAll] = useState(false)
  const bulk = useMutation({
    mutationFn: () => markRemaining(item.id, 'present'),
    onSettled: () => Promise.all(payrollKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
  const rules = fallbackPayRules(item.rate, item.payRules)
  const workingDays = item.shifts.filter((shift) => shift.status !== 'cancelled').length

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader
        className="flex-col items-stretch sm:flex-row sm:items-start"
        title="Who came in"
        description={locked ? 'Paid — these marks are locked.' : 'Confirm each mark. After the day ends, it cannot be changed.'}
        action={!locked && due > 0 && (
          <Button size="sm" variant="outline" className="mt-2 w-full sm:mt-0 sm:w-auto" disabled={bulk.isPending} onClick={() => setAskAll(true)}>
            <CheckCheck className="h-4 w-4" /> All present
          </Button>
        )}
      />
      {bulk.isError && <p className="border-b border-line bg-danger-soft px-4 py-2 text-xs font-medium text-danger sm:px-5">{errorMessage(bulk.error)}</p>}
      <ul className="divide-y divide-line">
        {item.shifts.map((shift) => {
          const reason = lockReason(shift, locked)
          const overdue = !reason && shift.attendance.status === 'pending'
          const earned = shift.earned ?? payForMark(shift.attendance.status, rules)
          return (
            <li key={shift.id} className={cn('flex min-w-0 flex-col gap-3 px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 md:px-5', overdue && 'bg-warn-soft/40')}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-11 shrink-0 rounded-xl border border-line bg-white py-1 text-center sm:w-12">
                  <span className="block text-[10px] font-semibold uppercase text-muted">{new Date(`${shift.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="block text-base font-semibold leading-tight text-ink">{new Date(`${shift.date}T00:00:00`).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    <span className="truncate">{dayLabel(shift.date)}</span>
                    <Badge status={shift.attendance.status} />
                  </p>
                  <p className="text-xs text-muted">
                    {shift.startTime}–{shift.endTime}
                    <span className="ml-1.5 font-semibold text-ink">{shift.attendance.status === 'pending' ? 'Not counted yet' : money(earned)}</span>
                  </p>
                </div>
              </div>
              <div className="min-w-0 w-full sm:w-auto sm:shrink-0">
                <QuickMarks shiftId={shift.id} shiftDate={shift.date} attendance={shift.attendance} reason={reason} payRules={rules} />
              </div>
            </li>
          )
        })}
      </ul>
      <div className="space-y-1.5 border-t border-line bg-canvas/70 px-4 py-3 text-sm md:px-5">
        <div className="flex justify-between gap-3">
          <span className="text-muted">Earned so far</span>
          <span className="font-semibold text-ink">{money(item.summary.gross)}</span>
        </div>
        {item.summary.pending > 0 && (
          <div className="flex justify-between gap-3 text-xs text-muted">
            <span>{item.summary.pending} day{item.summary.pending === 1 ? '' : 's'} not marked</span>
            <span>If those are present: {money(item.summary.gross + item.summary.pending * rules.presentPay)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 text-xs text-muted">
          <span>If all {workingDays} days present</span>
          <span>{money(item.summary.maxGross ?? rules.presentPay * workingDays)}</span>
        </div>
      </div>

      <AttendanceChangeLog shifts={item.shifts} />

      <Modal
        open={askAll}
        title="Mark all as present?"
        description={`${due} unmarked day${due === 1 ? '' : 's'} will be set to Present.`}
        onClose={() => setAskAll(false)}
      >
        <p className="text-sm leading-6 text-ink">
          This only fills days that are still blank. Days that are already marked stay as they are, and yesterday’s marks stay locked.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAskAll(false)}>Go back</Button>
          <Button className="w-full sm:w-auto" onClick={() => { bulk.mutate(); setAskAll(false) }}>Confirm</Button>
        </div>
      </Modal>
    </Card>
  )
}

function AttendanceChangeLog({ shifts }: { shifts: ContractDetail['shifts'] }) {
  const entries = useMemo(() => {
    return shifts
      .flatMap((shift) => (shift.attendanceLog || []).map((entry) => ({ ...entry, shiftDate: entry.shiftDate || shift.date })))
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [shifts])
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(entries.length / LOG_PAGE))
  const safePage = Math.min(page, pages)
  const slice = entries.slice((safePage - 1) * LOG_PAGE, safePage * LOG_PAGE)
  if (entries.length === 0) return null

  return (
    <div className="border-t border-line">
      <div className="flex items-center gap-2 px-4 py-3 md:px-5">
        <History className="h-4 w-4 text-muted" />
        <p className="text-sm font-semibold text-ink">Change log</p>
        <span className="text-xs text-muted">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {slice.map((entry, index) => (
          <li key={`${entry.at}-${entry.shiftDate}-${index}`} className="px-4 py-3 md:px-5">
            <p className="text-sm font-medium text-ink">{logTitle(entry)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {entry.shiftDate ? dayLabel(entry.shiftDate) : 'Shift'}
              <span className="mx-1.5 text-faint">·</span>
              {when(entry.at)}
              {entry.by ? <><span className="mx-1.5 text-faint">·</span>{entry.by}</> : null}
            </p>
          </li>
        ))}
      </ul>
      {entries.length > LOG_PAGE && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
          <p className="text-xs text-muted">
            {(safePage - 1) * LOG_PAGE + 1}–{Math.min(safePage * LOG_PAGE, entries.length)} of {entries.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={safePage >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function logTitle(entry: AttendanceLogEntry) {
  if (entry.from && entry.to && entry.from !== entry.to) {
    if (entry.to === 'pending') return `${MARK_LABEL[entry.from]} cleared`
    if (entry.from === 'pending') return `Marked ${MARK_LABEL[entry.to]}`
    return `${MARK_LABEL[entry.from]} → ${MARK_LABEL[entry.to]}`
  }
  return entry.label
}
