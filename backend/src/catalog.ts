import { Catalogs } from './models.js'

export interface Catalog {
  roles: string[]
  supportTopics: string[]
  faqs: { q: string; a: string }[]
  supportContact: { email: string; phone: string; hours: string }
  payoutMethods: { value: string; label: string }[]
}

export const CATALOG_SEED: Catalog = {
  roles: ['Registered Nurse', 'ICU Nurse', 'ER Nurse', 'Technician', 'Lab Technician', 'Caregiver'],
  supportTopics: ['Staffing request', 'Application or placement', 'Shift or attendance', 'Salary and payouts', 'Billing and plans', 'Account access'],
  faqs: [
    { q: 'Why is my request not visible to workers?', a: 'Every request goes through admin review first. It goes live once it shows as Approved.' },
    { q: 'Can I confirm a worker myself?', a: 'No. The admin desk confirms placements so every hospital gets the same credential checks.' },
    { q: 'When can I pay a worker?', a: 'Once their contract period is over and every shift has an attendance mark, the salary is ready to pay from Attendance & Payroll.' },
    { q: 'What happens when my free trial ends?', a: 'Existing shifts continue, but you need a plan to post new requests.' },
  ],
  supportContact: { email: 'desk@shafisos.example', phone: '+91 20 4000 0000', hours: '08:00–20:00 IST, every day' },
  payoutMethods: [
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
  ],
}

export async function getCatalog(): Promise<Catalog> {
  const rows = await Catalogs.find({}, { _id: 0 }).lean()
  const catalog = { ...CATALOG_SEED } as Record<string, unknown>
  for (const row of rows) catalog[row.key] = row.value
  return catalog as unknown as Catalog
}

export async function catalogRoles() {
  const row = await Catalogs.findOne({ key: 'roles' }, { _id: 0 }).lean()
  return (row?.value as string[] | undefined) || CATALOG_SEED.roles
}
