import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { markAttendance } from '../../services/api'
import { cn, errorMessage, today } from '../../lib/utils'
import type { Attendance, AttendanceStatus, PayRules } from '../../types/domain'
import { allowedMarks, payForMark } from '../../lib/payRules'
import { money } from '../../lib/utils'

export const MARKS: { value: Exclude<AttendanceStatus, 'pending'>; label: string; on: string }[] = [
  { value: 'present', label: 'Present', on: 'border-success bg-success text-white' },
  { value: 'late', label: 'Late', on: 'border-warn bg-warn text-white' },
  { value: 'half_day', label: 'Half', on: 'border-violet bg-violet text-white' },
  { value: 'absent', label: 'Absent', on: 'border-danger bg-danger text-white' },
]

export function useAttendanceMutation(shiftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { status: AttendanceStatus; checkIn?: string; checkOut?: string; note?: string }) => markAttendance(shiftId, body),
    onSettled: () => Promise.all(['shifts', 'contracts', 'contract', 'worker', 'workers'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })
}

export function lockReason(shift: { date: string; status: string }, locked: boolean) {
  if (locked) return 'Already paid'
  if (shift.status === 'cancelled') return 'Cancelled'
  if (shift.date > today()) return 'Mark on the day of the shift'
  return ''
}

/** Compact one-tap marking used in the attendance register rows. */
export function QuickMarks({ shiftId, attendance, reason, payRules }: { shiftId: string; attendance: Attendance; reason: string; payRules?: PayRules | null }) {
  const mark = useAttendanceMutation(shiftId)
  if (reason) {
    return <span className="inline-flex items-center gap-1 text-xs text-faint"><Lock className="h-3 w-3" />{reason}</span>
  }
  const allowed = allowedMarks(payRules)
  const current = mark.isPending ? mark.variables?.status : attendance.status
  const visible = MARKS.filter((item) => allowed[item.value])
  return (
    <div>
      <div className="flex w-full gap-1 sm:inline-flex sm:w-auto" role="group" aria-label="Mark attendance">
        {visible.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={mark.isPending}
            onClick={() => mark.mutate({ status: current === item.value ? 'pending' : item.value })}
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
    </div>
  )
}

/** Same one-tap marks, used in the shift detail panel. */
export function AttendanceForm({ shift, locked }: { shift: { id: string; date: string; status: string; attendance: Attendance; payRules?: PayRules | null }; locked: boolean }) {
  return <QuickMarks shiftId={shift.id} attendance={shift.attendance} reason={lockReason(shift, locked)} payRules={shift.payRules} />
}
