import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, Lock } from 'lucide-react'
import { markAttendance } from '../../services/api'
import { cn, errorMessage, today } from '../../lib/utils'
import type { Attendance, AttendanceStatus } from '../../types/domain'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Field'

export const MARKS: { value: Exclude<AttendanceStatus, 'pending'>; label: string; on: string }[] = [
  { value: 'present', label: 'Present', on: 'border-success bg-success text-white' },
  { value: 'late', label: 'Late', on: 'border-warn bg-warn text-white' },
  { value: 'half_day', label: 'Half day', on: 'border-violet bg-violet text-white' },
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
  if (locked) return 'Salary paid — attendance is locked'
  if (shift.status === 'cancelled') return 'Shift cancelled'
  if (shift.date > today()) return 'Can be marked from the shift day'
  return ''
}

/** Compact one-tap marking used in the attendance register rows. */
export function QuickMarks({ shiftId, attendance, reason }: { shiftId: string; attendance: Attendance; reason: string }) {
  const mark = useAttendanceMutation(shiftId)
  if (reason) {
    return <span className="inline-flex items-center gap-1 text-xs text-faint"><Lock className="h-3 w-3" />{reason}</span>
  }
  const current = mark.isPending ? mark.variables?.status : attendance.status
  return (
    <div>
      <div className="inline-flex flex-wrap gap-1" role="group" aria-label="Mark attendance">
        {MARKS.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={mark.isPending}
            onClick={() => mark.mutate({ status: current === item.value ? 'pending' : item.value })}
            aria-pressed={current === item.value}
            className={cn(
              'h-7 rounded-lg border px-2 text-[11px] font-semibold transition-colors disabled:opacity-60',
              current === item.value ? item.on : 'border-line-strong bg-white text-muted hover:border-ink hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {mark.isError && <p className="mt-1 text-xs text-danger">{errorMessage(mark.error)}</p>}
    </div>
  )
}

/** Full marking form with check-in, check-out and note, used in the shift detail panel. */
export function AttendanceForm({ shift, locked }: { shift: { id: string; date: string; status: string; startTime: string; endTime: string; attendance: Attendance }; locked: boolean }) {
  const reason = lockReason(shift, locked)
  const mark = useAttendanceMutation(shift.id)
  const [status, setStatus] = useState<AttendanceStatus>(shift.attendance.status)
  const [checkIn, setCheckIn] = useState(shift.attendance.checkIn || '')
  const [checkOut, setCheckOut] = useState(shift.attendance.checkOut || '')
  const [note, setNote] = useState(shift.attendance.note || '')
  const absent = status === 'absent'

  if (reason) {
    return <p className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs font-medium text-muted"><Lock className="h-3.5 w-3.5" />{reason}</p>
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        mark.mutate({ status, checkIn: absent ? undefined : checkIn || undefined, checkOut: absent ? undefined : checkOut || undefined, note: note || undefined })
      }}
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {MARKS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            aria-pressed={status === item.value}
            className={cn('h-9 rounded-xl border text-xs font-semibold transition-colors', status === item.value ? item.on : 'border-line-strong bg-white text-muted hover:border-ink hover:text-ink')}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!absent && status !== 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-muted">
            Check-in
            <TextInput type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} placeholder={shift.startTime} className="mt-1 h-10" />
          </label>
          <label className="text-xs font-medium text-muted">
            Check-out
            <TextInput type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} placeholder={shift.endTime} className="mt-1 h-10" />
          </label>
        </div>
      )}
      <TextInput value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Note (optional), e.g. arrived 20 min late" className="h-10" aria-label="Attendance note" />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-faint"><Clock3 className="h-3.5 w-3.5" />Leave times empty to use {shift.startTime}–{shift.endTime}</span>
        <Button type="submit" size="sm" disabled={status === 'pending' || mark.isPending}>
          {mark.isSuccess && !mark.isPending ? <><Check className="h-4 w-4" /> Saved</> : mark.isPending ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
      {mark.isError && <p className="text-xs font-medium text-danger">{errorMessage(mark.error)}</p>}
    </form>
  )
}
