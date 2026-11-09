import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Mail, Phone } from 'lucide-react'
import { support } from '../../services/api'
import { errorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { ChoiceSelect, Field, TextArea, TextInput } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useCatalog } from '../../hooks/useCatalog'

export default function HelpPage() {
  const { supportTopics, faqs, supportContact: contact } = useCatalog()
  const [picked, setTopic] = useState<string | null>(null)
  const topic = picked ?? supportTopics[0] ?? ''
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const ticket = useMutation({
    mutationFn: () => support(`${topic}: ${subject}`, message),
    onSuccess: () => {
      setSubject('')
      setMessage('')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Help" title="Need a hand?" description="Send a message. We reply by email." />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="divide-y divide-line">
            <Contact icon={Mail} label="Email" value={contact.email || '—'} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <Contact icon={Phone} label="Phone" value={contact.phone || '—'} href={contact.phone ? `tel:${contact.phone.replace(/\s/g, '')}` : undefined} />
            <Contact icon={Clock3} label="Desk hours" value={contact.hours || '—'} />
          </Card>
          <Card>
            <CardHeader title="Common questions" />
            <div className="divide-y divide-line">
              {faqs.map((item) => (
                <details key={item.q} className="group px-4 py-3 md:px-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink transition-colors hover:text-brand-deep">
                    <span className="flex items-center justify-between gap-3">{item.q}<span className="text-faint transition-transform group-open:rotate-45">+</span></span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Send a message" description="We usually reply within two working hours." />
          {ticket.isSuccess ? (
            <div className="p-6 text-center md:p-8">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h3 className="mt-3 text-[17px] font-semibold text-ink">Message sent</h3>
              <p className="mt-1 text-sm text-muted">The desk will reply by email.</p>
              <Button variant="outline" className="mt-5" onClick={() => ticket.reset()}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); ticket.mutate() }}>
              <div className="grid gap-4 p-5 md:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Topic"><ChoiceSelect required value={topic} onChange={setTopic} options={supportTopics} otherLabel="Other topic" otherPlaceholder="What is it about?" /></Field>
                  <Field label="Subject"><TextInput required minLength={3} value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
                </div>
                <Field label="Message" hint="Include request or shift details if relevant"><TextArea required minLength={10} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
                {ticket.isError && <p className="text-sm font-medium text-danger">{errorMessage(ticket.error)}</p>}
              </div>
              <div className="flex justify-end border-t border-line bg-canvas/60 px-5 py-4 md:px-6">
                <Button type="submit" disabled={ticket.isPending}>{ticket.isPending ? 'Sending…' : 'Send message'}</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

function Contact({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-navy ring-1 ring-inset ring-line"><Icon className="h-4 w-4" /></span>
      <span>
        <span className="block text-xs text-muted">{label}</span>
        <span className="block text-sm font-semibold text-ink">{value}</span>
      </span>
    </>
  )
  return href ? (
    <a href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas md:px-5">{inner}</a>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3.5 md:px-5">{inner}</div>
  )
}
