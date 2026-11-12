import { cn } from '../../lib/utils'

export const LOGO_SRC = '/logo.png?v=5'
export const LOGO_MARK_SRC = '/logo-mark.png?v=5'

export function Logo({
  className,
  alt = 'Shafi SOS',
  mark = false,
}: {
  className?: string
  alt?: string
  mark?: boolean
}) {
  return (
    <img
      src={mark ? LOGO_MARK_SRC : LOGO_SRC}
      alt={alt}
      className={cn(
        'shrink-0 object-contain',
        mark ? 'h-10 w-10' : 'h-10 w-auto max-w-[220px] object-left',
        className,
      )}
    />
  )
}
