import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CheckCheck, Landmark, Printer, ReceiptText, Wallet } from 'lucide-react'
import { contract, markRemaining, paySalary } from '../../services/api'
import { cn, contractBadge, dateOnly, dayLabel, errorMessage, initials, money, PAYOUT_LABEL, today, unitLabel, when } from '../../lib/utils'
import type { ContractDetail, Payout, PayoutMethod } from '../../types/domain'
import { useCatalog } from '../../hooks/useCatalog'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, Select, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, PageSkeleton } from '../../components/ui/States'
import { lockReason, QuickMarks } from './AttendanceMarker'
const invalidate = ['contracts', 'contract', 'shifts', 'payouts', 'worker', 'workers', 'notifications']

export default function ContractPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: ['contract', id], queryFn: () => contract(id) })
  const [paying, setPaying] = useState(false)

  if (query.isLoading) return <PageSkeleton />
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error, 'Contract not found')} onRetry={() => query.refetch()} />
  const item = query.data

  return (
    <div className="space-y-6">
      <Link to="/attendance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand-deep">
        <ArrowLeft className="h-4 w-4" /> Attendance & payroll
      </Link>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mint text-base font-bold text-brand-deep">{initials(item.workerName)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="flex items-center gap-1 text-xl font-semibold tracking-tight text-ink">{item.workerName}{item.workerVerified && <BadgeCheck className="h-5 w-5 text-action" />}</h1>
                <Badge status={contractBadge(item)} />
              </div>
              <p className="mt-0.5 text-sm text-muted">{item.title}</p>
            </div>
          </div>
          {item.canPay && <Button variant="navy" onClick={() => setPaying(true)}><Wallet className="h-4 w-4" /> Pay {money(item.summary.gross)}</Button>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 text-sm md:grid-cols-4">
          <Fact label="Bond period" value={`${dateOnly(item.startDate)} – ${dateOnly(item.endDate)}`} />
          <Fact label="Role" value={`${item.role} · ${item.department}`} />
          <Fact label="Rate" value={`${money(item.rate)}${unitLabel(item.paymentUnit)}`} />
          <Fact label="Payout to" value={accountLabel(item)} />
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Register item={item} />
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <PayrollPanel item={item} onPay={() => setPaying(true)} />
          {item.payout && <Receipt payout={item.payout} item={item} />}
        </aside>
      </div>

      <PayModal open={paying} item={item} onClose={() => setPaying(false)} />
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-ink" title={value}>{value}</dd>
    </div>
  )
}

function accountLabel(item: ContractDetail) {
  const account = item.worker?.payoutAccount
  if (!account) return 'Not on file'
  if (account.method === 'upi') return account.upiId || 'UPI'
  return `${account.bankName || 'Bank'} ••${account.accountLast4 || ''}`
}

function Register({ item }: { item: ContractDetail }) {
  const queryClient = useQueryClient()
  const locked = item.status === 'paid'
  const due = item.shifts.filter((shift) => shift.status !== 'cancelled' && shift.attendance.status === 'pending' && shift.date <= today()).length
  const bulk = useMutation({
    mutationFn: () => markRemaining(item.id, 'present'),
    onSettled: () => Promise.all(invalidate.map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
  })

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader
        title="Attendance register"
        description={locked ? 'Salary paid — this register is locked.' : 'Tap a mark to record it. Tap it again to clear.'}
        action={!locked && due > 0 && (
          <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark {due} as present
          </Button>
        )}
      />
      {bulk.isError && <p className="border-b border-line bg-danger-soft px-5 py-2 text-xs font-medium text-danger">{errorMessage(bulk.error)}</p>}
      <ul className="divide-y divide-line">
        {item.shifts.map((shift) => {
          const reason = lockReason(shift, locked)
          const overdue = !reason && shift.attendance.status === 'pending'
          return (
            <li key={shift.id} className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5', overdue && 'bg-warn-soft/40')}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-12 shrink-0 rounded-xl border border-line bg-white py-1 text-center">
                  <span className="block text-[10px] font-semibold uppercase text-muted">{new Date(`${shift.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="block text-base font-semibold leading-tight text-ink">{new Date(`${shift.date}T00:00:00`).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {dayLabel(shift.date)}
                    <Badge status={shift.attendance.status} />
                  </p>
                  <p className="text-xs text-muted">
                    {shift.startTime}–{shift.endTime}
                    {shift.attendance.checkIn && ` · in ${shift.attendance.checkIn}`}
                    {shift.attendance.checkOut && ` · out ${shift.attendance.checkOut}`}
                    {shift.attendance.hours !== undefined && shift.attendance.status !== 'pending' && ` · ${shift.attendance.hours}h`}
                    {shift.attendance.markedBy && ` · by ${shift.attendance.markedBy === 'gate' ? 'gate scan' : 'hospital'}`}
                  </p>
                  {shift.attendance.note && <p className="mt-0.5 text-xs italic text-muted">“{shift.attendance.note}”</p>}
                </div>
              </div>
              <div className="sm:shrink-0"><QuickMarks shiftId={shift.id} attendance={shift.attendance} reason={reason} /></div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function PayrollPanel({ item, onPay }: { item: ContractDetail; onPay: () => void }) {
  const { summary } = item
  const unit = item.paymentUnit === 'hourly' ? 'hours' : item.paymentUnit === 'daily' ? 'days' : 'shifts'
  const blocked = item.status === 'active'
    ? `Bond runs until ${dateOnly(item.endDate)}. Salary can be paid after it ends.`
    : summary.pending > 0
      ? `Mark ${summary.pending} more shift${summary.pending === 1 ? '' : 's'} to release the salary.`
      : ''

  return (
    <Card>
      <CardHeader title="Salary" description={item.paymentUnit === 'hourly' ? 'Paid on hours worked' : 'Present and late count as 1, half day as 0.5'} />
      <div className="space-y-2 px-5 py-4 text-sm">
        <Line label="Present" value={summary.present} tone="bg-success" />
        <Line label="Late" value={summary.late} tone="bg-warn" />
        <Line label="Half day" value={summary.halfDay} tone="bg-violet" />
        <Line label="Absent" value={summary.absent} tone="bg-danger" />
        {summary.pending > 0 && <Line label="Not marked" value={summary.pending} tone="bg-line-strong" />}
        <div className="flex justify-between border-t border-line pt-2 text-muted">
          <span>Hours worked</span><span className="font-medium text-ink">{summary.hours}h</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Payable {unit}</span><span className="font-medium text-ink">{summary.units} × {money(summary.rate)}</span>
        </div>
      </div>
      <div className="border-t border-line bg-canvas/60 px-5 py-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-muted">{item.status === 'paid' ? 'Earned' : item.status === 'active' ? 'Earned so far' : 'Salary due'}</span>
          <span className="text-2xl font-semibold tracking-tight text-ink">{money(summary.gross)}</span>
        </div>
        {item.status !== 'paid' && (
          item.canPay
            ? <Button variant="navy" className="mt-3 w-full" onClick={onPay}><Wallet className="h-4 w-4" /> Pay salary</Button>
            : <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-medium text-muted ring-1 ring-inset ring-line">{blocked}</p>
        )}
      </div>
    </Card>
  )
}

function Line({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted"><span className={cn('h-2 w-2 rounded-full', tone)} />{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function Receipt({ payout, item }: { payout: Payout; item: ContractDetail }) {
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-success" /> Payout {payout.number}</span>}
        description={`Paid ${when(payout.paidAt)}`}
        action={<Button size="sm" variant="ghost" onClick={() => printReceipt(payout, item)} aria-label="Print receipt"><Printer className="h-4 w-4" /></Button>}
      />
      <dl className="divide-y divide-line text-sm">
        <Row label="Earned" value={money(payout.gross)} />
        {payout.adjustment !== 0 && <Row label={payout.adjustment > 0 ? 'Bonus' : 'Deduction'} value={`${payout.adjustment > 0 ? '+' : '−'}${money(Math.abs(payout.adjustment))}`} />}
        <Row label="Amount paid" value={money(payout.amount)} strong />
        <Row label="Method" value={PAYOUT_LABEL[payout.method]} />
        {payout.reference && <Row label="Reference" value={payout.reference} />}
        {payout.note && <Row label="Note" value={payout.note} />}
      </dl>
    </Card>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 px-5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-right', strong ? 'font-semibold text-ink' : 'font-medium text-ink')}>{value}</dd>
    </div>
  )
}

function PayModal({ open, item, onClose }: { open: boolean; item: ContractDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { payoutMethods } = useCatalog()
  const preferred = item.worker?.payoutAccount?.method
  const [method, setMethod] = useState<PayoutMethod | ''>('')
  const [reference, setReference] = useState('')
  const [adjustment, setAdjustment] = useState('')
  const [note, setNote] = useState('')
  const chosen: PayoutMethod = method || preferred || 'bank_transfer'
  const delta = Math.round(Number(adjustment) || 0)
  const total = item.summary.gross + delta
  const pay = useMutation({
    mutationFn: () => paySalary(item.id, { method: chosen, reference: reference || undefined, adjustment: delta || undefined, note: note || undefined }),
    onSuccess: async () => {
      await Promise.all(invalidate.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
      onClose()
    },
  })

  return (
    <Modal open={open} title={`Pay ${item.workerName}`} description={item.title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          pay.mutate()
        }}
      >
        <div className="rounded-xl border border-line bg-canvas/60 p-4 text-sm">
          <div className="flex justify-between text-muted"><span>Earned from attendance</span><span className="font-medium text-ink">{money(item.summary.gross)}</span></div>
          {delta !== 0 && <div className="mt-1 flex justify-between text-muted"><span>{delta > 0 ? 'Bonus' : 'Deduction'}</span><span className="font-medium text-ink">{delta > 0 ? '+' : '−'}{money(Math.abs(delta))}</span></div>}
          <div className="mt-2 flex items-end justify-between border-t border-line pt-2"><span className="font-semibold text-ink">Total to pay</span><span className={cn('text-xl font-semibold', total < 0 ? 'text-danger' : 'text-ink')}>{money(total)}</span></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment method" hint={preferred ? `Worker prefers ${PAYOUT_LABEL[preferred]}` : undefined}>
            <Select value={chosen} onChange={(event) => setMethod(event.target.value as PayoutMethod)}>
              {payoutMethods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="Reference" hint="UTR, cheque or receipt number">
            <TextInput value={reference} maxLength={80} onChange={(event) => setReference(event.target.value)} placeholder="Optional" />
          </Field>
        </div>
        {item.worker?.payoutAccount && (
          <p className="flex items-center gap-2 rounded-xl bg-action-soft px-3 py-2 text-xs font-medium text-navy">
            <Landmark className="h-3.5 w-3.5" /> On file: {accountLabel(item)}{item.worker.payoutAccount.ifsc ? ` · ${item.worker.payoutAccount.ifsc}` : ''}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bonus or deduction (₹)" hint="Use a minus sign for deductions">
            <TextInput type="number" inputMode="numeric" step={1} value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="0" />
          </Field>
          <Field label="Note" hint={delta !== 0 ? 'Required when adjusting' : undefined}>
            <TextInput value={note} maxLength={200} required={delta !== 0} onChange={(event) => setNote(event.target.value)} placeholder={delta !== 0 ? 'Reason for the adjustment' : 'Optional'} />
          </Field>
        </div>

        {pay.isError && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{errorMessage(pay.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="navy" disabled={pay.isPending || total < 0}>{pay.isPending ? 'Recording…' : `Confirm ${money(Math.max(total, 0))}`}</Button>
        </div>
        <p className="text-center text-xs text-faint">This records the payment in the portal. Transfer the money through your usual bank or UPI app.</p>
      </form>
    </Modal>
  )
}

function printReceipt(payout: Payout, item: ContractDetail) {
  const win = window.open('', '_blank', 'width=520,height=640')
  if (!win) return
  const rows: [string, string][] = [
    ['Worker', item.workerName],
    ['Contract', item.title],
    ['Period', `${dateOnly(item.startDate)} – ${dateOnly(item.endDate)}`],
    ['Payable units', `${payout.breakdown.units} × ${money(payout.breakdown.rate)}`],
    ['Earned', money(payout.gross)],
    ['Adjustment', money(payout.adjustment)],
    ['Amount paid', money(payout.amount)],
    ['Method', PAYOUT_LABEL[payout.method]],
    ['Reference', payout.reference || '—'],
    ['Paid on', when(payout.paidAt)],
  ]
  const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] as string)
  win.document.write(`<!doctype html><title>${escape(payout.number)}</title><body style="font-family:system-ui;padding:32px;color:#14243a"><h2 style="margin:0">Salary receipt ${escape(payout.number)}</h2><table style="margin-top:20px;width:100%;border-collapse:collapse">${rows.map(([key, value]) => `<tr><td style="padding:8px 0;color:#55657a;border-bottom:1px solid #e3eaf1">${escape(key)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3eaf1;font-weight:600">${escape(value)}</td></tr>`).join('')}</table></body>`)
  win.document.close()
  win.print()
}
