import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import axios from 'axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message || (error.code === 'ERR_NETWORK' ? 'Cannot reach the hospital API' : fallback)
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

export function unitLabel(unit: string) {
  if (unit === 'hourly') return '/hr'
  if (unit === 'daily') return '/day'
  return '/shift'
}

export function when(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function dateOnly(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function today(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function daysLeft(value: string) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000))
}

export const PLAN_LABEL: Record<string, string> = {
  trial: 'Free trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export function dayLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))
}

export function startsIn(date: string, time: string) {
  const target = new Date(`${date}T${time}:00`)
  const diff = target.getTime() - Date.now()
  if (Number.isNaN(diff)) return ''
  if (diff < 0) return 'Started'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `Starts in ${mins}m`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `Starts in ${hours}h ${rem}m` : `Starts in ${hours}h`
}

export function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
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
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  filled: 'Filled',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  offered: 'Offered',
  confirmed: 'Confirmed',
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  pending: 'Not marked',
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
  ready: 'Ready to pay',
  paid: 'Paid',
  due: 'Payment due',
  trial: 'Free trial',
  expired: 'Expired',
}
