import { z } from 'zod'

export const requestSchema = z.object({
  title: z.string().min(3, 'Add a job title'),
  department: z.string().min(2, 'Choose a department'),
  role: z.string().min(2, 'Choose a role'),
  description: z.string().min(10, 'Describe the requirement'),
  qualifications: z.string().min(2, 'Add qualifications'),
  experience: z.string().min(1, 'Add experience'),
  skills: z.string().min(2, 'Add skills'),
  certifications: z.string().optional(),
  workersNeeded: z.coerce.number().int().min(1, 'At least one worker').max(50),
  date: z.string().min(1, 'Choose a date'),
  startTime: z.string().min(1, 'Add a start time'),
  endTime: z.string().min(1, 'Add an end time'),
  shiftType: z.enum(['day', 'night', 'rotating']),
  location: z.string().min(2, 'Add a location'),
  amount: z.coerce.number().positive('Enter compensation'),
  paymentUnit: z.enum(['hourly', 'shift', 'daily']),
  notes: z.string().optional(),
})

export type RequestValues = z.infer<typeof requestSchema>

export const steps = [
  { title: 'Basics', fields: ['title', 'department', 'role', 'description'] as const },
  { title: 'Requirements', fields: ['qualifications', 'experience', 'skills', 'certifications', 'workersNeeded'] as const },
  { title: 'Shift', fields: ['date', 'startTime', 'endTime', 'shiftType', 'location'] as const },
  { title: 'Pay', fields: ['amount', 'paymentUnit', 'notes'] as const },
  { title: 'Review', fields: [] as const },
]
