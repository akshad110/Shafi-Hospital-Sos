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
      className={cn('h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold transition-colors duration-150 sm:h-8 sm:px-3.5 sm:text-xs', active ? on : off, className)}
      {...props}
    />
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, className }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (value: T) => void; className?: string }) {
  return (
    <div
      className={cn(
        'grid w-full min-w-0 gap-0.5 rounded-xl border border-line bg-white p-1',
        options.length > 3 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-none',
        'sm:inline-flex sm:w-auto sm:grid-cols-none sm:flex-nowrap',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-9 min-w-0 items-center justify-center overflow-hidden rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition-colors duration-150 sm:h-9 sm:min-h-0 sm:flex-none sm:px-3.5 sm:py-0 sm:text-[13px] sm:whitespace-nowrap',
            option.value === value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
