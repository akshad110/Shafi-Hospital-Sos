export const DOCUMENT_REQUESTS = [
  { code: 'license', label: 'Nursing / RN licence', body: 'Your nursing licence or RN licence is missing. Please upload it before {due}.' },
  { code: 'acls', label: 'ACLS certificate', body: 'Your ACLS certificate is missing. Please upload it before {due}.' },
  { code: 'bls', label: 'BLS certificate', body: 'Your BLS certificate is missing. Please upload it before {due}.' },
  { code: 'registration', label: 'State registration', body: 'Your state registration is missing. Please upload it before {due}.' },
  { code: 'id', label: 'Government ID', body: 'A government ID is missing. Please update it before {due}.' },
  { code: 'experience', label: 'Experience letter', body: 'An experience letter is missing. Please upload it before {due}.' },
  { code: 'fitness', label: 'Medical fitness record', body: 'A medical fitness or vaccination record is missing. Please upload it before {due}.' },
  { code: 'expiry', label: 'Expired certificate', body: 'A certificate is expired or expiring. Please renew it before {due}.' },
] as const

export type DocumentRequestCode = (typeof DOCUMENT_REQUESTS)[number]['code']

export function documentRequestBody(code: string, due: string, label?: string) {
  const item = DOCUMENT_REQUESTS.find((entry) => entry.code === code)
  if (item) return item.body.replace('{due}', due)
  const name = (label || '').trim() || 'document'
  return `Your ${name} is missing. Please upload it before ${due}.`
}
