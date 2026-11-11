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

export const DOCUMENT_REJECT_REASONS = [
  { code: 'blurry', label: 'Unreadable or blurry', body: 'Your {doc} was not verified. The file is unreadable or blurry. Please upload a clear copy.' },
  { code: 'expired', label: 'Expired', body: 'Your {doc} was not verified. It is expired. Please upload a current copy.' },
  { code: 'name', label: 'Name does not match', body: 'Your {doc} was not verified. The name on the document does not match. Please upload the correct file.' },
  { code: 'wrong', label: 'Wrong document', body: 'Your {doc} was not verified. This is the wrong document. Please upload the correct one.' },
  { code: 'incomplete', label: 'Incomplete or cut off', body: 'Your {doc} was not verified. The file is incomplete or cut off. Please upload the full document.' },
  { code: 'invalid', label: 'Looks invalid', body: 'Your {doc} was not verified. The file does not look valid. Please upload an original copy.' },
  { code: 'other', label: 'Other', body: 'Your {doc} was not verified. {reason}. Please upload a valid copy.' },
] as const

export function documentRejectBody(code: string, doc: string, extra?: string) {
  const item = DOCUMENT_REJECT_REASONS.find((entry) => entry.code === code) || DOCUMENT_REJECT_REASONS[DOCUMENT_REJECT_REASONS.length - 1]
  const reason = (extra || '').trim() || item.label
  return item.body.replace('{doc}', doc).replace('{reason}', reason)
}
