import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, ShieldCheck } from 'lucide-react'
import {
  adminApproveHospital,
  adminDownloadDocument,
  adminHospital,
  adminHospitals,
  adminRejectHospital,
  adminSendHospitalMail,
  readAdminKey,
  writeAdminKey,
  type AdminDocument,
} from '../../services/api/admin'
import { errorMessage, placeLabel } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, TextArea, TextInput } from '../../components/ui/Field'
import { Logo } from '../../components/ui/Logo'
import { Modal } from '../../components/ui/Modal'

const STATUSES = ['pending', 'approved', 'rejected'] as const
type Status = (typeof STATUSES)[number]

export default function HospitalReviewPage() {
  const [key, setKey] = useState(readAdminKey() || (import.meta.env.DEV ? 'dev-admin-key' : ''))
  const [authed, setAuthed] = useState(Boolean(readAdminKey()))
  const [status, setStatus] = useState<Status>('pending')
  const [picked, setPicked] = useState<string | null>(null)
  const [gateError, setGateError] = useState('')

  async function unlock(event: React.FormEvent) {
    event.preventDefault()
    setGateError('')
    try {
      await adminHospitals(key.trim(), 'pending')
      writeAdminKey(key.trim())
      setAuthed(true)
    } catch (err) {
      setGateError(errorMessage(err, 'Admin key is incorrect'))
    }
  }

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <form onSubmit={unlock} className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm">
          <Logo className="h-10 w-auto max-w-[200px]" />
          <h1 className="mt-5 text-xl font-semibold text-ink">Hospital review</h1>
          <p className="mt-1.5 text-sm text-muted">Enter the admin API key to review registrations. The same key is sent as <code className="text-xs">X-Admin-Key</code>.</p>
          {gateError && <p className="mt-4 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{gateError}</p>}
          <div className="mt-4">
            <Field label="Admin key"><TextInput type="password" required value={key} onChange={(event) => setKey(event.target.value)} /></Field>
          </div>
          <Button type="submit" className="mt-5 w-full">Open review</Button>
        </form>
      </div>
    )
  }

  return (
    <AdminDesk
      apiKey={readAdminKey()}
      status={status}
      onStatus={setStatus}
      picked={picked}
      onPick={setPicked}
      onLock={() => { writeAdminKey(); setAuthed(false) }}
    />
  )
}

function AdminDesk({ apiKey, status, onStatus, picked, onPick, onLock }: {
  apiKey: string
  status: Status
  onStatus: (status: Status) => void
  picked: string | null
  onPick: (id: string | null) => void
  onLock: () => void
}) {
  const list = useQuery({
    queryKey: ['admin-hospitals', status],
    queryFn: () => adminHospitals(apiKey, status),
  })

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo mark className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold text-ink">Hospital review</p>
              <p className="text-xs text-muted">Approve accounts, email passwords, or reject with a reason.</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLock}>Lock</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStatus(item)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${status === item ? 'bg-brand text-white' : 'bg-white text-muted ring-1 ring-inset ring-line hover:text-ink'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {list.isError && <p className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{errorMessage(list.error)}</p>}
        {list.data && list.data.items.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">No {status} hospitals.</Card>
        )}
        <ul className="grid gap-3">
          {(list.data?.items || []).map((hospital) => (
            <li key={hospital.id}>
              <button type="button" onClick={() => onPick(hospital.id)} className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{hospital.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{hospital.email} · {hospital.phone}</p>
                    <p className="mt-1 text-xs text-muted">{placeLabel(hospital)} · {hospital.documentCount || 0} documents</p>
                  </div>
                  <Badge status={hospital.verificationStatus === 'approved' ? 'approved' : hospital.verificationStatus === 'rejected' ? 'rejected' : 'pending_review'}>
                    {hospital.verificationStatus}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </main>

      {picked && <ReviewModal apiKey={apiKey} id={picked} onClose={() => onPick(null)} />}
    </div>
  )
}

function ReviewModal({ apiKey, id, onClose }: { apiKey: string; id: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [flash, setFlash] = useState('')
  const detail = useQuery({ queryKey: ['admin-hospital', id], queryFn: () => adminHospital(apiKey, id) })
  const hospital = detail.data?.hospital
  const documents = detail.data?.documents || []
  const letters = detail.data?.letters || []

  const approve = useMutation({
    mutationFn: () => adminApproveHospital(apiKey, id),
    onSuccess: async (result) => {
      setFlash(`Access allowed. Password email is ready for ${result.hospital.email}. Press Send when you want it delivered. Until email hosting is connected, the password stays in that message: ${result.temporaryPassword}`)
      await queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-hospital', id] })
    },
  })

  const reject = useMutation({
    mutationFn: () => adminRejectHospital(apiKey, id, reason),
    onSuccess: async () => {
      setFlash('Rejected. The explanation is ready — press Send to deliver it. Until email hosting is connected, it stays on this screen.')
      await queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-hospital', id] })
    },
  })

  const send = useMutation({
    mutationFn: (mailId: string) => adminSendHospitalMail(apiKey, id, mailId),
    onSuccess: async (result) => {
      setFlash(result.status === 'sent' ? 'Email sent.' : result.detail)
      await queryClient.invalidateQueries({ queryKey: ['admin-hospital', id] })
    },
  })

  const pending = hospital?.verificationStatus === 'pending' || hospital?.verificationStatus === 'rejected'
  const error = errorMessage(approve.error || reject.error || send.error, '')

  return (
    <Modal open title={hospital?.name || 'Hospital'} description={hospital?.email} onClose={onClose}>
      {detail.isLoading && <p className="text-sm text-muted">Loading…</p>}
      {hospital && (
        <div className="space-y-4">
          {flash && <p className="rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm font-medium text-[#05603a]">{flash}</p>}
          {error && <p className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-[#b42323]">{error}</p>}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Fact label="Administrator" value={hospital.representative || '—'} />
            <Fact label="Phone" value={hospital.phone || '—'} />
            <Fact label="Address" value={[hospital.address, placeLabel(hospital)].filter(Boolean).join(' · ') || '—'} />
            <Fact label="Submitted" value={hospital.submittedAt ? new Date(hospital.submittedAt).toLocaleString() : '—'} />
          </dl>
          {hospital.rejectionReason && <p className="text-sm text-danger">{hospital.rejectionReason}</p>}

          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-brand" /> Documents</p>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} apiKey={apiKey} hospitalId={id} doc={doc} />
              ))}
            </ul>
          </div>

          {letters.length > 0 && (
            <div className="space-y-2">
              {letters.map((letter) => (
                <div key={letter.id} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{letter.subject}</p>
                  <p className="text-xs text-muted">{letter.status}{letter.detail ? ` · ${letter.detail}` : ''}</p>
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-xs text-ink">{letter.text}</pre>
                  {(letter.status === 'ready' || letter.status === 'failed') && (
                    <Button className="mt-2" disabled={send.isPending} onClick={() => send.mutate(letter.id)}>
                      {send.isPending ? 'Sending…' : 'Send email'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {pending && hospital.verificationStatus !== 'approved' && (
            <div className="space-y-3 border-t border-line pt-4">
              <Field label="Rejection reason">
                <TextArea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell the hospital what to fix…" />
              </Field>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="danger" disabled={reject.isPending || reason.trim().length < 8} onClick={() => reject.mutate()}>
                  {reject.isPending ? 'Rejecting…' : 'Reject'}
                </Button>
                <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                  {approve.isPending ? 'Allowing…' : 'Allow access'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function DocumentRow({ apiKey, hospitalId, doc }: { apiKey: string; hospitalId: string; doc: AdminDocument }) {
  const [busy, setBusy] = useState(false)
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
      <span>
        <span className="block font-medium text-ink">{doc.label}</span>
        <span className="text-xs text-muted">{doc.fileName} · {Math.max(1, Math.round(doc.size / 1024))} KB</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await adminDownloadDocument(apiKey, hospitalId, doc.id, doc.fileName)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Download className="h-4 w-4" /> Download
      </Button>
    </li>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}
