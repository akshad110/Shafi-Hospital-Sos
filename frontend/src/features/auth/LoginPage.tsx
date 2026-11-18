import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login, session } from '../../services/api'
import { errorCode, errorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { AuthLayout } from './BrandPanel'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const registered = params.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(registered
    ? 'Application received. You cannot sign in until we verify the hospital. A password will be emailed to the administrator after approval.'
    : '')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      try {
        const data = await session()
        queryClient.setQueryData(['session'], data)
      } catch {
        await queryClient.resetQueries({ queryKey: ['session'] })
      }
      navigate('/', { replace: true })
    } catch (err) {
      const code = errorCode(err)
      if (code === 'hospital_pending') {
        setNotice(errorMessage(err))
        setError('')
      } else {
        setError(errorMessage(err, 'Could not sign in. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
        <div className="w-full max-w-[420px]">
          <div className="mb-6 lg:hidden">
            <Logo className="h-11 w-auto max-w-[240px]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Welcome back</h1>
          <p className="mt-1.5 text-[13px] text-muted sm:text-sm">Sign in after your hospital is verified. New hospitals receive a password by email.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {notice && <p role="status" className="rounded-xl border border-brand/25 bg-mint px-3.5 py-2.5 text-sm font-medium text-brand-deep">{notice}</p>}
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
            <Field label="Hospital email">
              <TextInput type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@hospital.com" />
            </Field>
            <Field label="Password">
              <TextInput type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <p className="text-right text-sm">
              <Link to="/forgot-password" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Forgot password?</Link>
            </p>
            <Button type="submit" className="h-12 w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>

          <p className="mt-6 text-sm text-muted">
            New hospital? <Link to="/signup" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Register your organisation</Link>
          </p>
        </div>
    </AuthLayout>
  )
}
