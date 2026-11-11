import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCircle2, Plus, X } from 'lucide-react'
import { MAX_DESC_WORDS, MIN_DESC_WORDS, requestSchema, steps, wordCount, type RequestValues } from '../../schemas/request'
import { createJob } from '../../services/api'
import { defaultCuts } from '../../lib/payRules'
import { cn, errorMessage, money } from '../../lib/utils'
import { useRoleOptions } from '../../hooks/useCatalog'
import { useSession } from '../../app/session'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ChoiceSelect, DateInput, Field, Select, TextArea, TextInput, TimeInput } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'

export default function CreateRequestPage() {
  const { hospital } = useSession()
  const roles = useRoleOptions(hospital)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<'draft' | 'approved' | null>(null)
  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      department: hospital.departments[0] || '',
      role: 'Registered Nurse',
      shiftType: 'day',
      paymentUnit: 'daily',
      lateAllowed: true,
      lateDeduction: 0,
      halfDayAllowed: true,
      halfDayPay: 0,
      absentAllowed: true,
      workersNeeded: 1,
      location: hospital.address,
      certifications: '',
      requiredDocuments: [],
      notes: '',
    },
  })
  const errors = form.formState.errors

  const save = useMutation({
    mutationFn: (status: 'draft' | 'approved') => createJob(toPayload(form.getValues(), status)),
    onSuccess: async (job) => {
      setDone(job.status === 'draft' ? 'draft' : 'approved')
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['jobs'] }), queryClient.invalidateQueries({ queryKey: ['session'] })])
    },
  })

  async function next() {
    const fields = steps[step].fields
    if (fields.length && !(await form.trigger(fields))) return
    setStep((value) => Math.min(steps.length - 1, value + 1))
  }

  async function saveDraft() {
    if (await form.trigger()) save.mutate('draft')
    else setStep(steps.findIndex((item) => item.fields.some((field) => field in form.formState.errors)))
  }

  const values = form.watch()
  const descWords = wordCount(values.description || '')
  const shift = hoursEachDay(values.startTime, values.endTime)

  if (done) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center md:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-6 w-6" /></span>
        <h1 className="mt-4 text-xl font-semibold text-ink">{done === 'draft' ? 'Draft saved' : 'Request sent'}</h1>
        <p className="mt-2 text-sm text-muted">
          {done === 'draft' ? 'Open it from Requests when you are ready to send it.' : 'Workers can see it now. You review who applies from Applications.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => { form.reset(); setStep(0); setDone(null); save.reset() }}>Ask for someone else</Button>
          <Button onClick={() => navigate('/find')}>Go to requests</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="New request" title="Ask for staff" description="Fill this in. Workers see it as soon as you send it." />

      <div>
        <ol className="grid grid-cols-3 gap-1 sm:gap-2">
          {steps.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => setStep(index)}
                className="group w-full text-left disabled:cursor-default"
              >
                <span className={cn('block h-1.5 rounded-full transition-colors', index < step ? 'bg-brand' : index === step ? 'bg-navy' : 'bg-line')} />
                <span className={cn('mt-2 hidden items-center gap-1.5 text-xs font-semibold sm:flex', index === step ? 'text-ink' : index < step ? 'text-brand-deep group-hover:text-brand' : 'text-faint')}>
                  {index < step ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}.</span>}
                  <span className="truncate">{item.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] font-semibold text-ink sm:hidden">Step {step + 1} of {steps.length} · {steps[step].title}</p>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(() => save.mutate('approved'))}>
          <div className="p-4 md:p-6">
            <h2 className="text-[17px] font-semibold text-ink">{['Staff requirement', 'Shift schedule', 'Daily pay and attendance'][step]}</h2>
            <div className="mt-5">
              {step === 0 && (
                <div className="grid gap-4">
                  <Field label="Title" error={errors.title?.message}><TextInput placeholder="e.g. ICU nurse for tonight" {...form.register('title')} /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Department" error={errors.department?.message}>
                      <Controller
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <ChoiceSelect name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={hospital.departments} otherLabel="Other department" otherPlaceholder="e.g. Neonatal ICU" />
                        )}
                      />
                    </Field>
                    <Field label="Role" error={errors.role?.message}>
                      <Controller
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <ChoiceSelect name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={roles} otherLabel="Other role" otherPlaceholder="e.g. Dialysis Technician" />
                        )}
                      />
                    </Field>
                  </div>
                  <Field label="How many people" error={errors.workersNeeded?.message}><TextInput type="number" min={1} {...form.register('workersNeeded')} /></Field>
                  <div>
                    <Field label="What will they do?" error={errors.description?.message}>
                      <TextArea rows={4} placeholder="Describe the ward, duties and anything they should know before they apply." {...form.register('description')} />
                    </Field>
                    <p className={cn('mt-1.5 text-xs', descWords > MAX_DESC_WORDS ? 'font-medium text-danger' : descWords > 0 && descWords < MIN_DESC_WORDS ? 'font-medium text-muted' : 'text-muted')}>
                      {descWords} / {MAX_DESC_WORDS} words
                      {descWords === 0 && ` · Write ${MIN_DESC_WORDS}–${MAX_DESC_WORDS} words`}
                      {descWords > 0 && descWords < MIN_DESC_WORDS && ` · At least ${MIN_DESC_WORDS} words needed`}
                      {descWords > MAX_DESC_WORDS && ` · Shorten this to ${MAX_DESC_WORDS} words`}
                    </p>
                  </div>
                  <RequiredDocumentsField form={form} />
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Start date" error={errors.date?.message}><DateInput min={new Date().toISOString().slice(0, 10)} {...form.register('date')} /></Field>
                    <Field label="Where" error={errors.location?.message}><TextInput {...form.register('location')} /></Field>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Hours each day</p>
                    <p className="mt-0.5 text-xs text-muted">Same start and end time every day of this request.</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field label="From" error={errors.startTime?.message}><TimeInput {...form.register('startTime')} /></Field>
                      <Field label="To" error={errors.endTime?.message}><TimeInput {...form.register('endTime')} /></Field>
                    </div>
                    {shift.hours > 0 && (
                      <p className="mt-2 text-xs text-muted">{shift.hours} hour{shift.hours === 1 ? '' : 's'} each day{shift.overnight ? ' · overnight shift' : ''}</p>
                    )}
                  </div>
                </div>
              )}
              {step === 2 && (
                <PayRulesStep form={form} values={values} errors={errors} />
              )}
            </div>
            {save.isError && <p className="mt-4 text-sm font-medium text-danger">{errorMessage(save.error)}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 md:px-6">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => (step === 0 ? navigate('/find') : setStep((value) => value - 1))}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
              <Button variant="outline" className="hidden sm:inline-flex" disabled={save.isPending} onClick={saveDraft}>Save draft</Button>
              {step < steps.length - 1 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Sending…' : 'Send request'}</Button>
              )}
            </div>
          </div>
        </form>
      </Card>
      <p className="text-center text-xs text-muted">
        Need someone today? <Link to="/find?compose=1" className={buttonClass('ghost', 'sm', 'h-auto px-1 text-sos hover:bg-transparent hover:text-[#c42a2a]')}>Need staff now</Link>
      </p>
    </div>
  )
}

function PayRulesStep({ form, values, errors }: { form: UseFormReturn<RequestValues>; values: RequestValues; errors: UseFormReturn<RequestValues>['formState']['errors'] }) {
  const present = Number(values.amount) || 0
  const latePay = Math.max(0, present - (Number(values.lateDeduction) || 0))
  const halfPay = Number(values.halfDayPay) || 0

  const amountField = form.register('amount')

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full present day (₹)" hint="Paid when they come in on time" error={errors.amount?.message}>
          <TextInput
            type="number"
            min={1}
            inputMode="numeric"
            {...amountField}
            onChange={(event) => {
              amountField.onChange(event)
              const cuts = defaultCuts(Number(event.target.value) || 0)
              form.setValue('lateDeduction', cuts.lateDeduction)
              form.setValue('halfDayPay', cuts.halfDayPay)
            }}
          />
        </Field>
        <Field label="Paid as" error={errors.paymentUnit?.message}>
          <Select {...form.register('paymentUnit')}>
            <option value="daily">Per day</option>
            <option value="shift">Per shift</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-2xl border border-line p-3 sm:p-4">
        <p className="text-sm font-semibold text-ink">What can you mark?</p>
        <p className="mt-0.5 text-xs text-muted">Present is always allowed. Tick the others if this role can use them.</p>
        <div className="mt-3 grid gap-3">
          <AllowRow
            checked={values.lateAllowed}
            onCheck={(checked) => form.setValue('lateAllowed', checked)}
            title="Late allowed"
            hint="They came, but late. Cut a little from the day pay."
          >
            {values.lateAllowed && (
              <Field label="Cut for late (₹)" hint={`Pays ${money(latePay)} that day`}>
                <TextInput type="number" min={0} inputMode="numeric" {...form.register('lateDeduction')} />
              </Field>
            )}
          </AllowRow>
          <AllowRow
            checked={values.halfDayAllowed}
            onCheck={(checked) => form.setValue('halfDayAllowed', checked)}
            title="Half day allowed"
            hint="Default is half of the present-day amount."
          >
            {values.halfDayAllowed && (
              <Field label="Pay for half day (₹)">
                <TextInput type="number" min={0} inputMode="numeric" {...form.register('halfDayPay')} />
              </Field>
            )}
          </AllowRow>
          <AllowRow
            checked={values.absentAllowed}
            onCheck={(checked) => form.setValue('absentAllowed', checked)}
            title="Absent allowed"
            hint="No money for that day."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line text-sm">
        <div className="border-b border-line bg-canvas px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Each day</div>
        <PayLine label="Present" value={present ? money(present) : '—'} />
        <PayLine label="Late" value={values.lateAllowed ? money(latePay) : 'Not allowed'} />
        <PayLine label="Half day" value={values.halfDayAllowed ? money(halfPay) : 'Not allowed'} />
        <PayLine label="Absent" value={values.absentAllowed ? money(0) : 'Not allowed'} />
        {present > 0 && (
          <div className="flex justify-between gap-3 bg-mint/40 px-3.5 py-2.5 font-semibold text-ink">
            <span>If all 7 days present</span>
            <span>{money(present * 7)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function RequiredDocumentsField({ form }: { form: UseFormReturn<RequestValues> }) {
  const [draft, setDraft] = useState('')
  const docs = form.watch('requiredDocuments') || []

  function add() {
    const name = draft.trim()
    if (name.length < 2) return
    if (docs.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return
    }
    form.setValue('requiredDocuments', [...docs, { id: crypto.randomUUID(), name }], { shouldDirty: true })
    setDraft('')
  }

  return (
    <div className="rounded-2xl border border-line p-3.5 sm:p-4">
      <p className="text-sm font-semibold text-ink">Documents to upload</p>
      <p className="mt-0.5 text-xs text-muted">Workers will see these names when they apply, and must upload an original photo or PDF of each one.</p>
      {docs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {docs.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium text-ink">{item.name}</span>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-ink"
                aria-label={`Remove ${item.name}`}
                onClick={() => form.setValue('requiredDocuments', docs.filter((entry) => entry.id !== item.id), { shouldDirty: true })}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }}
            placeholder="Add document name, e.g. BLS certificate"
            maxLength={80}
          />
        </div>
        <Button type="button" variant="outline" className="shrink-0" disabled={draft.trim().length < 2} onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  )
}

function AllowRow({ checked, onCheck, title, hint, children }: { checked: boolean; onCheck: (value: boolean) => void; title: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border px-3 py-3', checked ? 'border-brand/40 bg-mint/40' : 'border-line')}>
      <label className="flex cursor-pointer items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-xs text-muted">{hint}</span>
        </span>
        <input type="checkbox" className="mt-1 h-4 w-4 accent-brand" checked={checked} onChange={(event) => onCheck(event.target.checked)} />
      </label>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function PayLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function hoursEachDay(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return { hours: 0, overnight: false }
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  if ([startHour, startMin, endHour, endMin].some((value) => Number.isNaN(value))) return { hours: 0, overnight: false }
  let minutes = endHour * 60 + endMin - (startHour * 60 + startMin)
  const overnight = minutes <= 0
  if (overnight) minutes += 24 * 60
  return { hours: Math.round((minutes / 60) * 10) / 10, overnight }
}

function toPayload(values: RequestValues, status: 'draft' | 'approved') {
  const split = (value?: string) => (value || '').split(',').map((item) => item.trim()).filter(Boolean)
  return {
    title: values.title,
    department: values.department,
    role: values.role,
    description: values.description,
    qualifications: split(values.qualifications).length ? split(values.qualifications) : ['As required'],
    experience: values.experience || 'Flexible',
    skills: split(values.skills).length ? split(values.skills) : [values.role],
    certifications: split(values.certifications),
    requiredDocuments: (values.requiredDocuments || []).map((item) => ({
      id: item.id,
      name: item.name.trim(),
      instruction: 'Upload an original photo or PDF of this document.',
    })),
    workersNeeded: Number(values.workersNeeded),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    shiftType: Number((values.startTime || '07:00').slice(0, 2)) >= 19 || Number((values.startTime || '07:00').slice(0, 2)) < 6 ? 'night' as const : 'day' as const,
    location: values.location,
    amount: Number(values.amount),
    currency: 'INR' as const,
    paymentUnit: values.paymentUnit,
    payRules: {
      presentPay: Number(values.amount),
      lateAllowed: values.lateAllowed,
      lateDeduction: values.lateAllowed ? Number(values.lateDeduction) || 0 : 0,
      halfDayAllowed: values.halfDayAllowed,
      halfDayPay: values.halfDayAllowed ? Number(values.halfDayPay) || Math.round(Number(values.amount) / 2) : 0,
      absentAllowed: values.absentAllowed,
      absentPay: 0,
    },
    notes: values.notes || '',
    urgent: false,
    status,
  }
}
