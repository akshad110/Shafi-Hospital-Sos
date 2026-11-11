import { z } from 'zod'

export const MIN_DESC_WORDS = 10
export const MAX_DESC_WORDS = 80

export function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

const descriptionSchema = z.string().trim().superRefine((value, ctx) => {
  const words = wordCount(value)
  if (!value) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Describe what they will do in this role.' })
    return
  }
  if (words < MIN_DESC_WORDS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Write at least ${MIN_DESC_WORDS} words so staff understand the work. You have ${words}.`,
    })
  }
  if (words > MAX_DESC_WORDS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Please keep this to ${MAX_DESC_WORDS} words or fewer. You have ${words}.`,
    })
  }
})

export const requestSchema = z.object({
  title: z.string().min(3, 'Add a job title'),
  department: z.string().min(2, 'Choose a department'),
  role: z.string().min(2, 'Choose a role'),
  description: descriptionSchema,
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  skills: z.string().optional(),
  certifications: z.string().optional(),
  requiredDocuments: z.array(z.object({
    id: z.string(),
    name: z.string().trim().min(2).max(80),
  })),
  workersNeeded: z.coerce.number().int().min(1, 'At least one worker').max(50),
  date: z.string().min(1, 'Choose a start date'),
  startTime: z.string().min(1, 'Choose when the shift starts'),
  endTime: z.string().min(1, 'Choose when the shift ends'),
  shiftType: z.enum(['day', 'night', 'rotating']),
  location: z.string().min(2, 'Add a location'),
  amount: z.coerce.number().positive('Enter pay for a full present day'),
  paymentUnit: z.enum(['hourly', 'shift', 'daily']),
  lateAllowed: z.boolean(),
  lateDeduction: z.coerce.number().min(0),
  halfDayAllowed: z.boolean(),
  halfDayPay: z.coerce.number().min(0),
  absentAllowed: z.boolean(),
  notes: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.startTime && value.endTime && value.startTime === value.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'Start and end cannot be the same time.',
    })
  }
})

export type RequestValues = z.infer<typeof requestSchema>

export const steps = [
  { title: 'Role details', fields: ['title', 'department', 'role', 'description', 'workersNeeded'] as const },
  { title: 'Shift details', fields: ['date', 'startTime', 'endTime', 'location'] as const },
  { title: 'Daily pay', fields: ['amount', 'paymentUnit', 'lateAllowed', 'lateDeduction', 'halfDayAllowed', 'halfDayPay', 'absentAllowed'] as const },
]
