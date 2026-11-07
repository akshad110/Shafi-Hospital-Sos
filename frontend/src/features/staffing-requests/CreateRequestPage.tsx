import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react'
import { requestSchema, steps, type RequestValues } from '../../schemas/request'
import { createJob } from '../../services/api'
import { cn, errorMessage, money, unitLabel } from '../../lib/utils'
import { useRoleOptions } from '../../hooks/useCatalog'
import { useSession } from '../../app/session'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ChoiceSelect, Field, Select, TextArea, TextInput } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'

export default function CreateRequestPage() {
  const { hospital } = useSession()
  const roles = useRoleOptions(hospital)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<'draft' | 'pending_review' | null>(null)
  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      department: hospital.departments[0] || '',
      role: 'Registered Nurse',
      shiftType: 'day',
      paymentUnit: 'shift',
      workersNeeded: 1,
      location: hospital.address,
      certifications: '',
      notes: '',
    },
  })
  const errors = form.formState.errors

  const save = useMutation({
    mutationFn: (status: 'draft' | 'pending_review') => createJob(toPayload(form.getValues(), status)),
    onSuccess: async (job) => {
      setDone(job.status === 'draft' ? 'draft' : 'pending_review')
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

  if (done) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center md:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-6 w-6" /></span>
        <h1 className="mt-4 text-xl font-semibold text-ink">{done === 'draft' ? 'Draft saved' : 'Sent for admin review'}</h1>
        <p className="mt-2 text-sm text-muted">
          {done === 'draft' ? 'The draft is only visible to your team. Submit it from SOS Requests when ready.' : 'It goes live for workers only after the admin desk approves it.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => { form.reset(); setStep(0); setDone(null); save.reset() }}>Create another</Button>
          <Button onClick={() => navigate('/find')}>Go to SOS Requests</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Staffing request" title="Create a request" description="Five short steps. Nothing is published until admin review approves it." />

      <div>
        <ol className="grid grid-cols-5 gap-1 sm:gap-2">
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
        <form onSubmit={form.handleSubmit(() => save.mutate('pending_review'))}>
          <div className="p-4 md:p-6">
            <h2 className="text-[17px] font-semibold text-ink">{['Basic information', 'Requirements', 'Shift information', 'Compensation', 'Review and submit'][step]}</h2>
            <div className="mt-5">
              {step === 0 && (
                <div className="grid gap-4">
                  <Field label="Job title" error={errors.title?.message}><TextInput placeholder="e.g. ICU Registered Nurse" {...form.register('title')} /></Field>
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
                    <Field label="Healthcare role" error={errors.role?.message}>
                      <Controller
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <ChoiceSelect name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={roles} otherLabel="Other role" otherPlaceholder="e.g. Dialysis Technician" />
                        )}
                      />
                    </Field>
                  </div>
                  <Field label="Job description" error={errors.description?.message}><TextArea rows={4} placeholder="What the shift covers and what the worker should expect" {...form.register('description')} /></Field>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Qualifications" hint="Separate with commas" error={errors.qualifications?.message}><TextInput placeholder="B.Sc Nursing, GNM" {...form.register('qualifications')} /></Field></div>
                  <Field label="Experience" error={errors.experience?.message}><TextInput placeholder="e.g. 2+ years" {...form.register('experience')} /></Field>
                  <Field label="Workers needed" error={errors.workersNeeded?.message}><TextInput type="number" min={1} {...form.register('workersNeeded')} /></Field>
                  <div className="sm:col-span-2"><Field label="Required skills" hint="Separate with commas" error={errors.skills?.message}><TextInput placeholder="Ventilator care, Triage" {...form.register('skills')} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Certifications" hint="Optional"><TextInput placeholder="ACLS, BLS" {...form.register('certifications')} /></Field></div>
                </div>
              )}
              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date" error={errors.date?.message}><TextInput type="date" min={new Date().toISOString().slice(0, 10)} {...form.register('date')} /></Field>
                  <Field label="Shift type" error={errors.shiftType?.message}>
                    <Select {...form.register('shiftType')}><option value="day">Day</option><option value="night">Night</option><option value="rotating">Rotating</option></Select>
                  </Field>
                  <Field label="Start time" error={errors.startTime?.message}><TextInput type="time" {...form.register('startTime')} /></Field>
                  <Field label="End time" error={errors.endTime?.message}><TextInput type="time" {...form.register('endTime')} /></Field>
                  <div className="sm:col-span-2"><Field label="Reporting location" error={errors.location?.message}><TextInput {...form.register('location')} /></Field></div>
                </div>
              )}
              {step === 3 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount (₹)" error={errors.amount?.message}><TextInput type="number" min={1} {...form.register('amount')} /></Field>
                  <Field label="Paid" error={errors.paymentUnit?.message}>
                    <Select {...form.register('paymentUnit')}><option value="hourly">Per hour</option><option value="shift">Per shift</option><option value="daily">Per day</option></Select>
                  </Field>
                  <div className="sm:col-span-2"><Field label="Additional compensation details" hint="Optional — night differential, meals, travel"><TextArea rows={3} {...form.register('notes')} /></Field></div>
                </div>
              )}
              {step === 4 && (
                <dl className="divide-y divide-line rounded-xl border border-line text-sm">
                  <Review label="Role" value={`${values.title || '—'} · ${values.role}`} onEdit={() => setStep(0)} />
                  <Review label="Department" value={values.department} onEdit={() => setStep(0)} />
                  <Review label="Requirements" value={`${values.workersNeeded || '—'} workers · ${values.experience || '—'} · ${values.skills || '—'}`} onEdit={() => setStep(1)} />
                  <Review label="Shift" value={`${values.date || '—'} · ${values.startTime || ''}–${values.endTime || ''} · ${values.shiftType}`} onEdit={() => setStep(2)} />
                  <Review label="Location" value={values.location} onEdit={() => setStep(2)} />
                  <Review label="Pay" value={values.amount ? `${money(Number(values.amount))}${unitLabel(values.paymentUnit)}` : '—'} onEdit={() => setStep(3)} />
                </dl>
              )}
            </div>
            {save.isError && <p className="mt-4 text-sm font-medium text-danger">{errorMessage(save.error)}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 md:px-6">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => (step === 0 ? navigate('/find') : setStep((value) => value - 1))}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
              <Button variant="outline" disabled={save.isPending} onClick={saveDraft}>Save draft</Button>
              {step < steps.length - 1 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Submitting…' : 'Submit for review'}</Button>
              )}
            </div>
          </div>
        </form>
      </Card>
      <p className="text-center text-xs text-muted">
        Need cover in the next few hours? <Link to="/find?compose=1" className={buttonClass('ghost', 'sm', 'h-auto px-1 text-sos hover:bg-transparent hover:text-[#c42a2a]')}>Use Quick SOS</Link>
      </p>
    </div>
  )
}

function Review({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-4 px-3.5 py-3">
      <dt className="w-28 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink">{value}</dd>
      <button type="button" onClick={onEdit} className="shrink-0 text-xs font-semibold text-action hover:text-navy">Edit</button>
    </div>
  )
}

function toPayload(values: RequestValues, status: 'draft' | 'pending_review') {
  const split = (value?: string) => (value || '').split(',').map((item) => item.trim()).filter(Boolean)
  return {
    title: values.title,
    department: values.department,
    role: values.role,
    description: values.description,
    qualifications: split(values.qualifications),
    experience: values.experience,
    skills: split(values.skills),
    certifications: split(values.certifications),
    workersNeeded: Number(values.workersNeeded),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    shiftType: values.shiftType,
    location: values.location,
    amount: Number(values.amount),
    currency: 'INR' as const,
    paymentUnit: values.paymentUnit,
    notes: values.notes || '',
    urgent: false,
    status,
  }
}
