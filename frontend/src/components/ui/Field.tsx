import { useState } from 'react'
import { CalendarDays, Clock3, Search } from 'lucide-react'
import { cn } from '../../lib/utils'

const OTHER = '__other__'

export const controlClass =
  'h-10 w-full max-w-full rounded-xl border border-line-strong bg-white pl-3 pr-3 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-faint hover:border-[#aebccc] focus:border-brand focus:ring-4 focus:ring-brand/10 sm:h-11 sm:pl-3.5 sm:pr-3.5'

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />
}

function PickerInput({
  type,
  icon: Icon,
  className,
  onClick,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof CalendarDays }) {
  return (
    <div className="picker-field">
      <input
        {...props}
        type={type}
        onClick={(event) => {
          onClick?.(event)
          try {
            event.currentTarget.showPicker()
          } catch {
            /* picker already open, or the browser has no showPicker */
          }
        }}
        className={cn(controlClass, 'cursor-pointer pr-10 sm:pr-10', className)}
      />
      <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
    </div>
  )
}

export function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <PickerInput type="date" icon={CalendarDays} {...props} />
}

export function TimeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <PickerInput type="time" icon={Clock3} {...props} />
}

export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
      <TextInput {...props} className={cn('pl-10 sm:pl-11', className)} />
    </div>
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, 'h-auto py-3 leading-6', props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, 'cursor-pointer pr-8', props.className)} />
}

export function ChoiceSelect({
  value,
  onChange,
  options,
  otherLabel = 'Other (type your own)',
  otherPlaceholder = 'Type your own',
  name,
  onBlur,
  required,
}: {
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: string[]
  otherLabel?: string
  otherPlaceholder?: string
  name?: string
  onBlur?: () => void
}) {
  const listed = options.includes(value)
  const [typing, setTyping] = useState(!listed && value !== '')
  const custom = typing || (!listed && value !== '')

  return (
    <div className="space-y-2">
      <Select
        name={name}
        onBlur={onBlur}
        value={custom ? OTHER : value}
        onChange={(event) => {
          if (event.target.value === OTHER) {
            setTyping(true)
            onChange('')
          } else {
            setTyping(false)
            onChange(event.target.value)
          }
        }}
      >
        {!custom && !listed && <option value="" disabled>Select…</option>}
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
        <option value={OTHER}>{otherLabel}</option>
      </Select>
      {custom && (
        <TextInput
          autoFocus
          required={required}
          minLength={2}
          maxLength={60}
          value={value}
          placeholder={otherPlaceholder}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="border-brand/50 bg-mint/30"
        />
      )}
    </div>
  )
}
