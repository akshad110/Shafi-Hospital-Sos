import { cn } from '../../lib/utils'

export function Chip({ active, tone = 'brand', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: 'brand' | 'sos' }) {
  const on = tone === 'sos' ? 'border-sos bg-sos text-white' : 'border-brand bg-brand text-white'
  const off = tone === 'sos'
    ? 'border-line-strong bg-white text-muted hover:border-sos hover:text-sos'
    : 'border-line-strong bg-white text-muted hover:border-brand hover:text-brand-deep'
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn('h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors duration-150', active ? on : off, className)}
      {...props}
    />
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, className }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (value: T) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-white p-1', className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 shrink-0 rounded-lg px-3.5 text-[13px] font-semibold transition-colors duration-150',
            option.value === value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
