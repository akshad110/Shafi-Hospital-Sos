import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { register } from '../../services/api'
import { errorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { BrandPanel } from './BrandPanel'

export function SignupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ hospitalName: '', email: '', password: '', phone: '', city: '', address: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/')
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="flex items-center justify-center bg-canvas px-5 py-10">
        <div className="w-full max-w-[460px]">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">Register your hospital</h1>
          <p className="mt-1.5 text-sm text-muted">You start on a 7-day free trial. The organisation is verified by the admin desk.</p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-4">
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
            <Field label="Hospital name"><TextInput required value={form.hospitalName} onChange={(event) => set('hospitalName', event.target.value)} /></Field>
            <Field label="Work email"><TextInput type="email" required autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><TextInput required autoComplete="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
              <Field label="City"><TextInput required value={form.city} onChange={(event) => set('city', event.target.value)} /></Field>
            </div>
            <Field label="Address"><TextInput required value={form.address} onChange={(event) => set('address', event.target.value)} /></Field>
            <Field label="Password" hint="At least 8 characters"><TextInput type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => set('password', event.target.value)} /></Field>
            <Button type="submit" className="mt-1 h-12 w-full" disabled={loading}>{loading ? 'Creating account…' : 'Start free trial'}</Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            Already registered? <Link to="/login" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
