import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../../services/api'
import { errorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { BrandPanel } from './BrandPanel'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const result = await forgotPassword(email)
      setNotice(result.message)
    } catch (err) {
      setError(errorMessage(err, 'Could not start a password reset.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="flex min-w-0 items-center justify-center bg-canvas px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 lg:hidden"><Logo className="h-11 w-auto max-w-[240px]" /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Reset password</h1>
          <p className="mt-1.5 text-[13px] text-muted sm:text-sm">Enter the hospital email. A reset link is emailed once mail hosting is connected. Until then the message waits in the admin panel.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {notice && <p role="status" className="rounded-xl border border-brand/25 bg-mint px-3.5 py-2.5 text-sm font-medium text-brand-deep">{notice}</p>}
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
            <Field label="Hospital email">
              <TextInput type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@hospital.com" />
            </Field>
            <Button type="submit" className="h-12 w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            <Link to="/login" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Back to sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="flex min-w-0 items-center justify-center bg-canvas px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 lg:hidden"><Logo className="h-11 w-auto max-w-[240px]" /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Choose a new password</h1>
          <p className="mt-1.5 text-[13px] text-muted sm:text-sm">Use at least 8 characters. This replaces the password that was emailed after approval.</p>
          {done ? (
            <p className="mt-8 rounded-xl border border-brand/25 bg-mint px-3.5 py-2.5 text-sm font-medium text-brand-deep">
              Password updated. <Link to="/login" className="underline">Sign in</Link>
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {!token && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">This reset link is missing a token.</p>}
              {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
              <Field label="New password">
                <TextInput type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Button type="submit" className="h-12 w-full" disabled={loading || !token}>{loading ? 'Saving…' : 'Update password'}</Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
