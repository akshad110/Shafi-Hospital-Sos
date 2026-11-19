import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { useEffect, useState } from 'react'
import { persistQueryCache, restoreQueryCache } from './cache'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const next = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 15_000,
          gcTime: 30 * 60_000,
          retry: 1,
          refetchOnWindowFocus: 'always',
          refetchOnReconnect: true,
          placeholderData: (previous: unknown) => previous,
        },
      },
    })
    restoreQueryCache(next)
    return next
  })

  useEffect(() => persistQueryCache(client), [client])

  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  )
}
