import type { AttendanceStatus, PayRules } from '../types/domain'

export function defaultCuts(presentPay: number) {
  const pay = Math.max(0, Math.round(Number(presentPay) || 0))
  return {
    lateDeduction: Math.round(pay * 0.1),
    halfDayPay: Math.round(pay / 2),
  }
}

export function fallbackPayRules(presentPay: number, source?: Partial<PayRules> | null): PayRules {
  const pay = Math.max(0, Math.round(source?.presentPay ?? presentPay ?? 0))
  const cuts = defaultCuts(pay)
  return {
    presentPay: pay,
    lateAllowed: source?.lateAllowed ?? true,
    lateDeduction: Math.max(0, Math.round(source?.lateDeduction ?? cuts.lateDeduction)),
    halfDayAllowed: source?.halfDayAllowed ?? true,
    halfDayPay: Math.max(0, Math.round(source?.halfDayPay ?? cuts.halfDayPay)),
    absentAllowed: source?.absentAllowed ?? true,
    absentPay: Math.max(0, Math.round(source?.absentPay ?? 0)),
  }
}

export function payForMark(status: AttendanceStatus, rules: PayRules) {
  if (status === 'pending') return 0
  if (status === 'present') return rules.presentPay
  if (status === 'late') return Math.max(0, rules.presentPay - rules.lateDeduction)
  if (status === 'half_day') return rules.halfDayPay
  return rules.absentPay
}

export function allowedMarks(rules?: PayRules | null) {
  return {
    present: true,
    late: rules?.lateAllowed !== false,
    half_day: rules?.halfDayAllowed !== false,
    absent: rules?.absentAllowed !== false,
  }
}
