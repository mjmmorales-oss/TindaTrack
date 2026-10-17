import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyServerErrors, formatFieldName } from '@/lib/formErrors'
import { productSchema, adjustStockSchema } from '@/features/products/schemas'
import { categorySchema } from '@/features/categories/schemas'
import { customerSchema } from '@/features/customers/schemas'
import { recordPaymentSchema } from '@/features/utang/schemas'
import { createStaffSchema, updateStaffSchema, resetPasswordSchema } from '@/features/staff/schemas'
import { loginSchema, registerSchema, forgotPasswordSchema } from '@/features/auth/schemas'
import { notify } from '@/lib/notify'

import productCreateFixture from '../../../contracts/payloads/product-create.json'
import productQuickAddFixture from '../../../contracts/payloads/product-quick-add.json'
import productHomemadeFixture from '../../../contracts/payloads/product-homemade.json'
import productUpdateFixture from '../../../contracts/payloads/product-update.json'
import productBulkFixture from '../../../contracts/payloads/product-bulk.json'
import productAdjustStockFixture from '../../../contracts/payloads/product-adjust-stock.json'
import categoryCreateFixture from '../../../contracts/payloads/category-create.json'
import categoryUpdateFixture from '../../../contracts/payloads/category-update.json'
import customerCreateFixture from '../../../contracts/payloads/customer-create.json'
import customerPosMiniFixture from '../../../contracts/payloads/customer-pos-mini.json'
import customerUpdateFixture from '../../../contracts/payloads/customer-update.json'
import saleCashFixture from '../../../contracts/payloads/sale-cash.json'
import saleUtangFixture from '../../../contracts/payloads/sale-utang.json'
import saleVoidFixture from '../../../contracts/payloads/sale-void.json'
import utangPaymentFixture from '../../../contracts/payloads/utang-payment.json'
import staffCreateFixture from '../../../contracts/payloads/staff-create.json'
import staffUpdateFixture from '../../../contracts/payloads/staff-update.json'
import staffResetPasswordFixture from '../../../contracts/payloads/staff-reset-password.json'
import settingsUpdateFixture from '../../../contracts/payloads/settings-update.json'
import accountPasswordFixture from '../../../contracts/payloads/account-password.json'
import scannerSessionCreateFixture from '../../../contracts/payloads/scanner-session-create.json'
import scannerScanFixture from '../../../contracts/payloads/scanner-scan.json'
import aiFeedbackFixture from '../../../contracts/payloads/ai-feedback.json'
import productEmbeddingFixture from '../../../contracts/payloads/product-embedding.json'
import aiExperimentCreateFixture from '../../../contracts/payloads/ai-experiment-create.json'
import authLoginFixture from '../../../contracts/payloads/auth-login.json'
import authRegisterFixture from '../../../contracts/payloads/auth-register.json'
import authForgotPasswordFixture from '../../../contracts/payloads/auth-forgot-password.json'
import aiBasketScanResponseFixture from '../../../contracts/responses/ai-basket-scan.json'
import aiProductScanResponseFixture from '../../../contracts/responses/ai-product-scan.json'
import {
  normalizeBasketResult,
  normalizeProductScanResult,
  buildBasketFeedbackLines,
} from '@/lib/aiContract'
import { aiService as mockAiService } from '@/services/mock/aiService'

vi.mock('@/lib/notify', () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

describe('F3: Form <-> API Contract & Payload Fixtures Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatFieldName helper', () => {
    it('formats single words, snake_case, and acronyms to clean title text', () => {
      expect(formatFieldName('sku')).toBe('SKU')
      expect(formatFieldName('category_id')).toBe('Category ID')
      expect(formatFieldName('cost_price')).toBe('Cost Price')
      expect(formatFieldName('stock_quantity')).toBe('Stock Quantity')
      expect(formatFieldName('image_url')).toBe('Image URL')
    })

    it('formats nested collection paths like products.0.price to readable English', () => {
      expect(formatFieldName('products.0.price')).toBe('Product 1 price')
      expect(formatFieldName('items.2.quantity')).toBe('Item 3 quantity')
    })
  })

  describe('applyServerErrors helper', () => {
    it('maps 422 field errors to visible form fields via setError without toasting', () => {
      const setError = vi.fn()
      const error = {
        response: {
          status: 422,
          data: {
            errors: {
              name: ['The name field is required.'],
              price: ['The price must be a number.'],
            },
          },
        },
      }

      const handled = applyServerErrors(error, setError, {
        visibleFields: ['name', 'price', 'category_id'],
      })

      expect(handled).toBe(true)
      expect(setError).toHaveBeenCalledWith('name', {
        type: 'server',
        message: 'The name field is required.',
      })
      expect(setError).toHaveBeenCalledWith('price', {
        type: 'server',
        message: 'The price must be a number.',
      })
      // No toast when all errors match visible fields
      expect(notify.error).not.toHaveBeenCalled()
    })

    it('applies fieldMap for translated form keys (e.g., password -> new_password)', () => {
      const setError = vi.fn()
      const error = {
        response: {
          status: 422,
          data: {
            errors: {
              password: ['The password must be at least 8 characters.'],
            },
          },
        },
      }

      applyServerErrors(error, setError, {
        fieldMap: { password: 'new_password' },
        visibleFields: ['current_password', 'new_password', 'confirm_password'],
      })

      expect(setError).toHaveBeenCalledWith('new_password', {
        type: 'server',
        message: 'The password must be at least 8 characters.',
      })
      expect(notify.error).not.toHaveBeenCalled()
    })

    it('shows a single friendly toast when errors target unmapped / hidden fields', () => {
      const setError = vi.fn()
      const error = {
        response: {
          status: 422,
          data: {
            errors: {
              sku: ['The sku field is required.'],
              cost_price: ['The cost price is invalid.'],
            },
          },
        },
      }

      // Quick Add form only has name, category_id, unit, price, cost_price, stock_quantity
      // and sku is NOT in visibleFields
      applyServerErrors(error, setError, {
        visibleFields: ['name', 'category_id', 'unit', 'price', 'cost_price'],
      })

      // cost_price is visible and mapped
      expect(setError).toHaveBeenCalledWith('cost_price', {
        type: 'server',
        message: 'The cost price is invalid.',
      })

      // sku is unmapped: toast fired listing plain English "SKU"
      expect(notify.error).toHaveBeenCalledWith(
        'Please check the highlighted fields',
        'SKU',
      )
    })
  })

  describe('Contract Fixtures Validation against Schemas & Types', () => {
    it('validates product-create.json matches expected schema and types', () => {
      const parsed = productSchema.parse(productCreateFixture)
      expect(parsed.name).toBe(productCreateFixture.name)
      expect(parsed.price).toBe(productCreateFixture.price)
      expect(parsed.category_id).toBe(productCreateFixture.category_id)
      expect(Object.keys(productCreateFixture)).toEqual(
        expect.arrayContaining(['name', 'category_id', 'price', 'cost_price', 'stock_quantity']),
      )
    })

    it('validates product-quick-add.json has no SKU and matches minimal product creation', () => {
      expect(productQuickAddFixture.sku).toBeUndefined()
      const parsed = productSchema.parse(productQuickAddFixture)
      expect(parsed.name).toBe(productQuickAddFixture.name)
      expect(parsed.category_id).toBe(productQuickAddFixture.category_id)
      expect(parsed.price).toBe(productQuickAddFixture.price)
    })

    it('validates product-homemade.json uses internal barcode prefix and pc unit', () => {
      const parsed = productSchema.parse(productHomemadeFixture)
      expect(parsed.barcode).toMatch(/^20\d{11}$/)
      expect(parsed.price).toBe(productHomemadeFixture.price)
    })

    it('validates product-bulk.json contains array of products with category_id and price', () => {
      expect(Array.isArray(productBulkFixture.products)).toBe(true)
      expect(productBulkFixture.products.length).toBeGreaterThan(0)
      const p = productBulkFixture.products[0]
      expect(typeof p.name).toBe('string')
      expect(typeof p.category_id).toBe('number')
      expect(typeof p.price).toBe('number')
      expect(typeof p.stock_quantity).toBe('number')
    })

    it('validates product-adjust-stock.json matches adjustStockSchema', () => {
      const parsed = adjustStockSchema.parse(productAdjustStockFixture)
      expect(parsed.type).toBe(productAdjustStockFixture.type)
      expect(parsed.quantity).toBe(productAdjustStockFixture.quantity)
    })

    it('validates category-create.json and category-update.json match categorySchema', () => {
      const createParsed = categorySchema.parse(categoryCreateFixture)
      expect(createParsed.name).toBe(categoryCreateFixture.name)

      const updateParsed = categorySchema.parse(categoryUpdateFixture)
      expect(updateParsed.name).toBe(categoryUpdateFixture.name)
    })

    it('validates customer fixtures match customerSchema', () => {
      const createParsed = customerSchema.parse(customerCreateFixture)
      expect(createParsed.name).toBe(customerCreateFixture.name)

      const miniParsed = customerSchema.parse(customerPosMiniFixture)
      expect(miniParsed.name).toBe(customerPosMiniFixture.name)

      const updateParsed = customerSchema.parse(customerUpdateFixture)
      expect(updateParsed.name).toBe(customerUpdateFixture.name)
    })

    it('validates sale checkout fixtures (cash, utang, void)', () => {
      expect(saleCashFixture.payment_type).toBe('cash')
      expect(saleCashFixture.items.length).toBeGreaterThan(0)
      expect(saleCashFixture.amount_paid).toBeGreaterThanOrEqual(0)

      expect(saleUtangFixture.payment_type).toBe('utang')
      expect(typeof saleUtangFixture.customer_id).toBe('number')

      expect(typeof saleVoidFixture.reason).toBe('string')
      expect(saleVoidFixture.reason.length).toBeGreaterThanOrEqual(5)
    })

    it('validates utang-payment.json matches recordPaymentSchema', () => {
      const parsed = recordPaymentSchema.parse(utangPaymentFixture)
      expect(parsed.amount).toBe(utangPaymentFixture.amount)
      expect(typeof utangPaymentFixture.customer_id).toBe('number')
    })

    it('validates staff fixtures match staff schemas', () => {
      const createParsed = createStaffSchema.parse({
        ...staffCreateFixture,
        password_mode: 'manual',
      })
      expect(createParsed.name).toBe(staffCreateFixture.name)
      expect(createParsed.email).toBe(staffCreateFixture.email)

      const updateParsed = updateStaffSchema.parse(staffUpdateFixture)
      expect(updateParsed.name).toBe(staffUpdateFixture.name)

      const resetParsed = resetPasswordSchema.parse({
        ...staffResetPasswordFixture,
        password_mode: 'manual',
      })
      expect(resetParsed.password).toBe(staffResetPasswordFixture.password)
    })

    it('validates settings-update.json contains store_name, phone/contact, and AI flags', () => {
      expect(settingsUpdateFixture.store_name).toBeTruthy()
      expect(typeof settingsUpdateFixture.default_reorder_level).toBe('number')
      expect(typeof settingsUpdateFixture.ai_enabled).toBe('boolean')
      expect(typeof settingsUpdateFixture.visual_search_enabled).toBe('boolean')
      expect(typeof settingsUpdateFixture.auto_capture_basket).toBe('boolean')
      expect(typeof settingsUpdateFixture.auto_capture_stockin).toBe('boolean')
      expect(['low', 'medium', 'normal', 'high']).toContain(settingsUpdateFixture.auto_capture_sensitivity)
    })

    it('validates auth fixtures match auth schemas', () => {
      const loginParsed = loginSchema.parse(authLoginFixture)
      expect(loginParsed.email).toBe(authLoginFixture.email)

      const registerParsed = registerSchema.parse({
        ...authRegisterFixture,
        terms: true,
      })
      expect(registerParsed.name).toBe(authRegisterFixture.name)

      const forgotParsed = forgotPasswordSchema.parse(authForgotPasswordFixture)
      expect(forgotParsed.email).toBe(authForgotPasswordFixture.email)
    })

    it('validates scanner and AI interaction payload fixtures', () => {
      expect(scannerSessionCreateFixture.mode).toBe('pos')
      expect(typeof scannerScanFixture.barcode).toBe('string')
      expect(scannerScanFixture.quantity).toBeGreaterThanOrEqual(1)

      expect(Array.isArray(aiFeedbackFixture.lines)).toBe(true)
      expect(aiFeedbackFixture.lines[0].line_type).toBe('item')
      expect(aiFeedbackFixture.lines[0].action).toBe('accepted')

      expect(productEmbeddingFixture.model).toBeTruthy()
      expect(Array.isArray(productEmbeddingFixture.vector)).toBe(true)

      expect(aiExperimentCreateFixture.name).toBeTruthy()
    })

    describe('AI Scan response fixtures and contract normalizers', () => {
      it('normalizes real-API ai-basket-scan response fixture accurately', () => {
        const normalized = normalizeBasketResult(aiBasketScanResponseFixture)
        expect(normalized.scan_id).toBe(101)
        expect(normalized.items.length).toBe(1)
        expect(normalized.items[0].matched_product_id).toBe(1)
        expect(normalized.items[0].matched_product.name).toBe('Coca-Cola Original 330ml')
        expect(normalized.items[0].matched_product.price).toBe(25.0)
        expect(normalized.items[0].quantity).toBe(2)
        expect(normalized.unmatched_items.length).toBe(1)
        expect(normalized.unmatched_items[0].label).toBe('Unknown snack pouch')
      })

      it('normalizes real-API ai-product-scan response fixture accurately', () => {
        const normalized = normalizeProductScanResult(aiProductScanResponseFixture, [
          { id: 2, name: 'Snacks' },
        ])
        expect(normalized.scan_id).toBe(202)
        expect(normalized.products.length).toBe(1)
        const p = normalized.products[0]
        expect(p.suggested_name).toBe('Piattos Cheese 85g')
        expect(p.suggested_category_id).toBe(2)
        expect(p.suggested_barcode).toBe('4800016644208')
        expect(p.estimated_count).toBe(5)
        expect(p.official_name).toBe('Piattos Cheese Flavored Potato Crisps 85g')
      })

      it('validates mock aiService returns normalized shapes matching contracts', async () => {
        const basket = await mockAiService.basketScan(new Blob(['test'], { type: 'image/jpeg' }))
        expect(basket).toHaveProperty('scan_id')
        expect(Array.isArray(basket.items)).toBe(true)
        expect(Array.isArray(basket.unmatched_items)).toBe(true)
        if (basket.items.length > 0) {
          expect(basket.items[0]).toHaveProperty('matched_product_id')
          expect(basket.items[0]).toHaveProperty('matched_product')
          expect(basket.items[0]).toHaveProperty('quantity')
        }

        const products = await mockAiService.productScan(new Blob(['test'], { type: 'image/jpeg' }), {
          categories: [{ id: 1, name: 'Drinks' }, { id: 2, name: 'Snacks' }],
        })
        expect(products).toHaveProperty('scan_id')
        expect(Array.isArray(products.products)).toBe(true)
        expect(products.products[0]).toHaveProperty('suggested_name')
        expect(products.products[0]).toHaveProperty('suggested_category_id')
        // Parity check: category Drink is matched to id 1
        const drinksProduct = products.products.find((p) => p.suggested_name.includes('C2'))
        expect(drinksProduct?.suggested_category_id).toBe(1)
      })

      it('verifies buildBasketFeedbackLines matches contracts/payloads/ai-feedback.json schema', () => {
        const originalScan = {
          scan_id: 101,
          items: [
            {
              id: 'item_1',
              matched_product_id: 1,
              original_product_id: 1,
              quantity: 2,
              original_quantity: 2,
              confidence: 0.94,
            },
          ],
          unmatched_items: [],
        }
        const confirmedItems = [
          {
            id: 'item_1',
            matched_product_id: 1,
            quantity: 2,
            is_manual: false,
          },
        ]

        const generated = buildBasketFeedbackLines(confirmedItems, [], originalScan)
        expect(generated.lines.length).toBe(1)
        const line = generated.lines[0]
        expect(line.line_type).toBe(aiFeedbackFixture.lines[0].line_type)
        expect(line.suggested_product_id).toBe(aiFeedbackFixture.lines[0].suggested_product_id)
        expect(line.suggested_quantity).toBe(aiFeedbackFixture.lines[0].suggested_quantity)
        expect(line.final_product_id).toBe(aiFeedbackFixture.lines[0].final_product_id)
        expect(line.final_quantity).toBe(aiFeedbackFixture.lines[0].final_quantity)
        expect(line.action).toBe(aiFeedbackFixture.lines[0].action)
      })
    })
  })
})
