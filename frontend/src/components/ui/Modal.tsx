import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
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
            className="relative max-h-[92vh] w-full max-w-full overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:pb-0"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-white px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink sm:text-[17px]">{title}</h2>
                {description && <p className="mt-0.5 text-xs text-muted sm:text-sm">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Close dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
