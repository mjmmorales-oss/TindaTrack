import { z } from 'zod'

export const recordPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .gt(0, 'Kailangan may halaga ang ibabayad (mas mataas sa ₱0).'),
  payment_date: z.string().optional(),
  notes: z
    .string()
    .max(250, 'Hanggang 250 titik lamang ang tala sa pagbabayad.')
    .optional()
    .or(z.literal('')),
})
