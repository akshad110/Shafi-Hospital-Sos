import { cn, STATUS_LABEL } from '../../lib/utils'

const tones: Record<string, string> = {
  approved: 'bg-success-soft text-[#05603a] ring-[#12b76a]/25',
  confirmed: 'bg-success-soft text-[#05603a] ring-[#12b76a]/25',
  completed: 'bg-success-soft text-[#05603a] ring-[#12b76a]/25',
  present: 'bg-success-soft text-[#05603a] ring-[#12b76a]/25',
  paid: 'bg-success-soft text-[#05603a] ring-[#12b76a]/25',
  late: 'bg-warn-soft text-[#8f5300] ring-warn/30',
  half_day: 'bg-violet-soft text-[#6d3fd6] ring-violet/25',
  absent: 'bg-danger-soft text-[#c42a2a] ring-danger/25',
  ready: 'bg-action-soft text-action ring-action/20',
  active: 'bg-action-soft text-navy ring-navy/20',
  shortlisted: 'bg-violet-soft text-[#6d3fd6] ring-violet/25',
  offered: 'bg-action-soft text-action ring-action/20',
  pending_review: 'bg-warn-soft text-[#8f5300] ring-warn/30',
  under_review: 'bg-warn-soft text-[#8f5300] ring-warn/30',
  needs_update: 'bg-warn-soft text-[#8f5300] ring-warn/30',
  pending: 'bg-canvas text-muted ring-line-strong',
  due: 'bg-warn-soft text-[#8f5300] ring-warn/30',
  upcoming: 'bg-mint text-brand-deep ring-brand/25',
  trial: 'bg-mint text-brand-deep ring-brand/25',
  draft: 'bg-canvas text-muted ring-line-strong',
  rejected: 'bg-danger-soft text-[#c42a2a] ring-danger/25',
  cancelled: 'bg-danger-soft text-[#c42a2a] ring-danger/25',
  expired: 'bg-danger-soft text-[#c42a2a] ring-danger/25',
  urgent: 'bg-sos-soft text-[#c42a2a] ring-sos/25',
  filled: 'bg-mint text-brand-deep ring-brand/25',
}

export function Badge({ status, children, className }: { status?: string; children?: React.ReactNode; className?: string }) {
  const key = status || ''
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', tones[key] || 'bg-canvas text-muted ring-line-strong', className)}>
      {children || STATUS_LABEL[key] || key}
    </span>
  )
}
