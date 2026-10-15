import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required.')
    .max(50, 'Category name must be 50 characters or less.'),
  description: z
    .string()
    .max(255, 'Description must be 255 characters or less.')
    .optional()
    .or(z.literal('')),
  color: z.string().default('bg-primary/20 text-primary border-primary/40'),
  icon: z.string().default('Package'),
})
