import { cn } from '../../lib/utils'

export const LOGO_SRC = '/logo.jpeg'

export function Logo({ className, alt = 'Shafi SOS' }: { className?: string; alt?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn('h-10 w-10 shrink-0 rounded-xl bg-white object-contain', className)}
    />
  )
}
