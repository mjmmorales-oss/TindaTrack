import { z } from 'zod'
import { isAcceptable } from '@/lib/barcode'

/**
 * The one list of selling units (product form, Quick Add, AI Stock-In).
 * Must match App\Support\ProductUnits on the backend.
 */
export const PRODUCT_UNITS = [
  { value: 'pc', label: 'Piraso (pc)' },
  { value: 'pack', label: 'Pakete (pack)' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'bottle', label: 'Bote (bottle)' },
  { value: 'can', label: 'Lata (can)' },
  { value: 'cup', label: 'Tasa (cup)' },
  { value: 'box', label: 'Kahon (box)' },
  { value: 'bag', label: 'Supot (bag)' },
  { value: 'roll', label: 'Rolyo (roll)' },
  { value: 'kg', label: 'Kilo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
]

export const PRODUCT_UNIT_VALUES = PRODUCT_UNITS.map((u) => u.value)

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required.')
    .max(120, 'Product name must be 120 characters or less.'),
  category_id: z
    .coerce
    .number()
    .min(1, 'Please select a category for this product.'),
  sku: z.string().max(50, 'SKU must be 50 characters or less.').optional().nullable().or(z.literal('')),
  barcode: z
    .string()
    .refine((val) => !val || isAcceptable(val.trim()), {
      message: 'Invalid barcode format.',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  brand: z.string().max(255, 'Brand must be 255 characters or less.').optional().nullable().or(z.literal('')),
  size: z.string().max(100, 'Size must be 100 characters or less.').optional().nullable().or(z.literal('')),
  image_url: z.string().max(2048, 'Image URL is too long.').optional().nullable().or(z.literal('')),
  source: z.enum(['manual', 'openfoodfacts', 'openproductsfacts', 'openbeautyfacts']).default('manual'),
  source_ref: z.string().max(255).optional().nullable().or(z.literal('')),
  unit: z.enum(PRODUCT_UNIT_VALUES, {
    errorMap: () => ({ message: 'Please select a valid unit.' }),
  }),
  price: z.coerce.number().min(0, 'Selling price cannot be negative.'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative.').default(0),
  stock_quantity: z.coerce.number().int().min(0, 'Stock cannot be negative.').default(0),
  reorder_level: z.coerce.number().int().min(0, 'Reorder level cannot be negative.').default(10),
  is_active: z.boolean().default(true),
  description: z.string().max(500, 'Description must be 500 characters or less.').optional().nullable().or(z.literal('')),
})

export const adjustStockSchema = z.object({
  type: z.enum(['restock', 'damage', 'correction'], {
    errorMap: () => ({ message: 'Please select a stock adjustment type.' }),
  }),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  notes: z.string().max(255, 'Notes must be 255 characters or less.').optional().or(z.literal('')),
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


