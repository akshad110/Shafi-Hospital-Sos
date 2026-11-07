import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Bell, ChevronRight, CreditCard, LifeBuoy, LogOut, MapPin, Shield, Users, Wallet } from 'lucide-react'
import type { PrefKey } from '../../types/domain'
import { changePassword, logout, updateHospital } from '../../services/api'
import { cn, errorMessage, initials, PLAN_LABEL } from '../../lib/utils'
import { useSession } from '../../app/session'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, rowClass } from '../../components/ui/Card'
import { Field, TextInput } from '../../components/ui/Field'

const PREF_LABEL: Record<PrefKey, { title: string; body: string }> = {
  applications: { title: 'Applications', body: 'New and updated applications' },
  shifts: { title: 'Shifts & attendance', body: 'Check-ins, completions, incidents' },
  payroll: { title: 'Payroll', body: 'Contracts ending and salaries due' },
  billing: { title: 'Billing', body: 'Plan changes and invoices' },
  reviews: { title: 'Admin reviews', body: 'Approvals and rejections' },
}

export default function ProfilePage() {
  const { hospital } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: hospital.name,
    phone: hospital.phone,
    city: hospital.city,
    address: hospital.address,
    representative: hospital.representative,
    representativeRole: hospital.representativeRole,
    departments: hospital.departments.join(', '),
  })
  const [prefs, setPrefs] = useState(hospital.notifications)
  const [password, setPassword] = useState({ current: '', next: '' })
  const [saved, setSaved] = useState(false)
  const set = (key: keyof typeof form, value: string) => { setSaved(false); setForm((current) => ({ ...current, [key]: value })) }

  const save = useMutation({
    mutationFn: () => updateHospital({
      name: form.name,
      phone: form.phone,
      city: form.city,
      address: form.address,
      representative: form.representative,
      representativeRole: form.representativeRole,
      departments: form.departments.split(',').map((item) => item.trim()).filter(Boolean),
      notifications: prefs,
    }),
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const pass = useMutation({
    mutationFn: () => changePassword(password.current, password.next),
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/login'
    },
  })

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      navigate('/login')
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5 md:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-base font-semibold text-brand-deep ring-1 ring-inset ring-brand/20 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl">{initials(hospital.name)}</span>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                <span className="truncate">{hospital.name}</span>
                {hospital.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-action" aria-label="Verified" />}
              </h1>
              <p className="truncate text-xs text-muted sm:text-sm">{hospital.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge status={hospital.verified ? 'approved' : 'pending_review'}>{hospital.verified ? 'Verified organisation' : 'Verification pending'}</Badge>
            <Badge status={hospital.plan === 'trial' ? 'trial' : 'offered'}>{PLAN_LABEL[hospital.plan]}</Badge>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-line bg-canvas/60 text-sm lg:grid-cols-4">
          <Fact label="Representative" value={hospital.representative ? `${hospital.representative}${hospital.representativeRole ? ` · ${hospital.representativeRole}` : ''}` : '—'} />
          <Fact label="Phone" value={hospital.phone || '—'} />
          <Fact label="Departments" value={hospital.departments.length ? `${hospital.departments.length} listed` : '—'} />
          <Fact label="Location" value={hospital.city || '—'} />
        </dl>
        <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-sm text-muted md:px-6"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-faint" />{hospital.address}</p>
      </Card>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          <Jump to="/workers" icon={Users} title="Worker directory" body="People linked to this hospital" />
          <Jump to="/attendance" icon={Wallet} title="Attendance & payroll" body="Mark attendance and pay salaries" />
          <Jump to="/subscription" icon={CreditCard} title="Subscription & billing" body={`${PLAN_LABEL[hospital.plan]} · manage plan and invoices`} />
          <Jump to="/notifications" icon={Bell} title="Notification centre" body="Live updates on requests, shifts, payroll and billing" />
          <Jump to="/help" icon={LifeBuoy} title="Help & support" body="Talk to the Shafi operations desk" />
        </ul>
      </Card>

      <Card>
        <CardHeader title="Organisation details" description="Shown to the admin desk and on worker shift briefs." />
        <form onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 md:p-6">
            <Field label="Hospital name"><TextInput required value={form.name} onChange={(event) => set('name', event.target.value)} /></Field>
            <Field label="Phone"><TextInput required value={form.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
            <Field label="Authorised representative"><TextInput value={form.representative} onChange={(event) => set('representative', event.target.value)} /></Field>
            <Field label="Representative role"><TextInput value={form.representativeRole} onChange={(event) => set('representativeRole', event.target.value)} /></Field>
            <Field label="City"><TextInput required value={form.city} onChange={(event) => set('city', event.target.value)} /></Field>
            <Field label="Departments" hint="Separate with commas"><TextInput value={form.departments} onChange={(event) => set('departments', event.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Address"><TextInput required value={form.address} onChange={(event) => set('address', event.target.value)} /></Field></div>
          </div>

          <div id="alerts" className="scroll-mt-24 border-t border-line px-4 py-4 sm:px-5 sm:py-5 md:px-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Bell className="h-4 w-4 text-muted" /> Notification preferences</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(PREF_LABEL) as PrefKey[]).map((key) => (
                <label key={key} className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors', prefs[key] ? 'border-brand/40 bg-mint/50' : 'border-line hover:border-line-strong hover:bg-canvas')}>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{PREF_LABEL[key].title}</span>
                    <span className="block text-xs text-muted">{PREF_LABEL[key].body}</span>
                  </span>
                  <span className="relative inline-flex">
                    <input type="checkbox" className="peer sr-only" checked={prefs[key]} onChange={(event) => { setSaved(false); setPrefs({ ...prefs, [key]: event.target.checked }) }} />
                    <span className="h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className={cn('text-sm', save.isError ? 'font-medium text-danger' : 'text-muted')}>
              {save.isError ? errorMessage(save.error) : saved ? 'All changes saved.' : 'Changes apply after you save.'}
            </p>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted" /> Security</span>} description="Changing the password signs you out on every device." />
        <form onSubmit={(event) => { event.preventDefault(); pass.mutate() }}>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 md:p-6">
            <Field label="Current password"><TextInput type="password" required autoComplete="current-password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters"><TextInput type="password" required minLength={8} autoComplete="new-password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} /></Field>
          </div>
          <div className="flex flex-col gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="text-sm font-medium text-danger">{pass.isError ? errorMessage(pass.error) : ''}</p>
            <Button type="submit" variant="outline" disabled={pass.isPending}>{pass.isPending ? 'Updating…' : 'Update password'}</Button>
          </div>
        </form>
      </Card>

      <div>
        <Button variant="danger" size="sm" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          <LogOut className="h-4 w-4" /> {signOut.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-line px-3 py-2.5 odd:border-r sm:px-5 sm:py-3 lg:border-r lg:last:border-r-0 md:px-6 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-ink">{value}</dd>
    </div>
  )
}

function Jump({ to, icon: Icon, title, body }: { to: string; icon: typeof Users; title: string; body: string }) {
  return (
    <li>
      <Link to={to} className={cn('group flex items-center gap-3 px-4 py-3.5 md:px-5', rowClass)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-navy ring-1 ring-inset ring-line transition-colors group-hover:bg-mint group-hover:text-brand-deep">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink group-hover:text-brand-deep">{title}</span>
          <span className="block truncate text-xs text-muted">{body}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
      </Link>
    </li>
  )
}
