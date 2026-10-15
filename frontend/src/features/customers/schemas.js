import { z } from 'zod'

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Customer name is required.')
    .max(100, 'Customer name must be 100 characters or less.'),
  nickname: z
    .string()
    .max(50, 'Nickname must be 50 characters or less.')
    .optional()
    .or(z.literal('')),
  contact_number: z
    .string()
    .refine((val) => !val || /^09\d{2}-?\d{3}-?\d{4}$/.test(val.trim()), {
      message: 'Valid phone format: 09XX-XXX-XXXX.',
    })
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'Address must be 200 characters or less.')
    .optional()
    .or(z.literal('')),
  credit_limit: z.coerce
    .number()
    .min(0, 'Credit limit cannot be negative.')
    .default(1000),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less.')
    .optional()
    .or(z.literal('')),
})
