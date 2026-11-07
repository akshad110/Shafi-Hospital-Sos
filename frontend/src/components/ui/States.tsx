import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from './Button'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e6edf4] ${className}`} />
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-12">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-canvas text-muted ring-1 ring-line">
        <Inbox className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-[#b42323]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{message}</p>
        {onRetry && <Button variant="danger" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
