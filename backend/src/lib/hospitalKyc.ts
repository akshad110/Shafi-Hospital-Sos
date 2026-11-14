export const KYC_MAX_FILE_BYTES = 4 * 1024 * 1024
export const KYC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

export const HOSPITAL_KYC_DOCS = [
  {
    code: 'clinical_licence',
    label: 'Clinical establishment / hospital registration licence',
    hint: 'State nursing home Act or Clinical Establishments Act certificate in the hospital’s name.',
    required: true,
  },
  {
    code: 'gst',
    label: 'GST registration certificate',
    hint: 'GSTIN issued to the hospital, trust, or operating company.',
    required: true,
  },
  {
    code: 'pan',
    label: 'PAN of the hospital or trust',
    hint: 'PAN of the registered organisation — not a personal PAN of a doctor.',
    required: true,
  },
  {
    code: 'admin_id',
    label: 'Hospital administrator photo ID',
    hint: 'Aadhaar, passport, or driving licence of the administrator who will run this portal.',
    required: true,
  },
  {
    code: 'authorisation',
    label: 'Authorisation letter on hospital letterhead',
    hint: 'Signed letter confirming this administrator may register and operate the Shafi SOS account.',
    required: true,
  },
  {
    code: 'entity',
    label: 'Trust, society, or company registration',
    hint: 'Optional. Trust deed extract, society certificate, or Certificate of Incorporation.',
    required: false,
  },
  {
    code: 'nabh',
    label: 'NABH / NABL accreditation',
    hint: 'Optional. Include if the facility is accredited.',
    required: false,
  },
] as const

export type KycDocCode = (typeof HOSPITAL_KYC_DOCS)[number]['code']

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'])
const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])

export function kycDocByCode(code: string) {
  return HOSPITAL_KYC_DOCS.find((item) => item.code === code)
}

export function isAllowedKycFile(fileName: string, mime = '') {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  if (!ALLOWED_EXT.has(ext)) return false
  if (!mime) return true
  return ALLOWED_TYPES.has(mime.toLowerCase())
}

export function kycRequirements() {
  return {
    documents: HOSPITAL_KYC_DOCS.map((item) => ({ ...item })),
    accept: KYC_ACCEPT,
    maxFileMb: KYC_MAX_FILE_BYTES / (1024 * 1024),
  }
}
