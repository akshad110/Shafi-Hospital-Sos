import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { applications, contracts, notifications } from '../../services/api'
import { useSession } from '../../app/session'
import { WifiOff } from 'lucide-react'

export function AppShell() {
  const { hospital, user } = useSession()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const notes = useQuery({ queryKey: ['notifications', 'badge'], queryFn: () => notifications({ limit: 1 }) })
  const review = useQuery({
    queryKey: ['applications', { status: 'under_review' }],
    queryFn: () => applications({ status: 'under_review', limit: 1 }),
  })
  const payroll = useQuery({ queryKey: ['contracts'], queryFn: () => contracts() })
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  const counts = { review: review.data?.total || 0, payroll: payroll.data?.counts.readyToPay || 0 }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="hidden xl:fixed xl:inset-y-0 xl:flex">
        <Sidebar hospital={hospital} permissions={user.permissions} counts={counts} />
      </div>
      <div className="hidden md:fixed md:inset-y-0 md:flex xl:hidden">
        <Sidebar hospital={hospital} permissions={user.permissions} counts={counts} collapsed />
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <motion.button type="button" className="absolute inset-0 bg-[#14243a]/40" onClick={() => setDrawer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div initial={{ x: -272 }} animate={{ x: 0 }} exit={{ x: -272 }} transition={{ duration: 0.2 }} className="absolute inset-y-0 left-0 shadow-2xl">
              <Sidebar hospital={hospital} permissions={user.permissions} counts={counts} onNavigate={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="md:pl-[76px] xl:pl-[272px]">
        <Topbar hospital={hospital} unread={notes.data?.unread || 0} onMenu={() => setDrawer(true)} />
        {offline && (
          <div className="flex items-center gap-2 bg-warn-soft px-4 py-2 text-xs font-semibold text-[#8a5a00]">
            <WifiOff className="h-3.5 w-3.5" /> You are offline. Saved screens may open, but live staffing data will not refresh.
          </div>
        )}
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 md:px-8 md:pb-12 xl:px-10">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
