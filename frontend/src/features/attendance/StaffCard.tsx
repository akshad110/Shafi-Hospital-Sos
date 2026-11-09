import { BadgeCheck } from 'lucide-react'
import { cn, initials, money } from '../../lib/utils'
import type { ContractCard } from '../../types/domain'
import { interactiveCard } from '../../components/ui/Card'

export function StaffCard({
  item,
  hint,
  action,
  selected,
  onClick,
}: {
  item: ContractCard
  hint: string
  action: string
  selected?: boolean
  onClick: () => void
}) {
  const pay = item.canPay && action.toLowerCase().includes('pay')
  const paid = action === 'Paid'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 rounded-2xl border bg-white p-3 text-left sm:gap-3.5 sm:p-3.5',
        interactiveCard,
        selected ? 'border-brand bg-mint/40' : 'border-line',
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy sm:h-12 sm:w-12 sm:text-sm">
        {initials(item.workerName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold text-ink sm:text-[15px]">{item.workerName}</span>
          {item.workerVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-action" />}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-xs">{hint}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-semibold tabular-nums text-ink sm:text-[15px]">{money(item.summary.gross)}</span>
        <span
          className={cn(
            'inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold',
            pay && 'bg-action text-white',
            paid && 'bg-success-soft text-[#05603a]',
            !pay && !paid && 'bg-canvas text-muted',
          )}
        >
          {action}
        </span>
      </span>
    </button>
  )
}
