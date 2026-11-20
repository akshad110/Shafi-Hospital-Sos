import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query'
import { applications, catalog, contracts, jobs, notifications, shifts, subscription } from '../services/api'
import { markSignedIn } from '../services/api/client'

const CACHE_KEY = 'hos_qc_v5'
const MAX_BYTES = 1_400_000

export function restoreQueryCache(client: QueryClient) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    hydrate(client, JSON.parse(raw))
    void client.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'session' && query.queryKey[0] !== 'catalog',
    })
  } catch {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      /* ignore */
    }
  }
}

export function clearQueryCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
  markSignedIn(false)
}

export function persistQueryCache(client: QueryClient) {
  let timer = 0
  const save = () => {
    try {
      const state = dehydrate(client, {
        shouldDehydrateQuery: (query) => {
          if (query.state.status !== 'success') return false
          const key = query.queryKey[0]
          return key !== 'application' && key !== 'applications'
        },
      })
      const payload = JSON.stringify(state)
      if (payload.length > MAX_BYTES) return
      localStorage.setItem(CACHE_KEY, payload)
    } catch {
      /* quota / private browsing */
    }
  }
  const unsub = client.getQueryCache().subscribe(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(save, 350)
  })
  return () => {
    window.clearTimeout(timer)
    unsub()
    save()
  }
}

export function prefetchHospital(client: QueryClient) {
  void client.prefetchQuery({ queryKey: ['jobs', { limit: 20 }], queryFn: () => jobs({ limit: 20 }) })
  void client.prefetchQuery({ queryKey: ['applications', { limit: 50 }], queryFn: () => applications({ limit: 50 }) })
  void client.prefetchQuery({ queryKey: ['applications', { status: 'under_review' }], queryFn: () => applications({ status: 'under_review', limit: 1 }) })
  void client.prefetchQuery({ queryKey: ['shifts'], queryFn: () => shifts() })
  void client.prefetchQuery({ queryKey: ['contracts'], queryFn: () => contracts() })
  void client.prefetchQuery({ queryKey: ['notifications', 'badge'], queryFn: () => notifications({ limit: 1 }) })
  void client.prefetchQuery({ queryKey: ['subscription'], queryFn: subscription })
  void client.prefetchQuery({ queryKey: ['catalog'], queryFn: catalog })
}

export function prefetchRoutes() {
  const load = [
    () => import('../features/find-sos/FindSosPage'),
    () => import('../features/applications/ApplicationsPage'),
    () => import('../features/shifts/ShiftsPage'),
    () => import('../features/workers/WorkersPage'),
    () => import('../features/attendance/AttendancePage'),
    () => import('../features/staffing-requests/CreateRequestPage'),
    () => import('../features/notifications/NotificationsPage'),
    () => import('../features/hospital-profile/ProfilePage'),
    () => import('../features/subscriptions/SubscriptionPage'),
  ]
  const run = () => {
    load.forEach((item) => {
      void item()
    })
  }
  window.setTimeout(run, 400)
}
