import { client } from './client'
import type { Hospital } from '../../types/domain'

export type AdminHospital = Hospital & { documentCount?: number }

export type AdminDocument = {
  id: string
  kind: string
  label: string
  fileName: string
  contentType: string
  size: number
  uploadedAt: string
  required: boolean
}

const KEY = 'hos_admin_key'

export function readAdminKey() {
  try {
    return sessionStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function writeAdminKey(key?: string) {
  try {
    if (key) sessionStorage.setItem(KEY, key)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* private browsing */
  }
}

function headers(key: string) {
  return { 'X-Admin-Key': key }
}

export async function adminHospitals(key: string, status: 'pending' | 'approved' | 'rejected', page = 1) {
  const { data } = await client.get<{ items: AdminHospital[]; total: number; page: number; limit: number }>('/admin/hospitals', {
    params: { status, page, limit: 20 },
    headers: headers(key),
  })
  return data
}

export type AdminLetter = {
  id: string
  kind: string
  to: string
  subject: string
  text: string
  status: string
  detail: string
}

export async function adminHospital(key: string, id: string) {
  const { data } = await client.get<{ hospital: AdminHospital; documents: AdminDocument[]; letters?: AdminLetter[] }>(`/admin/hospitals/${id}`, {
    headers: headers(key),
  })
  return data
}

export async function adminDownloadDocument(key: string, hospitalId: string, docId: string, fileName: string) {
  const { data } = await client.get<Blob>(`/admin/hospitals/${hospitalId}/documents/${docId}`, {
    headers: headers(key),
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function adminApproveHospital(key: string, id: string) {
  const { data } = await client.post<{ hospital: AdminHospital; emailed: boolean; temporaryPassword?: string }>(`/admin/hospitals/${id}/approve`, {}, { headers: headers(key) })
  return data
}

export async function adminSendHospitalMail(key: string, id: string, mailId: string) {
  const { data } = await client.post<{ status: string; detail: string }>(`/admin/hospitals/${id}/mail/${mailId}/send`, {}, { headers: headers(key) })
  return data
}

export async function adminRejectHospital(key: string, id: string, reason: string) {
  const { data } = await client.post<{ hospital: AdminHospital; emailed: boolean }>(`/admin/hospitals/${id}/reject`, { reason }, { headers: headers(key) })
  return data
}
