import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-deep active:bg-[#06695f]',
  navy: 'bg-navy text-white shadow-sm hover:bg-[#1b3277] active:bg-[#152a63]',
  outline: 'border border-line-strong bg-white text-ink hover:border-brand hover:bg-mint hover:text-brand-deep',
  ghost: 'bg-transparent text-muted hover:bg-white hover:text-ink',
  danger: 'border border-danger/30 bg-white text-danger hover:border-danger hover:bg-danger hover:text-white',
  sos: 'bg-sos text-white shadow-sm hover:bg-[#d83434] active:bg-[#c22d2d]',
}

const sizes = {
  md: 'h-10 px-3.5 text-[13px] sm:h-11 sm:px-4 sm:text-sm',
  sm: 'h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-[13px]',
}

export type ButtonVariant = keyof typeof variants

export function buttonClass(variant: ButtonVariant = 'primary', size: keyof typeof sizes = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}
