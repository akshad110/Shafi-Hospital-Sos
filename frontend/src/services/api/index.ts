import { client, writeAccessToken } from './client'
import type { KycRequirements } from '../../lib/hospitalKyc'
import type {
  Application,
  AttendanceStatus,
  Catalog,
  ContractCard,
  ContractCounts,
  ContractDetail,
  Hospital,
  Invoice,
  Job,
  Notice,
  NoticeCategory,
  NoticeList,
  Page,
  Payout,
  PayoutMethod,
  Plan,
  PlanCode,
  SessionUser,
  Shift,
  Subscription,
  Worker,
  WorkerDetail,
  WorkerReview,
} from '../../types/domain'

export async function login(email: string, password: string) {
  const { data } = await client.post<{ user: SessionUser; accessToken?: string }>('/auth/login', { email, password })
  writeAccessToken(data.accessToken)
  return data.user
}

export async function register(body: FormData) {
  const { data } = await client.post<{ ok: boolean; status: string; message: string }>('/auth/register', body, { timeout: 120000 })
  return data
}

export async function registerRequirements() {
  const { data } = await client.get<KycRequirements>('/auth/register/requirements')
  return data
}

export async function logout() {
  try {
    await client.post('/auth/logout')
  } finally {
    writeAccessToken()
  }
}

export async function forgotPassword(email: string) {
  const { data } = await client.post<{ ok: boolean; message: string }>('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  await client.post('/auth/reset-password', { token, password })
}

export async function changePassword(current: string, next: string) {
  await client.post('/auth/password', { current, next })
}

export async function session() {
  const { data } = await client.get<{ user: SessionUser; hospital: Hospital }>('/users/me')
  return data
}

export async function updateHospital(body: Partial<Hospital>) {
  const { data } = await client.patch<{ hospital: Hospital }>('/hospitals/me', body)
  return data.hospital
}

export async function jobs(params: Record<string, string | number | boolean | undefined> = {}) {
  const { data } = await client.get<Page<Job>>('/hospital/jobs', { params })
  return data
}

export async function createJob(body: unknown) {
  const { data } = await client.post<{ job: Job }>('/jobs', body)
  return data.job
}

export async function updateJob(id: string, body: unknown) {
  const { data } = await client.patch<{ job: Job }>(`/jobs/${id}`, body)
  return data.job
}

export async function submitJob(id: string) {
  const { data } = await client.post<{ job: Job }>(`/jobs/${id}/submit`)
  return data.job
}

export async function cancelJob(id: string) {
  const { data } = await client.post<{ job: Job }>(`/jobs/${id}/cancel`)
  return data.job
}

export async function applications(params: Record<string, string | number | undefined> = {}) {
  const { data } = await client.get<Page<Application>>('/hospital/applications', { params })
  return data
}

export async function application(id: string) {
  const { data } = await client.get<{ application: Application }>(`/applications/${id}`)
  return data.application
}

export async function shortlistApplication(id: string) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/shortlist`)
  return data.application
}

export async function offerApplication(id: string) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/offer`)
  return data.application
}

export async function confirmApplication(id: string) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/confirm`)
  return data.application
}

export async function rejectApplication(id: string, body: { reason: string }) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/reject`, body)
  return data.application
}

export async function requestApplicationDocuments(id: string, body: { code: string; dueBy: string; label?: string }) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/request-documents`, body)
  return data.application
}

export async function reviewApplicationDocument(id: string, body: { label: string; status: 'verified' | 'rejected'; reasonCode?: string; reason?: string }) {
  const { data } = await client.post<{ application: Application }>(`/applications/${id}/documents/review`, body)
  return data.application
}

export async function shifts(params: Record<string, string | undefined> = {}) {
  const { data } = await client.get<{ items: Shift[] }>('/hospital/shifts', { params })
  return data.items
}

export async function addShiftNote(id: string, message: string) {
  const { data } = await client.post<{ shift: Shift }>(`/hospital/shifts/${id}/notes`, { message })
  return data.shift
}

export async function workers(q?: string) {
  const { data } = await client.get<{ items: Worker[] }>('/hospital/workers', { params: { q } })
  return data.items
}

export async function worker(id: string) {
  const { data } = await client.get<{ worker: WorkerDetail }>(`/hospital/workers/${id}`)
  return data.worker
}

export async function reviewWorker(id: string, body: { rating: number; comment: string; contractId?: string }) {
  const { data } = await client.post<{
    review: WorkerReview
    ratingAverage: number
    ratingCount: number
    reviews: WorkerReview[]
  }>(`/hospital/workers/${id}/reviews`, body)
  return data
}

export async function subscription() {
  const { data } = await client.get<{
    subscription: Subscription | null
    plans: Plan[]
    trial: { days: number; locations: number; activeRequests: number }
    usage: { activeRequests: number; locations: number }
  }>('/hospital/subscription')
  return data
}

export async function changePlan(plan: PlanCode) {
  const { data } = await client.post<{ subscription: Subscription }>('/subscriptions/change', { plan })
  return data.subscription
}

export async function billing() {
  const { data } = await client.get<{ invoices: Invoice[] }>('/hospital/billing')
  return data.invoices
}

export async function notifications(params: { status?: 'unread' | 'read'; category?: NoticeCategory; limit?: number } = {}) {
  const { data } = await client.get<NoticeList>('/notifications', { params })
  return data
}

export async function setNoticeRead(id: string, read: boolean) {
  const { data } = await client.patch<{ notification: Notice }>(`/notifications/${id}`, { read })
  return data.notification
}

export async function markAllRead(category?: NoticeCategory) {
  await client.post('/notifications/read-all', category ? { category } : {})
}

export async function deleteNotice(id: string) {
  await client.delete(`/notifications/${id}`)
}

export async function clearReadNotices() {
  await client.delete('/notifications', { params: { scope: 'read' } })
}

export async function catalog() {
  const { data } = await client.get<{ catalog: Catalog }>('/catalog')
  return data.catalog
}

export async function contracts(params: { status?: string; workerId?: string } = {}) {
  const { data } = await client.get<{ items: ContractCard[]; counts: ContractCounts }>('/hospital/contracts', { params })
  return data
}

export async function contract(id: string) {
  const { data } = await client.get<{ contract: ContractDetail }>(`/hospital/contracts/${id}`)
  return data.contract
}

export async function markAttendance(shiftId: string, body: { status: AttendanceStatus; checkIn?: string; checkOut?: string; note?: string }) {
  const { data } = await client.patch<{ shift: Shift }>(`/hospital/shifts/${shiftId}/attendance`, body)
  return data.shift
}

export async function markRemaining(contractId: string, status: Exclude<AttendanceStatus, 'pending'>) {
  const { data } = await client.post<{ result: { updated: number } }>(`/hospital/contracts/${contractId}/attendance`, { status })
  return data.result
}

export async function paySalary(contractId: string, body: { method: PayoutMethod; reference?: string; adjustment?: number; note?: string }) {
  const { data } = await client.post<{ payout: Payout }>(`/hospital/contracts/${contractId}/pay`, body)
  return data.payout
}

export async function payouts() {
  const { data } = await client.get<{ items: Payout[] }>('/hospital/payouts')
  return data.items
}

export async function support(subject: string, message: string) {
  const { data } = await client.post('/support', { subject, message })
  return data
}
