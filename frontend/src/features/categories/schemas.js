import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Kailangan ang pangalan ng kategorya.')
    .max(50, 'Hanggang 50 titik lamang ang pangalan.'),
  description: z
    .string()
    .max(255, 'Hanggang 255 titik lamang ang paglalarawan.')
    .optional()
    .or(z.literal('')),
  color: z.string().default('bg-primary/20 text-primary border-primary/40'),
  icon: z.string().default('Package'),
})
