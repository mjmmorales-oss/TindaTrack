import { z } from 'zod'
import { isAcceptable } from '@/lib/barcode'

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
    .refine((val) => !val || isAcceptable(val.trim()), {
      message: 'Hindi wastong barcode format.',
    })
    .optional()
    .or(z.literal('')),
  brand: z.string().max(255, 'Hanggang 255 titik lamang ang brand.').optional().or(z.literal('')),
  size: z.string().max(100, 'Hanggang 100 titik lamang ang sukat/size.').optional().or(z.literal('')),
  image_url: z.string().max(2048, 'Masyadong mahaba ang URL ng larawan.').optional().or(z.literal('')),
  source: z.enum(['manual', 'openfoodfacts', 'openproductsfacts', 'openbeautyfacts']).default('manual'),
  source_ref: z.string().max(255).optional().or(z.literal('')),
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

export const DEFAULT_PRODUCT = {
  name: '',
  category_id: null,
  sku: '',
  barcode: '',
  unit: 'pc',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  reorder_level: 10,
  is_active: true,
  description: '',
  brand: '',
  size: '',
  image_url: '',
  source: 'manual',
  source_ref: '',
}


