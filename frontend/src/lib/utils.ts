import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import axios from 'axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isConnectionError(error: unknown) {
  if (!axios.isAxiosError(error)) return false
  return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED'
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const fromServer = (error.response?.data as { message?: string } | undefined)?.message
    if (fromServer) return fromServer
    if (isConnectionError(error)) return 'We couldn’t connect. Please try again.'
  }
  return fallback
}

export function greeting(name: string) {
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${hello}, ${name}`
}

export function money(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function placeLabel(place: { city?: string; state?: string; country?: string }) {
  return [place.city, place.state, place.country].map((part) => part?.trim()).filter(Boolean).join(', ')
}

export function sosPlaces(hospital: { address?: string; city?: string; state?: string; country?: string; locations?: string[] }) {
  const seen = new Set<string>()
  const places: string[] = []
  for (const value of [...(hospital.locations || []), hospital.address, placeLabel(hospital)]) {
    const label = value?.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    places.push(label)
  }
  return places
}

export function unitLabel(unit: string) {
  if (unit === 'hourly') return '/hr'
  if (unit === 'daily') return '/day'
  return '/shift'
}

function parseDate(value?: string | null) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions, fallback = '—') {
  const date = parseDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

export function when(value?: string | null) {
  return formatDate(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function dateOnly(value?: string | null) {
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dateShort(value?: string | null) {
  return formatDate(value, { day: 'numeric', month: 'short' })
}

export function today(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function daysLeft(value?: string | null) {
  const date = parseDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

export const PLAN_LABEL: Record<string, string> = {
  trial: 'Free trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export function dayLabel(value?: string | null) {
  return formatDate(value, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function startsIn(date: string, time: string) {
  const target = parseDate(`${date}T${time}:00`) || parseDate(date)
  if (!target) return ''
  const diff = target.getTime() - Date.now()
  if (diff < 0) return 'Started'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `Starts in ${mins}m`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `Starts in ${hours}h ${rem}m` : `Starts in ${hours}h`
}

export function initials(name?: string | null) {
  return (name || '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function contractBadge(item: { canPay: boolean; status: string }) {
  return item.canPay ? 'ready' : item.status
}

export const PAYOUT_LABEL: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  cash: 'Cash',
  cheque: 'Cheque',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Waiting',
  approved: 'Open',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  filled: 'Filled',
  under_review: 'To review',
  needs_update: 'Needs update',
  shortlisted: 'Shortlisted',
  offered: 'Selected',
  confirmed: 'Confirmed',
  upcoming: 'Coming',
  active: 'Now',
  completed: 'Done',
  pending: 'Not marked',
  present: 'Present',
  late: 'Late',
  half_day: 'Half',
  absent: 'Absent',
  ready: 'To pay',
  paid: 'Paid',
  due: 'Payment due',
  trial: 'Free trial',
  expired: 'Expired',
}
