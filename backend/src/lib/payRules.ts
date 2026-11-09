import type { AttendanceStatus, PayRules, PaymentUnit } from '../types.js'

export function presentDayPay(rate: number, unit: PaymentUnit, hoursPerShift = 8) {
  const hours = hoursPerShift > 0 ? hoursPerShift : 8
  return Math.round(unit === 'hourly' ? rate * hours : rate)
}

export function defaultPayRules(presentPay: number): PayRules {
  const pay = Math.max(0, Math.round(presentPay) || 0)
  return {
    presentPay: pay,
    lateAllowed: true,
    lateDeduction: Math.max(0, Math.round(pay * 0.1)),
    halfDayAllowed: true,
    halfDayPay: Math.round(pay / 2),
    absentAllowed: true,
    absentPay: 0,
  }
}

export function resolvePayRules(source?: Partial<PayRules> | null, presentPay?: number): PayRules {
  const base = defaultPayRules(presentPay ?? source?.presentPay ?? 0)
  return {
    presentPay: Math.max(0, Math.round(source?.presentPay ?? base.presentPay)),
    lateAllowed: source?.lateAllowed ?? true,
    lateDeduction: Math.max(0, Math.round(source?.lateDeduction ?? base.lateDeduction)),
    halfDayAllowed: source?.halfDayAllowed ?? true,
    halfDayPay: Math.max(0, Math.round(source?.halfDayPay ?? base.halfDayPay)),
    absentAllowed: source?.absentAllowed ?? true,
    absentPay: Math.max(0, Math.round(source?.absentPay ?? 0)),
  }
}

export function payForStatus(status: AttendanceStatus, rules: PayRules) {
  if (status === 'pending') return 0
  if (status === 'present') return rules.presentPay
  if (status === 'late') return Math.max(0, rules.presentPay - rules.lateDeduction)
  if (status === 'half_day') return rules.halfDayPay
  return rules.absentPay
}

export function statusAllowed(status: AttendanceStatus, rules: PayRules) {
  if (status === 'pending' || status === 'present') return true
  if (status === 'late') return rules.lateAllowed
  if (status === 'half_day') return rules.halfDayAllowed
  return rules.absentAllowed
}
