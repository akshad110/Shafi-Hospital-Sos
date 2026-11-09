import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { markRemaining } from '../../services/api'
import { fallbackPayRules, payForMark } from '../../lib/payRules'
import { cn, dayLabel, errorMessage, money, today } from '../../lib/utils'
import type { ContractDetail } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { lockReason, QuickMarks } from './AttendanceMarker'

export const payrollKeys = ['contracts', 'contract', 'shifts', 'payouts', 'worker', 'workers', 'notifications']

export function AttendanceRegister({ item }: { item: ContractDetail }) {
  const queryClient = useQueryClient()
  const locked = item.status === 'paid'
  const due = item.shifts.filter((shift) => shift.status !== 'cancelled' && shift.attendance.status === 'pending' && shift.date <= today()).length
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
        description={locked ? 'Paid — these marks are locked.' : 'Each mark changes that day’s pay.'}
        action={!locked && due > 0 && (
          <Button size="sm" variant="outline" className="mt-2 w-full sm:mt-0 sm:w-auto" disabled={bulk.isPending} onClick={() => bulk.mutate()}>
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
              <div className="min-w-0 w-full sm:w-auto sm:shrink-0"><QuickMarks shiftId={shift.id} attendance={shift.attendance} reason={reason} payRules={rules} /></div>
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
    </Card>
  )
}
