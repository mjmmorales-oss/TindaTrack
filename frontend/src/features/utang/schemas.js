import { z } from 'zod'

export const recordPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .gt(0, 'Payment amount must be greater than ₱0.'),
  payment_date: z.string().optional(),
  notes: z
    .string()
    .max(250, 'Payment notes must be 250 characters or less.')
    .optional()
    .or(z.literal('')),
})
