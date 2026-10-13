import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './renderRoute'
import { useMockDb } from '@/mocks/db'
import { getAutoBarcodeLookup, setAutoBarcodeLookup } from '@/lib/barcodeSettings'
import { QuickAddScanDialog } from '@/features/products/components/QuickAddScanDialog'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { DEFAULT_PRODUCT } from '@/features/products/schemas'

describe('H7: One-Step Barcode Auto-Fill and Continuous Quick Add Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
    setAutoBarcodeLookup(true)
  })

  describe('barcodeSettings utility', () => {
    it('defaults to true when localStorage is empty', () => {
      expect(getAutoBarcodeLookup()).toBe(true)
    })

    it('persists changes to localStorage correctly', () => {
      setAutoBarcodeLookup(false)
      expect(getAutoBarcodeLookup()).toBe(false)
      setAutoBarcodeLookup(true)
      expect(getAutoBarcodeLookup()).toBe(true)
    })
  })

  describe('QuickAddScanDialog Component', () => {
    const mockCategories = [
      { id: 1, name: 'Canned Goods' },
      { id: 2, name: 'Instant Noodles' },
    ]

    it('renders Quick Add modal with title and barcode input', () => {
      renderWithProviders(
        <QuickAddScanDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
        />,
        { role: 'owner' }
      )

      expect(
        screen.getByText(/Quick Add by Scan|Mabilisang Pagdagdag gamit ang Scan/i)
      ).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Scan or enter barcode/i)).toBeInTheDocument()
    })

    it('shows already in stock when local barcode is entered', async () => {
      useMockDb.getState().setProducts((prev) => [
        {
          id: 9999,
          name: 'Existing Test Item',
          barcode: '2000000000018',
          stock_quantity: 15,
          price: 25.0,
          cost_price: 20.0,
          is_active: true,
          unit: 'pc',
        },
        ...prev,
      ])

      renderWithProviders(
        <QuickAddScanDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
        />,
        { role: 'owner' }
      )

      const input = screen.getByPlaceholderText(/Scan or enter barcode/i)
      // Enter internal barcode from mock DB
      fireEvent.change(input, { target: { value: '2000000000018' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(
          screen.getByText(/Already in store inventory|Nasa imbentaryo na ng tindahan/i)
        ).toBeInTheDocument()
      })
      expect(screen.getByText(/\+10/)).toBeInTheDocument()
    })

    it('handles online product lookup with pre-fill and save & scan next', async () => {
      renderWithProviders(
        <QuickAddScanDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
        />,
        { role: 'owner' }
      )

      const input = screen.getByPlaceholderText(/Scan or enter barcode/i)
      // Barcode for Nutella in mock catalog
      fireEvent.change(input, { target: { value: '3017620422003' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Nutella/i)).toBeInTheDocument()
      })

      // Enter price using unique ID
      const priceInput = document.getElementById('quick-product-price')
      fireEvent.change(priceInput, { target: { value: '185.00' } })

      // Click Save & Scan Next via ID
      const saveBtn = document.getElementById('quick-add-submit')
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(
          screen.getByText(/1 products added this session|1 na produkto ang naidagdag/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('ProductFormDialog debounced GTIN auto-lookup', () => {
    it('runs debounced lookup when a valid GTIN is entered in create mode', async () => {
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={vi.fn()}
          product={DEFAULT_PRODUCT}
          categories={[{ id: 1, name: 'Snacks' }]}
        />,
        { role: 'owner' }
      )

      const barcodeInput = document.getElementById('product-barcode')
      fireEvent.change(barcodeInput, { target: { value: '3017620422003' } })

      // Wait for the 500ms debounce and lookup to pre-fill
      await waitFor(
        () => {
          expect(screen.getByDisplayValue(/Nutella/i)).toBeInTheDocument()
        },
        { timeout: 3500 }
      )
    })
  })
})
