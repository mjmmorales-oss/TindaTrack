import { z } from 'zod'

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Kailangan ang pangalan ng kustomer.')
    .max(100, 'Hanggang 100 titik lamang ang pangalan.'),
  nickname: z
    .string()
    .max(50, 'Hanggang 50 titik lamang ang palayaw.')
    .optional()
    .or(z.literal('')),
  contact_number: z
    .string()
    .refine((val) => !val || /^09\d{2}-?\d{3}-?\d{4}$/.test(val.trim()), {
      message: 'Wastong format ng cellphone: 09XX-XXX-XXXX.',
    })
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'Hanggang 200 titik lamang ang tirahan.')
    .optional()
    .or(z.literal('')),
  credit_limit: z.coerce
    .number()
    .min(0, 'Hindi maaaring negatibo ang credit limit.')
    .default(1000),
  notes: z
    .string()
    .max(500, 'Hanggang 500 titik lamang ang tala.')
    .optional()
    .or(z.literal('')),
})
