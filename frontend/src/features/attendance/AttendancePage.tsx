import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { contract, contracts } from '../../services/api'
import { dateShort, errorMessage } from '../../lib/utils'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, PageSkeleton, Skeleton } from '../../components/ui/States'
import { AttendanceRegister } from './AttendanceRegister'
import { StaffCard } from './StaffCard'

export default function AttendancePage() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: ['contracts'], queryFn: () => contracts() })
  const items = (query.data?.items || []).filter((item) => item.status !== 'paid')
  const toMark = items.filter((item) => item.summary.toMark > 0)
  const rest = items.filter((item) => item.summary.toMark === 0)
  const people = [...toMark, ...rest]
  const requested = params.get('id') || ''
  const selectedId = people.some((item) => item.id === requested) ? requested : (wide ? people[0]?.id || '' : '')
  const selected = people.find((item) => item.id === selectedId)
  const detail = useQuery({
    queryKey: ['contract', selectedId],
    queryFn: () => contract(selectedId),
    enabled: Boolean(selectedId),
  })

  function pick(id: string) {
    setParams({ id }, { replace: true })
  }

  if (query.isLoading) return <PageSkeleton />
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />

  const showList = wide || !selectedId
  const showRegister = Boolean(selectedId)

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Manage attendance"
        description="Pick a person, then tap Present, Late, Half or Absent."
      />

      {people.length === 0 ? (
        <Card>
          <EmptyState title="No one to mark" body="People show up here after a placement is confirmed." />
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {showList && (
            <div className="min-w-0">
              <div className="space-y-3 lg:sticky lg:top-24">
              {toMark.length > 0 && (
                <section className="min-w-0">
                  <p className="mb-2 flex items-center gap-1.5 px-0.5 text-sm font-semibold text-ink">
                    <ClipboardCheck className="h-4 w-4 text-warn" /> Who came in?
                  </p>
                  <div className="grid gap-2.5">
                    {toMark.map((item) => (
                      <StaffCard
                        key={item.id}
                        item={item}
                        selected={item.id === selectedId}
                        hint={`${item.summary.toMark} day${item.summary.toMark === 1 ? '' : 's'} left · ${dateShort(item.startDate)} – ${dateShort(item.endDate)}`}
                        action="Mark"
                        onClick={() => pick(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {rest.length > 0 && (
                <section className="min-w-0">
                  <p className="mb-2 px-0.5 text-sm font-semibold text-ink">All marked</p>
                  <div className="grid gap-2.5">
                    {rest.map((item) => (
                      <StaffCard
                        key={item.id}
                        item={item}
                        selected={item.id === selectedId}
                        hint={`All days marked · ${dateShort(item.startDate)} – ${dateShort(item.endDate)}`}
                        action={item.canPay ? 'Ready to pay' : 'View'}
                        onClick={() => pick(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
              </div>
            </div>
          )}

          {showRegister && (
            <div className="min-w-0 space-y-3">
              {!wide && (
                <button type="button" onClick={() => setParams({}, { replace: true })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
                  <ArrowLeft className="h-4 w-4" /> All people
                </button>
              )}
              {selected && (
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink sm:text-lg">{selected.workerName}</p>
                  <p className="truncate text-xs text-muted sm:text-sm">{selected.title}</p>
                </div>
              )}
              {detail.isLoading && <Skeleton className="h-72" />}
              {detail.isError && <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />}
              {detail.data && <AttendanceRegister item={detail.data} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
