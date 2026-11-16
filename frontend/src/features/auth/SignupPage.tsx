import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileUp, ShieldCheck } from 'lucide-react'
import { register } from '../../services/api'
import { compressKycFile } from '../../lib/compressImage'
import { cn, errorMessage } from '../../lib/utils'
import { KYC_FALLBACK, type KycDoc } from '../../lib/hospitalKyc'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { AuthLayout } from './BrandPanel'

const empty = {
  hospitalName: '',
  adminName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  country: 'India',
  address: '',
  socialLink: '',
}

const STEPS = ['Hospital', 'Location', 'Licences'] as const

export function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const requirements = KYC_FALLBACK
  const documents = requirements.documents
  const last = STEPS.length - 1

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const missing = useMemo(
    () => documents.filter((doc) => doc.required && !files[doc.code]).map((doc) => doc.label),
    [documents, files],
  )

  function validate(index: number) {
    if (index === 0) {
      if (form.hospitalName.trim().length < 2) return 'Hospital name is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid hospital email'
      if (form.phone.trim().length < 8) return 'Enter the hospital phone number'
    }
    if (index === 1) {
      if (form.address.trim().length < 5) return 'Address is required'
      if (form.city.trim().length < 2) return 'City is required'
      if (form.state.trim().length < 2) return 'State is required'
      if (form.country.trim().length < 2) return 'Country is required'
      if (form.adminName.trim().length < 2) return 'Administrator name is required'
    }
    if (index === 2) {
      if (missing.length) return `Upload ${missing[0]} to continue.`
      const tooBig = documents.find((doc) => {
        const file = files[doc.code]
        return file && file.size > requirements.maxFileMb * 1024 * 1024
      })
      if (tooBig) return `${tooBig.label} must be under ${requirements.maxFileMb} MB.`
    }
    return ''
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const message = validate(step)
    if (message) {
      setError(message)
      return
    }
    setError('')
    if (step < last) {
      setStep((current) => current + 1)
      return
    }
    setLoading(true)
    setProgress(0)
    setError('')
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value) body.append(key, value)
      })
      documents.forEach((doc) => {
        const file = files[doc.code]
        if (file) body.append(doc.code, file)
      })
      await register(body, setProgress)
      navigate('/login?registered=1', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout className="lg:h-screen lg:overflow-hidden" mainClassName="py-6 lg:h-full lg:min-h-0 lg:py-8">
        <div className="flex w-full max-w-[520px] flex-col">
          <div className="mb-4 lg:hidden">
            <Logo className="h-10 w-auto max-w-[200px]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Register your hospital</h1>
          <p className="mt-1 text-[13px] text-muted sm:text-sm">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}. You can sign in after we verify the hospital.
          </p>
          <ol className="mt-4 flex gap-2" aria-label="Registration steps">
            {STEPS.map((label, index) => (
              <li key={label} className="flex-1">
                <span className={cn('block h-1.5 rounded-full', index <= step ? 'bg-brand' : 'bg-line')} />
              </li>
            ))}
          </ol>

          <form onSubmit={onSubmit} className="mt-5 grid gap-4">
            {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}

            {step === 0 && (
              <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-ink">Hospital</h2>
                <Field label="Hospital name"><TextInput required value={form.hospitalName} onChange={(event) => set('hospitalName', event.target.value)} /></Field>
                <Field label="Hospital email" hint="Sign-in email. Password is sent here after approval.">
                  <TextInput type="email" required autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
                </Field>
                <Field label="Hospital phone"><TextInput required autoComplete="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+91 …" /></Field>
                <Field label="Website or social link" hint="Website, LinkedIn, or another public page. Optional.">
                  <TextInput inputMode="url" autoComplete="url" value={form.socialLink} onChange={(event) => set('socialLink', event.target.value)} placeholder="https://www.linkedin.com/company/your-hospital" />
                </Field>
              </section>
            )}

            {step === 1 && (
              <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-ink">Location and administrator</h2>
                <Field label="Address"><TextInput required autoComplete="street-address" value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="Street, area, landmark" /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City"><TextInput required autoComplete="address-level2" value={form.city} onChange={(event) => set('city', event.target.value)} /></Field>
                  <Field label="State"><TextInput required autoComplete="address-level1" value={form.state} onChange={(event) => set('state', event.target.value)} /></Field>
                </div>
                <Field label="Country"><TextInput required autoComplete="country-name" value={form.country} onChange={(event) => set('country', event.target.value)} /></Field>
                <Field label="Administrator name" hint="The person who will run this portal — not a treating doctor’s name.">
                  <TextInput required autoComplete="name" value={form.adminName} onChange={(event) => set('adminName', event.target.value)} placeholder="Full name of the hospital administrator" />
                </Field>
              </section>
            )}

            {step === 2 && (
              <section className="grid gap-2.5">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-brand" /> Licences and KYC</h2>
                  <p className="mt-0.5 text-xs text-muted">PDF, JPG, or PNG. Up to {requirements.maxFileMb} MB each.</p>
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
            )}

            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <Button type="button" variant="outline" className="h-11 flex-1" disabled={loading} onClick={() => { setError(''); setStep((current) => current - 1) }}>
                  Previous
                </Button>
              )}
              <Button type="submit" className="h-11 flex-1" disabled={loading}>
                {step < last
                  ? 'Next'
                  : loading
                    ? (progress > 0 && progress < 100 ? `Uploading ${progress}%` : 'Submitting…')
                    : 'Submit for review'}
              </Button>
            </div>
            {loading && (
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.max(progress, 8)}%` }} />
              </div>
            )}
          </form>
          <p className="mt-4 text-sm text-muted">
            Already registered? <Link to="/login" className="font-semibold text-brand-deep underline-offset-4 hover:text-brand hover:underline">Sign in</Link>
          </p>
        </div>
    </AuthLayout>
  )
}

function FileField({ doc, accept, file, onChange }: { doc: KycDoc; accept: string; file?: File; onChange: (file?: File) => void }) {
  const [busy, setBusy] = useState(false)

  async function pick(picked?: File) {
    if (!picked) {
      onChange(undefined)
      return
    }
    setBusy(true)
    try {
      onChange(await compressKycFile(picked))
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 transition-colors hover:border-brand/40" title={doc.hint}>
      <FileUp className="h-4 w-4 shrink-0 text-faint" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">
          {doc.label} {!doc.required && <span className="font-medium text-muted">(optional)</span>}
        </span>
      </span>
      <input
        type="file"
        required={doc.required && !file}
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          event.target.value = ''
          void pick(picked)
        }}
      />
      <span className="max-w-[140px] truncate rounded-lg bg-canvas px-2 py-1 text-[11px] font-semibold text-navy ring-1 ring-inset ring-line">
        {busy ? 'Optimising…' : file ? file.name : 'Choose file'}
      </span>
    </label>
  )
}
