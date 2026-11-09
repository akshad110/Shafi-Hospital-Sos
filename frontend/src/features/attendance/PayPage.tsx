import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Wallet } from 'lucide-react'
import { contracts } from '../../services/api'
import { cn, dateShort, errorMessage, money } from '../../lib/utils'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { StaffCard } from './StaffCard'

export default function PayPage() {
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['contracts'], queryFn: () => contracts() })
  const items = query.data?.items || []
  const toPay = items.filter((item) => item.canPay)
  const rest = items.filter((item) => !item.canPay)
  const [showRest, setShowRest] = useState(false)

  function open(id: string) {
    navigate(`/attendance/${id}?from=pay`)
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Pay"
        title="Pay your staff"
        description="Pay people after their days are marked."
        actions={
          toPay.length > 0 ? (
            <div className="rounded-2xl border border-line bg-white px-4 py-2.5 sm:min-w-[9.5rem] sm:text-right">
              <p className="text-[11px] font-medium text-muted">Ready to pay</p>
              <p className="text-lg font-semibold tabular-nums text-ink">{money(query.data?.counts.due || 0)}</p>
            </div>
          ) : undefined
        }
      />

      {query.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-[4.5rem]" />)}
        </div>
      )}
      {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}

      {query.data && toPay.length === 0 && rest.length === 0 && (
        <Card>
          <EmptyState title="No one to pay yet" body="People show up here after a placement is confirmed." />
        </Card>
      )}

      {toPay.length > 0 && (
        <section className="min-w-0">
          <p className="mb-3 flex items-center gap-2 px-0.5 text-sm font-semibold text-ink">
            <Wallet className="h-4 w-4 text-action" />
            Pay these people
            <span className="rounded-full bg-action-soft px-2 py-0.5 text-[11px] font-semibold text-action">{toPay.length}</span>
          </p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {toPay.map((item) => (
              <StaffCard
                key={item.id}
                item={item}
                hint={`${item.role} · ${dateShort(item.startDate)} – ${dateShort(item.endDate)}`}
                action="Pay now"
                onClick={() => open(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="min-w-0">
          <button
            type="button"
            aria-expanded={showRest}
            aria-controls="working-paid-list"
            onClick={() => setShowRest((value) => !value)}
            className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-left hover:border-brand/50 hover:bg-[#fbfefd] sm:px-4"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Working & paid</span>
              <span className="text-xs text-muted">
                {rest.length} {rest.length === 1 ? 'person' : 'people'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink">
              {showRest ? 'Hide' : 'Show'}
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', showRest && 'rotate-180')} />
            </span>
          </button>
          {showRest && (
            <div id="working-paid-list" className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
              {rest.map((item) => (
                <StaffCard
                  key={item.id}
                  item={item}
                  hint={item.status === 'paid' ? `Paid · ${item.role}` : `${item.role} · ${dateShort(item.startDate)} – ${dateShort(item.endDate)}`}
                  action={item.status === 'paid' ? 'Paid' : 'View'}
                  onClick={() => open(item.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
