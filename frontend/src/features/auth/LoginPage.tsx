import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '../../services/api'
import { errorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { BrandPanel } from './BrandPanel'

const DEMO = import.meta.env.DEV
const DEMO_EMAIL = 'admin@cityhospital.com'
const DEMO_PASSWORD = 'Hospital@123'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(DEMO ? DEMO_EMAIL : '')
  const [password, setPassword] = useState(DEMO ? DEMO_PASSWORD : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/')
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="flex min-w-0 items-center justify-center bg-canvas px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-bold text-white">S</span>
            <span className="text-sm font-semibold text-ink">Shafi SOS · Hospital Portal</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Welcome back</h1>
          <p className="mt-1.5 text-[13px] text-muted sm:text-sm">Sign in to request staff, mark attendance, and pay.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
            <Field label="Hospital email">
              <TextInput type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@hospital.com" />
            </Field>
            <Field label="Password">
              <TextInput type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Button type="submit" className="h-12 w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>

          {DEMO && (
            <div className="mt-6 rounded-xl border border-line bg-white px-4 py-3 text-xs leading-5 text-muted">
              <span className="font-semibold text-ink">Local demo account</span> · {DEMO_EMAIL} · {DEMO_PASSWORD}
            </div>
          )}
          <p className="mt-6 text-sm text-muted">
            New hospital? <Link to="/signup" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Register your organisation</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
