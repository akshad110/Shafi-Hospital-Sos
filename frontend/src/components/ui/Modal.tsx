import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

let openModals = 0

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'md' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const depth = ++openModals
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && depth === openModals) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      openModals -= 1
      if (openModals === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-[#14243a]/45" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'relative flex max-h-[92vh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-2xl sm:pb-0',
              size === 'xl' ? 'sm:max-w-4xl lg:max-w-5xl' : 'sm:max-w-lg',
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-white px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink sm:text-[17px]">{title}</h2>
                {description && <p className="mt-0.5 text-xs text-muted sm:text-sm">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Close dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-white px-4 py-3 sm:px-5 sm:py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
