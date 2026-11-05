import { randomUUID } from 'crypto'

export type HttpError = Error & { status?: number }

export function httpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError
  error.status = status
  return error
}

export function uid() {
  return randomUUID()
}

export function nowIso() {
  return new Date().toISOString()
}

export function ymd(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function paging(page = 1, limit = 20) {
  const safePage = Math.max(1, Math.floor(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 20))
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit }
}

export function minutesOf(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function shiftWindow(date: string, startTime: string, endTime: string) {
  const start = new Date(`${date}T${startTime}:00`)
  const end = new Date(`${date}T${endTime}:00`)
  if (end <= start) end.setDate(end.getDate() + 1)
  return { start, end }
}

export function shiftHours(startTime: string, endTime: string) {
  let diff = minutesOf(endTime) - minutesOf(startTime)
  if (diff <= 0) diff += 24 * 60
  return Math.round((diff / 60) * 100) / 100
}

export function includesLabel(list: string[], value: string) {
  const key = value.trim().toLowerCase()
  return list.some((item) => item.trim().toLowerCase() === key)
}
