import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, Download, Sparkles } from 'lucide-react'
import { billing, changePlan, subscription } from '../../services/api'
import { cn, dateOnly, daysLeft, errorMessage, money, PLAN_LABEL } from '../../lib/utils'
import type { Invoice, Plan } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, rowClass } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/States'

function periodLabel(months: number) {
  return months === 1 ? '1 month' : `${months} months`
}

function addMonths(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString()
}

export default function SubscriptionPage() {
  const queryClient = useQueryClient()
  const planQuery = useQuery({ queryKey: ['subscription'], queryFn: subscription })
  const billQuery = useQuery({ queryKey: ['billing'], queryFn: billing })
  const [pick, setPick] = useState<Plan | null>(null)
  const [flash, setFlash] = useState('')

  const change = useMutation({
    mutationFn: (plan: Plan) => changePlan(plan.code),
    onSuccess: async (next) => {
      setPick(null)
      setFlash(`${PLAN_LABEL[next.plan]} is now active until ${dateOnly(next.renewalDate)}.`)
      await Promise.all(['subscription', 'billing', 'session', 'notifications'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
    },
  })

  const data = planQuery.data
  if (planQuery.isLoading) return <PageSkeleton />
  if (planQuery.isError || !data?.subscription) return <ErrorState message={errorMessage(planQuery.error, 'No subscription on file')} onRetry={() => planQuery.refetch()} />

  const current = data.subscription
  const onTrial = current.plan === 'trial'
  const currentPlan = data.plans.find((item) => item.code === current.plan)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscription"
        title="Plan and billing"
        description="Start with a 7-day free trial, then choose Starter (1 month), Professional (6 months) or Enterprise (12 months). Switching replaces your current plan straight away."
      />

      {flash && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-[#05603a]">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {flash}
        </div>
      )}

      <CurrentPlan
        label={PLAN_LABEL[current.plan]}
        status={current.status}
        cycleLabel={onTrial ? `${data.trial.days}-day trial` : periodLabel(currentPlan?.months ?? current.months)}
        amount={currentPlan?.price ?? 0}
        startedAt={current.startedAt}
        renewalDate={current.renewalDate}
        usage={data.usage}
        limits={{ requests: current.requestLimit, locations: current.locationLimit }}
      />

      <section>
        <div>
          <h2 className="text-lg font-semibold text-ink">{onTrial ? 'Choose a plan' : 'Change plan'}</h2>
          <p className="text-sm text-muted">Each plan runs for a fixed period. Longer plans cost less per month.</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {data.plans.map((plan) => {
            const active = current.status === 'active' && plan.code === current.plan
            const period = periodLabel(plan.months)
            return (
              <article
                key={plan.code}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-white p-5 transition-all duration-150 md:p-6',
                  active ? 'border-brand ring-1 ring-brand' : 'border-line hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-[0_12px_32px_-16px_rgba(20,36,58,0.25)]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[17px] font-semibold text-ink">{plan.name}</h3>
                  {active ? <Badge status="approved">Current plan</Badge> : plan.popular && <Badge status="offered"><Sparkles className="mr-1 h-3 w-3" />Most chosen</Badge>}
                </div>
                <p className="mt-3 inline-flex w-fit items-center rounded-md bg-canvas px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-inset ring-line">{period}</p>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[32px] font-semibold leading-none tracking-tight text-ink">{money(plan.price)}</span>
                  <span className="text-sm text-muted">/ {period}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {plan.months > 1 ? `${money(Math.round(plan.price / plan.months))}/month · billed once for ${period}` : 'Billed monthly'}
                </p>

                <div className="my-5 h-px bg-line" />
                <ul className="flex-1 space-y-2.5 text-sm text-ink">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={active ? 'outline' : plan.popular ? 'primary' : 'navy'}
                  disabled={active}
                  onClick={() => { change.reset(); setPick(plan) }}
                >
                  {active ? 'Active plan' : onTrial ? `Choose ${plan.name}` : `Switch to ${plan.name}`}
                </Button>
              </article>
            )
          })}
        </div>
      </section>

      <BillingHistory invoices={billQuery.data} loading={billQuery.isLoading} error={billQuery.isError ? errorMessage(billQuery.error) : ''} onRetry={() => billQuery.refetch()} />

      <Modal
        open={Boolean(pick)}
        title={onTrial ? 'Start this plan?' : 'Cancel current plan and switch?'}
        description={pick ? `${pick.name} · ${periodLabel(pick.months)}` : undefined}
        onClose={() => setPick(null)}
      >
        {pick && (
          <div>
            <p className="text-sm leading-6 text-ink">
              {onTrial ? (
                <>Your <strong>free trial</strong> ends now and <strong>{pick.name}</strong> starts today.</>
              ) : (
                <>Your <strong>{PLAN_LABEL[current.plan]}</strong> plan will be cancelled right away and <strong>{pick.name}</strong> starts today.</>
              )}
            </p>
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
              <SummaryRow label="New plan" value={`${pick.name} · ${periodLabel(pick.months)}`} />
              <SummaryRow label="Valid until" value={dateOnly(addMonths(pick.months))} />
              <SummaryRow label="Active requests" value={`Up to ${pick.activeRequests}`} />
              <SummaryRow label="Locations" value={`Up to ${pick.locations}`} />
              <SummaryRow label="Amount" value={money(pick.price)} strong />
            </dl>
            <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2.5 text-xs leading-5 text-[#7a4a00]">
              Online payment is not connected yet. The amount is added to billing history as payment due.
            </p>
            {change.isError && <p className="mt-3 text-sm font-medium text-danger">{errorMessage(change.error)}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPick(null)}>{onTrial ? 'Not now' : 'Keep current plan'}</Button>
              <Button disabled={change.isPending} onClick={() => change.mutate(pick)}>
                {change.isPending ? 'Switching…' : onTrial ? 'Yes, start plan' : 'Yes, switch plan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function CurrentPlan({ label, status, cycleLabel, amount, startedAt, renewalDate, usage, limits }: {
  label: string
  status: 'trial' | 'active' | 'expired'
  cycleLabel: string
  amount: number
  startedAt: string
  renewalDate: string
  usage: { activeRequests: number; locations: number }
  limits: { requests: number; locations: number }
}) {
  const total = Math.max(1, new Date(renewalDate).getTime() - new Date(startedAt).getTime())
  const elapsed = Math.min(100, Math.max(0, Math.round(((Date.now() - new Date(startedAt).getTime()) / total) * 100)))
  const left = daysLeft(renewalDate)
  const statusLabel = status === 'trial' ? 'Free trial' : status === 'active' ? 'Active' : 'Expired'

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1.5fr_1fr]">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={status === 'active' ? 'approved' : status}>{statusLabel}</Badge>
            <span className="text-xs font-medium text-muted">{cycleLabel}</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{label}</h2>
          <p className="mt-1 text-sm text-muted">
            {status === 'trial'
              ? 'Every hospital feature is open during the trial. Choose a plan before it ends to keep posting requests.'
              : status === 'expired'
                ? 'This plan has ended. Choose a plan below to keep posting requests.'
                : `${money(amount)} for ${cycleLabel}.`}
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">Started</dt>
              <dd className="mt-0.5 font-semibold text-ink">{dateOnly(startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{status === 'trial' ? 'Trial ends' : 'Valid until'}</dt>
              <dd className="mt-0.5 font-semibold text-ink">{dateOnly(renewalDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Days left</dt>
              <dd className={cn('mt-0.5 font-semibold', left <= 3 ? 'text-sos' : 'text-ink')}>{left}</dd>
            </div>
          </dl>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-canvas ring-1 ring-inset ring-line">
            <div className={cn('h-full rounded-full', left <= 3 ? 'bg-sos' : 'bg-brand')} style={{ width: `${elapsed}%` }} />
          </div>
        </div>

        <div className="border-t border-line bg-canvas/70 p-5 md:p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Usage</p>
          <Meter label="Active requests" used={usage.activeRequests} limit={limits.requests} />
          <Meter label="Hospital locations" used={usage.locations} limit={limits.locations} />
        </div>
      </div>
    </Card>
  )
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const width = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-ink">{used}<span className="font-medium text-muted"> / {limit}</span></span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-line">
        <div className={cn('h-full rounded-full', width >= 100 ? 'bg-sos' : width >= 80 ? 'bg-warn' : 'bg-navy')} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-right text-ink', strong ? 'text-base font-semibold' : 'font-medium')}>{value}</dd>
    </div>
  )
}

function BillingHistory({ invoices, loading, error, onRetry }: { invoices?: Invoice[]; loading: boolean; error: string; onRetry: () => void }) {
  return (
    <Card>
      <CardHeader title="Billing history" description="Invoices for every plan you start or switch to." />
      {loading && <div className="p-5"><PageSkeleton /></div>}
      {error && <div className="p-5"><ErrorState message={error} onRetry={onRetry} /></div>}
      {invoices && invoices.length === 0 && <EmptyState title="No invoices yet" body="You're on the free trial. Invoices appear here once you choose a plan." />}
      {invoices && invoices.length > 0 && (
        <ul className="divide-y divide-line">
          {invoices.map((invoice) => (
            <li key={invoice.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 md:px-5', rowClass)}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{invoice.description}</p>
                <p className="text-xs text-muted">{invoice.number} · {dateOnly(invoice.issuedAt)}</p>
              </div>
              <Badge status={invoice.status} />
              <span className="w-24 text-right text-sm font-semibold text-ink">{money(invoice.amount)}</span>
              <Button variant="ghost" size="sm" onClick={() => downloadInvoice(invoice)} aria-label={`Download ${invoice.number}`}>
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function downloadInvoice(invoice: Invoice) {
  const lines = [
    'Shafi SOS — Hospital Portal',
    `Invoice ${invoice.number}`,
    `Issued ${dateOnly(invoice.issuedAt)}`,
    invoice.description,
    `Amount ${money(invoice.amount)}`,
    `Status ${invoice.status === 'due' ? 'Payment due' : invoice.status}`,
  ]
  const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${invoice.number}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
