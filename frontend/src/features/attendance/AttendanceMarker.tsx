import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { markAttendance } from '../../services/api'
import { cn, dayLabel, errorMessage, money, today } from '../../lib/utils'
import type { Attendance, AttendanceStatus, PayRules } from '../../types/domain'
import { allowedMarks, payForMark } from '../../lib/payRules'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

export const MARKS: { value: Exclude<AttendanceStatus, 'pending'>; label: string; on: string }[] = [
  { value: 'present', label: 'Present', on: 'border-success bg-success text-white' },
  { value: 'late', label: 'Late', on: 'border-warn bg-warn text-white' },
  { value: 'half_day', label: 'Half', on: 'border-violet bg-violet text-white' },
  { value: 'absent', label: 'Absent', on: 'border-danger bg-danger text-white' },
]

const MARK_LABEL: Record<AttendanceStatus, string> = {
  pending: 'Not marked',
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
}

export function useAttendanceMutation(shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { status: AttendanceStatus; checkIn?: string; checkOut?: string; note?: string }) => markAttendance(shiftId, body),
    onSettled: () => Promise.all(['shifts', 'contracts', 'contract', 'worker', 'workers', 'notifications'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
}

export function lockReason(shift: { date: string; status: string; attendance?: { status: string } }, locked: boolean) {
  if (locked) return 'Already paid'
  if (shift.status === 'cancelled') return 'Cancelled'
  if (shift.date > today()) return 'Mark on the day of the shift'
  if (shift.date < today() && shift.attendance && shift.attendance.status !== 'pending') return 'Locked after the day ended'
  return ''
}

/** Compact one-tap marking used in the attendance register rows. */
export function QuickMarks({
  shiftId,
  shiftDate,
  attendance,
  reason,
  payRules,
}: {
  shiftId: string
  shiftDate?: string
  attendance: Attendance
  reason: string
  payRules?: PayRules | null
}) {
  const mark = useAttendanceMutation(shiftId)
  const [ask, setAsk] = useState<AttendanceStatus | null>(null)

  if (reason) {
    return <span className="inline-flex items-center gap-1 text-xs text-faint"><Lock className="h-3 w-3" />{reason}</span>
  }

  const allowed = allowedMarks(payRules)
  const current = mark.isPending ? mark.variables?.status : attendance.status
  const visible = MARKS.filter((item) => allowed[item.value])
  const next = ask
  const when = shiftDate ? dayLabel(shiftDate) : 'this day'
  const fromPay = payRules ? payForMark(attendance.status, payRules) : 0
  const toPay = payRules && next ? payForMark(next, payRules) : 0
  const changing = Boolean(next && next !== 'pending' && attendance.status !== 'pending' && attendance.status !== next)
  const clearing = next === 'pending'

  function request(status: AttendanceStatus) {
    if (mark.isPending) return
    if (attendance.status === status) {
      if (shiftDate && shiftDate < today()) return
      setAsk('pending')
      return
    }
    setAsk(status)
  }

  return (
    <div>
      <div className="flex w-full gap-1 sm:inline-flex sm:w-auto" role="group" aria-label="Mark attendance">
        {visible.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={mark.isPending}
            onClick={() => request(item.value)}
            aria-pressed={current === item.value}
            className={cn(
              'h-9 min-w-0 flex-1 rounded-lg border px-1 text-[11px] font-semibold transition-colors disabled:opacity-60 sm:h-8 sm:flex-none sm:px-2.5 sm:text-xs',
              current === item.value ? item.on : 'border-line-strong bg-white text-muted hover:border-ink hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {payRules && current && current !== 'pending' && (
        <p className="mt-1 text-xs font-medium text-ink">{money(payForMark(current, payRules))} this day</p>
      )}
      {mark.isError && <p className="mt-1 text-xs text-danger">{errorMessage(mark.error)}</p>}

      <Modal
        open={ask !== null}
        title={clearing ? 'Clear this mark?' : changing ? 'Change this mark?' : 'Confirm attendance'}
        description={when}
        onClose={() => setAsk(null)}
      >
        <p className="text-sm leading-6 text-ink">
          {clearing && `Remove the ${MARK_LABEL[attendance.status].toLowerCase()} mark for ${when}? This day will not count until you mark it again.`}
          {changing && `Change ${when} from ${MARK_LABEL[attendance.status]} to ${MARK_LABEL[next!]}?`}
          {!clearing && !changing && next && `Mark ${when} as ${MARK_LABEL[next]}?`}
        </p>
        {payRules && next && (
          <p className="mt-2 text-sm text-muted">
            {clearing ? 'Pay for this day will drop to ₹0 until it is marked.' : changing ? `Pay changes from ${money(fromPay)} to ${money(toPay)}.` : `This pays ${money(toPay)} for that day.`}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAsk(null)}>Go back</Button>
          <Button className="w-full sm:w-auto" onClick={() => { if (ask) mark.mutate({ status: ask }); setAsk(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

/** Same one-tap marks, used in the shift detail panel. */
export function AttendanceForm({ shift, locked }: { shift: { id: string; date: string; status: string; attendance: Attendance; payRules?: PayRules | null }; locked: boolean }) {
  return <QuickMarks shiftId={shift.id} shiftDate={shift.date} attendance={shift.attendance} reason={lockReason(shift, locked)} payRules={shift.payRules} />
}
