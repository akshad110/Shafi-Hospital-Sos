import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { session } from '../services/api'
import { markSignedIn, readAccessToken, wasSignedIn, writeAccessToken } from '../services/api/client'
import { clearQueryCache, prefetchHospital, prefetchRoutes } from './cache'
import { isConnectionError } from '../lib/utils'
import { Logo } from '../components/ui/Logo'
import { RealtimeProvider } from './realtime'
import type { Hospital, SessionUser } from '../types/domain'

interface SessionValue {
  user: SessionUser
  hospital: Hospital
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('Session missing')
  return value
}

export function SessionGate({ children, login }: { children: React.ReactNode; login: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [, setAuthTick] = useState(0)
  const signedIn = Boolean(readAccessToken() || wasSignedIn())
  const me = useQuery({
    queryKey: ['session'],
    queryFn: session,
    retry: (count, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) return false
      return count < 5
    },
    retryDelay: (count) => Math.min(10_000, 1500 * 2 ** count),
    staleTime: 5 * 60_000,
    enabled: signedIn,
  })

  useEffect(() => {
    if (!me.data) return
    markSignedIn(true)
    prefetchHospital(queryClient)
    prefetchRoutes()
  }, [me.data, queryClient])

  useEffect(() => {
    if (!signedIn || me.data || !me.isError) return
    const timer = window.setInterval(() => {
      void me.refetch()
    }, 8_000)
    return () => window.clearInterval(timer)
  }, [signedIn, me.data, me.isError, me.refetch])

  const unauthorized = me.isError && axios.isAxiosError(me.error) && me.error.response?.status === 401

  function openLogin() {
    writeAccessToken()
    markSignedIn(false)
    clearQueryCache()
    queryClient.removeQueries({ queryKey: ['session'] })
    setAuthTick((tick) => tick + 1)
  }

  if (!signedIn || unauthorized) return login

  if (!me.data && (me.isLoading || me.isFetching || me.isPending || (me.isError && isConnectionError(me.error)))) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Logo mark className="h-12 w-12" />
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-mint border-t-brand" />
          <p className="text-sm font-semibold text-ink">Opening the hospital portal…</p>
          <p className="text-sm text-muted">The server may be waking up. This can take about a minute.</p>
          {me.isError && (
            <button type="button" onClick={openLogin} className="mt-2 text-sm font-semibold text-brand-deep underline-offset-4 hover:underline">
              Sign in again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (me.isError && !unauthorized && !me.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">The portal is taking longer than usual</h1>
          <p className="mt-2 text-sm text-muted">We will keep trying. You can also sign in again.</p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => me.refetch()} className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep">Try again</button>
            <button type="button" onClick={openLogin} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-white">Sign in again</button>
          </div>
        </div>
      </div>
    )
  }

  if (!me.data) return login

  return (
    <SessionContext.Provider value={me.data}>
      <RealtimeProvider key={me.data.user.id}>{children}</RealtimeProvider>
    </SessionContext.Provider>
  )
}
