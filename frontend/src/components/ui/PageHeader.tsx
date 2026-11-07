export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-deep md:text-xs">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted sm:mt-1.5 sm:text-sm sm:leading-6">{description}</p>}
      </div>
      {actions && <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>}
    </div>
  )
}
