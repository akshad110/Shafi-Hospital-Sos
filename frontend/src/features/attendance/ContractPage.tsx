import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Landmark, Printer, ReceiptText, Wallet } from 'lucide-react'
import { contract, paySalary } from '../../services/api'
import { fallbackPayRules } from '../../lib/payRules'
import { cn, contractBadge, dateOnly, errorMessage, initials, money, PAYOUT_LABEL, unitLabel, when } from '../../lib/utils'
import type { ContractDetail, Payout, PayoutMethod } from '../../types/domain'
import { useCatalog } from '../../hooks/useCatalog'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, Select, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, PageSkeleton } from '../../components/ui/States'
import { AttendanceRegister, payrollKeys } from './AttendanceRegister'

export default function ContractPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const fromPay = params.get('from') === 'pay'
  const query = useQuery({ queryKey: ['contract', id], queryFn: () => contract(id) })
  const [paying, setPaying] = useState(false)

  if (query.isLoading) return <PageSkeleton />
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error, 'Contract not found')} onRetry={() => query.refetch()} />
  const item = query.data

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <Link to={fromPay ? '/pay' : '/attendance'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand-deep">
        <ArrowLeft className="h-4 w-4" /> {fromPay ? 'Back to pay' : 'Back to attendance'}
      </Link>

      <Card className="min-w-0 overflow-hidden p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-sm font-bold text-brand-deep sm:h-14 sm:w-14 sm:text-base">{initials(item.workerName)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="flex min-w-0 items-center gap-1 text-lg font-semibold tracking-tight text-ink sm:text-xl"><span className="truncate">{item.workerName}</span>{item.workerVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-action" />}</h1>
                <Badge status={contractBadge(item)} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">{item.title}</p>
            </div>
          </div>
          {item.canPay && <Button variant="navy" className="w-full md:w-auto" onClick={() => setPaying(true)}><Wallet className="h-4 w-4" /> Pay {money(item.summary.gross)}</Button>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 text-sm md:grid-cols-4">
          <Fact label="Dates" value={`${dateOnly(item.startDate)} – ${dateOnly(item.endDate)}`} />
          <Fact label="Role" value={`${item.role} · ${item.department}`} />
          <Fact label="Rate" value={`${money(item.rate)}${unitLabel(item.paymentUnit)}`} />
          <Fact label="Pay to" value={accountLabel(item)} />
        </dl>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <AttendanceRegister item={item} />
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
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

function PayrollPanel({ item, onPay }: { item: ContractDetail; onPay: () => void }) {
  const { summary } = item
  const rules = fallbackPayRules(item.rate, item.payRules)
  const blocked = item.status === 'active'
    ? `Pay after ${dateOnly(item.endDate)}.`
    : summary.pending > 0
      ? `Mark ${summary.pending} more day${summary.pending === 1 ? '' : 's'} first.`
      : ''

  return (
    <Card>
      <CardHeader title="Pay" description="Totals update as you mark each day." />
      <div className="space-y-2 px-5 py-4 text-sm">
        <Line label={`Present · ${money(rules.presentPay)}`} value={`${summary.present} · ${money(summary.earnedPresent ?? summary.present * rules.presentPay)}`} tone="bg-success" />
        {rules.lateAllowed && <Line label={`Late · ${money(Math.max(0, rules.presentPay - rules.lateDeduction))}`} value={`${summary.late} · ${money(summary.earnedLate ?? 0)}`} tone="bg-warn" />}
        {rules.halfDayAllowed && <Line label={`Half · ${money(rules.halfDayPay)}`} value={`${summary.halfDay} · ${money(summary.earnedHalf ?? 0)}`} tone="bg-violet" />}
        {rules.absentAllowed && <Line label="Absent · ₹0" value={`${summary.absent} · ${money(summary.earnedAbsent ?? 0)}`} tone="bg-danger" />}
        {summary.pending > 0 && <Line label="Not marked" value={String(summary.pending)} tone="bg-line-strong" />}
      </div>
      <div className="border-t border-line bg-canvas/60 px-5 py-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-muted">{item.status === 'paid' ? 'Paid' : 'Earned so far'}</span>
          <span className="text-2xl font-semibold tracking-tight text-ink">{money(summary.gross)}</span>
        </div>
        {summary.pending > 0 && (
          <p className="mt-1 text-xs text-muted">If remaining days are present: {money(summary.gross + summary.pending * rules.presentPay)}</p>
        )}
        {item.status !== 'paid' && (
          item.canPay
            ? <Button variant="navy" className="mt-3 w-full" onClick={onPay}><Wallet className="h-4 w-4" /> Pay now</Button>
            : <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-medium text-muted ring-1 ring-inset ring-line">{blocked}</p>
        )}
      </div>
    </Card>
  )
}

function Line({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-muted"><span className={cn('h-2 w-2 shrink-0 rounded-full', tone)} />{label}</span>
      <span className="shrink-0 font-medium text-ink">{value}</span>
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
  const [extra, setExtra] = useState(false)
  const chosen: PayoutMethod = method || preferred || 'upi'
  const delta = Math.round(Number(adjustment) || 0)
  const total = item.summary.gross + delta
  const pay = useMutation({
    mutationFn: () => paySalary(item.id, { method: chosen, reference: reference || undefined, adjustment: delta || undefined, note: note || undefined }),
    onSuccess: async () => {
      await Promise.all(payrollKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
      onClose()
    },
  })

  return (
    <Modal open={open} title={`Pay ${item.workerName}`} description={`${money(item.summary.gross)} for this contract`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          pay.mutate()
        }}
      >
        <p className="text-center">
          <span className="block text-xs font-medium text-muted">You will record</span>
          <span className={cn('text-3xl font-semibold tracking-tight', total < 0 ? 'text-danger' : 'text-ink')}>{money(total)}</span>
        </p>

        <Field label="How did you pay?">
          <Select value={chosen} onChange={(event) => setMethod(event.target.value as PayoutMethod)}>
            {(payoutMethods.length ? payoutMethods : [
              { value: 'upi' as const, label: 'UPI' },
              { value: 'bank_transfer' as const, label: 'Bank transfer' },
              { value: 'cash' as const, label: 'Cash' },
            ]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        {item.worker?.payoutAccount && (
          <p className="flex items-center gap-2 rounded-xl bg-action-soft px-3 py-2 text-xs font-medium text-navy">
            <Landmark className="h-3.5 w-3.5 shrink-0" /> {accountLabel(item)}
          </p>
        )}

        {!extra ? (
          <button type="button" className="text-xs font-semibold text-action" onClick={() => setExtra(true)}>Add UTR, bonus or deduction</button>
        ) : (
          <div className="grid gap-3">
            <Field label="UTR / reference"><TextInput value={reference} maxLength={80} onChange={(event) => setReference(event.target.value)} placeholder="Optional" /></Field>
            <Field label="Bonus or cut (₹)" hint="Minus for a cut">
              <TextInput type="number" inputMode="numeric" step={1} value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="0" />
            </Field>
            {delta !== 0 && (
              <Field label="Why?" hint="Needed for a bonus or cut">
                <TextInput value={note} maxLength={200} required onChange={(event) => setNote(event.target.value)} placeholder="Reason" />
              </Field>
            )}
          </div>
        )}

        {pay.isError && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{errorMessage(pay.error)}</p>}
        <Button type="submit" variant="navy" className="w-full" disabled={pay.isPending || total < 0}>
          {pay.isPending ? 'Saving…' : `Pay ${money(Math.max(total, 0))}`}
        </Button>
        <p className="text-center text-xs text-faint">This only records it here. Send the money in your bank or UPI app as usual.</p>
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
