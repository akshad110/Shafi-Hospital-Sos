export const TRIAL = { days: 7, locations: 1, activeRequests: 5 }

export function periodLabel(months: number) {
  return months === 1 ? '1 month' : `${months} months`
}

export function trialWindow(from = new Date()) {
  return {
    startedAt: from.toISOString(),
    renewalDate: new Date(from.getTime() + TRIAL.days * 24 * 60 * 60 * 1000).toISOString(),
  }
}
