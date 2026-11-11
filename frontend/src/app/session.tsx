import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { session } from '../services/api'
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
  const me = useQuery({ queryKey: ['session'], queryFn: session, retry: false })

  if (me.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-12 w-12" />
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-mint border-t-brand" />
          <p className="text-sm font-semibold text-muted">Opening the hospital portal…</p>
        </div>
      </div>
    )
  }

  if (me.isError && !(axios.isAxiosError(me.error) && me.error.response?.status === 401)) {
    const offline = isConnectionError(me.error)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{offline ? 'We couldn’t connect' : 'Something went wrong'}</h1>
          <p className="mt-2 text-sm text-muted">
            {offline
              ? 'Please check your internet connection and try again.'
              : 'Please try again in a moment. If this keeps happening, sign in again.'}
          </p>
          <button type="button" onClick={() => me.refetch()} className="mt-5 h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep">Try again</button>
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
