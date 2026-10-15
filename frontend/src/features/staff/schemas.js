import { z } from 'zod'

export const createStaffSchema = z
  .object({
    name: z.string().min(1, 'Cashier full name is required.').max(100),
    email: z.string().email('A valid email address is required.').max(255),
    phone: z.string().max(20).optional().or(z.literal('')),
    password_mode: z.enum(['generate', 'manual']),
    password: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.password_mode === 'manual') {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 8 characters when set manually.',
          path: ['password'],
        })
      }
    }
  })

export const updateStaffSchema = z.object({
  name: z.string().min(1, 'Full name is required.').max(100),
  email: z.string().email('A valid email address is required.').max(255),
  phone: z.string().max(20).optional().or(z.literal('')),
})

export const resetPasswordSchema = z
  .object({
    password_mode: z.enum(['generate', 'manual']),
    password: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.password_mode === 'manual') {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 8 characters when set manually.',
          path: ['password'],
        })
      }
    }
  })
