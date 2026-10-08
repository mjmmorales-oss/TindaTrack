import { z } from 'zod'

export const PRODUCT_UNITS = [
  { value: 'pc', label: 'Piraso (pc)' },
  { value: 'pack', label: 'Pakete (pack)' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'bottle', label: 'Bote (bottle)' },
  { value: 'can', label: 'Lata (can)' },
  { value: 'cup', label: 'Tasa (cup)' },
  { value: 'kg', label: 'Kilo (kg)' },
  { value: 'L', label: 'Litro (L)' },
]

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Kailangan ang pangalan ng produkto.')
    .max(120, 'Hanggang 120 titik lamang ang pangalan.'),
  category_id: z
    .coerce
    .number()
    .min(1, 'Pumili ng kategorya para sa produkto.'),
  sku: z.string().max(50, 'Hanggang 50 titik lamang ang SKU.').optional().or(z.literal('')),
  barcode: z
    .string()
    .refine((val) => !val || /^\d{8,13}$/.test(val.trim()), {
      message: 'Ang barcode ay dapat may 8 hanggang 13 tambilang (digits).',
    })
    .optional()
    .or(z.literal('')),
  unit: z.enum(['pc', 'pack', 'sachet', 'bottle', 'can', 'cup', 'kg', 'L'], {
    errorMap: () => ({ message: 'Pumili ng wastong sukat (unit).' }),
  }),
  price: z.coerce.number().min(0, 'Ang presyo ng benta ay hindi maaaring negatibo.'),
  cost_price: z.coerce.number().min(0, 'Ang puhunan ay hindi maaaring negatibo.').default(0),
  stock_quantity: z.coerce.number().int().min(0, 'Ang stock ay hindi maaaring negatibo.').default(0),
  reorder_level: z.coerce.number().int().min(0, 'Ang reorder level ay hindi maaaring negatibo.').default(10),
  is_active: z.boolean().default(true),
  description: z.string().max(500, 'Hanggang 500 titik lamang ang paglalarawan.').optional().or(z.literal('')),
})

export const adjustStockSchema = z.object({
  type: z.enum(['restock', 'damage', 'correction'], {
    errorMap: () => ({ message: 'Pumili ng uri ng pagbabago sa stock.' }),
  }),
  quantity: z.coerce.number().int().min(1, 'Maglagay ng bilang na hindi bababa sa 1.'),
  notes: z.string().max(255, 'Hanggang 255 titik lamang ang tala.').optional().or(z.literal('')),
})
