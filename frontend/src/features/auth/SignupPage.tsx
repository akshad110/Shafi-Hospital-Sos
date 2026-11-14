import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileUp, ShieldCheck } from 'lucide-react'
import { register, registerRequirements } from '../../services/api'
import { errorMessage } from '../../lib/utils'
import { KYC_FALLBACK, type KycDoc } from '../../lib/hospitalKyc'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { BrandPanel } from './BrandPanel'

const empty = {
  hospitalName: '',
  adminName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  country: 'India',
  address: '',
}

export function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const reqQuery = useQuery({ queryKey: ['register-requirements'], queryFn: registerRequirements, retry: false })
  const requirements = reqQuery.data || KYC_FALLBACK
  const documents = requirements.documents

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const missing = useMemo(
    () => documents.filter((doc) => doc.required && !files[doc.code]).map((doc) => doc.label),
    [documents, files],
  )

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (missing.length) {
      setError(`Upload ${missing[0]} to continue.`)
      return
    }
    const tooBig = documents.find((doc) => {
      const file = files[doc.code]
      return file && file.size > requirements.maxFileMb * 1024 * 1024
    })
    if (tooBig) {
      setError(`${tooBig.label} must be under ${requirements.maxFileMb} MB.`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      documents.forEach((doc) => {
        const file = files[doc.code]
        if (file) body.append(doc.code, file)
      })
      await register(body)
      navigate('/login?registered=1', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <BrandPanel />
      <main className="flex min-w-0 justify-center bg-canvas px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-[560px]">
          <div className="mb-6 lg:hidden">
            <Logo className="h-11 w-auto max-w-[240px]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Register your hospital</h1>
          <p className="mt-1.5 text-[13px] text-muted sm:text-sm">
            Submit hospital details and licences. You cannot sign in until we verify the organisation and email a password to the administrator.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-6">
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}

            <section className="grid gap-4">
              <h2 className="text-sm font-semibold text-ink">Hospital</h2>
              <Field label="Hospital name"><TextInput required value={form.hospitalName} onChange={(event) => set('hospitalName', event.target.value)} /></Field>
              <Field label="Hospital email" hint="This is the sign-in email. The password is emailed here after approval.">
                <TextInput type="email" required autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
              </Field>
              <Field label="Hospital phone"><TextInput required autoComplete="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+91 …" /></Field>
              <Field label="Address"><TextInput required autoComplete="street-address" value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="Street, area, landmark" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City"><TextInput required autoComplete="address-level2" value={form.city} onChange={(event) => set('city', event.target.value)} /></Field>
                <Field label="State"><TextInput required autoComplete="address-level1" value={form.state} onChange={(event) => set('state', event.target.value)} /></Field>
              </div>
              <Field label="Country"><TextInput required autoComplete="country-name" value={form.country} onChange={(event) => set('country', event.target.value)} /></Field>
            </section>

            <section className="grid gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Hospital administrator</h2>
                <p className="mt-0.5 text-xs text-muted">The person who will run this portal. Do not enter a treating doctor’s name unless they are also the administrator.</p>
              </div>
              <Field label="Administrator name">
                <TextInput required autoComplete="name" value={form.adminName} onChange={(event) => set('adminName', event.target.value)} placeholder="Full name of the hospital administrator" />
              </Field>
            </section>

            <section className="grid gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-brand" /> Licences and KYC</h2>
                <p className="mt-0.5 text-xs text-muted">PDF, JPG, or PNG. Up to {requirements.maxFileMb} MB each. These are stored for admin review.</p>
              </div>
              {documents.map((doc) => (
                <FileField
                  key={doc.code}
                  doc={doc}
                  accept={requirements.accept}
                  file={files[doc.code]}
                  onChange={(file) => setFiles((current) => ({ ...current, [doc.code]: file }))}
                />
              ))}
            </section>

            <Button type="submit" className="h-12 w-full" disabled={loading}>{loading ? 'Submitting application…' : 'Submit for review'}</Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            Already registered? <Link to="/login" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function FileField({ doc, accept, file, onChange }: { doc: KycDoc; accept: string; file?: File; onChange: (file?: File) => void }) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-brand/40">
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[13px] font-semibold text-ink">
            {doc.label} {!doc.required && <span className="font-medium text-muted">(optional)</span>}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">{doc.hint}</span>
        </span>
        <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
      </span>
      <input
        type="file"
        required={doc.required}
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
      <span className="mt-3 inline-flex items-center rounded-lg bg-canvas px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-inset ring-line">
        {file ? file.name : 'Choose file'}
      </span>
    </label>
  )
}
