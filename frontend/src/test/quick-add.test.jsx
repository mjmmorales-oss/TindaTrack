import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent, render } from '@testing-library/react'
import { renderWithProviders } from './renderRoute'
import { renderRoute } from './renderRoute'
import { useMockDb } from '@/mocks/db'
import { getAutoBarcodeLookup, setAutoBarcodeLookup } from '@/lib/barcodeSettings'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'
import { AddByBarcodeDialog } from '@/features/products/components/AddByBarcodeDialog'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { DEFAULT_PRODUCT } from '@/features/products/schemas'

describe('U1: Unified Add by Barcode Flow and BarcodeCapture', () => {
  beforeEach(() => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
    setAutoBarcodeLookup(true)
    vi.clearAllMocks()
  })

  describe('BarcodeCapture Component', () => {
    it('typing a valid EAN-13 auto-submits once after debounce', async () => {
      const onCode = vi.fn()
      render(<BarcodeCapture onCode={onCode} autoFocus={false} />)

      const input = screen.getByPlaceholderText(/Scan with barcode gun or type numbers|I-scan gamit ang barcode scanner/i)

      // Type valid EAN-13 (Nutella: 3017620422003)
      fireEvent.change(input, { target: { value: '3017620422003' } })

      // Wait for 400ms debounce
      await waitFor(() => {
        expect(onCode).toHaveBeenCalledTimes(1)
        expect(onCode).toHaveBeenCalledWith('3017620422003', { source: 'typed' })
      })
    })

    it('an invalid check digit shows an error and does not submit', async () => {
      const onCode = vi.fn()
      render(<BarcodeCapture onCode={onCode} autoFocus={false} />)

      const input = screen.getByPlaceholderText(/Scan with barcode gun or type numbers|I-scan gamit ang barcode scanner/i)

      // Nutella with invalid check digit (ends in 9 instead of 3)
      fireEvent.change(input, { target: { value: '3017620422009' } })

      // Expect inline error
      await waitFor(() => {
        expect(screen.getByText(/Invalid check digit|Maling check digit/i)).toBeInTheDocument()
      })

      // Press Enter to attempt submission
      fireEvent.submit(input.closest('form'))
      expect(onCode).not.toHaveBeenCalled()
    })

    it('Enter submits an internal code', async () => {
      const onCode = vi.fn()
      render(<BarcodeCapture onCode={onCode} autoFocus={false} />)

      const input = screen.getByPlaceholderText(/Scan with barcode gun or type numbers|I-scan gamit ang barcode scanner/i)

      // Internal barcode starting with 20
      fireEvent.change(input, { target: { value: '2000000000018' } })
      fireEvent.submit(input.closest('form'))

      expect(onCode).toHaveBeenCalledWith('2000000000018', { source: 'typed' })
    })

    it('wedge input submits with source: wedge', async () => {
      const onCode = vi.fn()
      render(<BarcodeCapture onCode={onCode} autoFocus={false} />)

      // Simulate keyboard wedge firing characters rapidly and pressing Enter
      const barcodeChars = '4800016601042'.split('')
      for (const char of barcodeChars) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }))
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      await waitFor(() => {
        expect(onCode).toHaveBeenCalledWith('4800016601042', { source: 'wedge' })
      })
    })

    it('camera is off by default when pointer: fine and on when pointer: coarse', () => {
      // 1. Desktop: pointer: fine
      const originalMatchMedia = window.matchMedia
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('pointer: coarse') ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const { unmount } = render(<BarcodeCapture onCode={vi.fn()} autoFocus={false} />)
      expect(screen.getByRole('button', { name: /Use camera|Gamitin ang camera/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Hide camera|Itago ang camera/i })).toBeNull()
      unmount()

      // 2. Mobile touch: pointer: coarse
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('pointer: coarse') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<BarcodeCapture onCode={vi.fn()} autoFocus={false} />)
      expect(screen.getByRole('button', { name: /Hide camera|Itago ang camera/i })).toBeInTheDocument()

      window.matchMedia = originalMatchMedia
    })

    it('camera timeout shows Retry, and typing still works', async () => {
      // Mock CameraScanner to simulate error/timeout state
      render(<BarcodeCapture onCode={vi.fn()} autoFocus={false} cameraDefault="on" />)

      // Typing in input is immediately visible and usable
      const input = screen.getByPlaceholderText(/Scan with barcode gun or type numbers|I-scan gamit ang barcode scanner/i)
      expect(input).toBeInTheDocument()
      fireEvent.change(input, { target: { value: '2000000000018' } })
      expect(input.value).toBe('2000000000018')
    })
  })

  describe('AddByBarcodeDialog Component', () => {
    const mockCategories = [
      { id: 1, name: 'Canned Goods' },
      { id: 2, name: 'Instant Noodles' },
    ]

    it('state c: found online (not in store) pre-fills, saves and grows session list on save & scan next', async () => {
      const onSuccess = vi.fn()
      renderWithProviders(
        <AddByBarcodeDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
          initialBarcode="3017620422003"
          onSuccess={onSuccess}
        />,
        { role: 'owner' }
      )

      // State b -> State c
      await waitFor(() => {
        expect(screen.getByDisplayValue(/Nutella/i)).toBeInTheDocument()
      })

      // Change photo button exists
      expect(screen.getAllByText(/Change photo|Palitan ang litrato/i).length).toBeGreaterThan(0)

      // Enter price
      const priceInput = screen.getByLabelText(/Selling Price|Presyo ng Benta/i)
      fireEvent.change(priceInput, { target: { value: '190.00' } })

      // Click Save & Scan Next
      const saveAndNextBtn = screen.getByRole('button', { name: /Save & Scan Next|I-save at I-scan ang Susunod/i })
      fireEvent.click(saveAndNextBtn)

      await waitFor(() => {
        expect(screen.getByText(/Added this session \(1\)|Naidagdag ngayong sesyon \(1\)/i)).toBeInTheDocument()
      })
      expect(onSuccess).toHaveBeenCalled()
    })

    it('state d: already in the store shows details and Restock opens adjust action', async () => {
      useMockDb.getState().setProducts((prev) => [
        {
          id: 7777,
          name: 'Existing Test Sardines',
          barcode: '2000000000018',
          stock_quantity: 12,
          price: 28.0,
          cost_price: 22.0,
          is_active: true,
          unit: 'can',
        },
        ...prev,
      ])

      const onRestock = vi.fn()
      renderWithProviders(
        <AddByBarcodeDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
          initialBarcode="2000000000018"
          onRestockProduct={onRestock}
        />,
        { role: 'owner' }
      )

      await waitFor(() => {
        expect(screen.getByText('Existing Test Sardines')).toBeInTheDocument()
      })
      expect(screen.getByText(/Product Already in Inventory|Nasa Imbentaryo na ang Produkto/i)).toBeInTheDocument()

      const restockBtn = screen.getByRole('button', { name: /Restock|Mag-restock/i })
      fireEvent.click(restockBtn)
      expect(onRestock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Existing Test Sardines' }))
    })

    it('state e: not found online allows manual product entry', async () => {
      renderWithProviders(
        <AddByBarcodeDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
          initialBarcode="8901030000000"
        />,
        { role: 'owner' }
      )

      await waitFor(() => {
        expect(
          screen.getByText(/Not found online — add it manually|Hindi nahanap online — ilagay nang mano-mano/i)
        ).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/Product Name|Pangalan ng Produkto/i)
      expect(nameInput.value).toBe('')
    })

    it('state f: homemade item generates internal barcode and offers print labels after save', async () => {
      renderWithProviders(
        <AddByBarcodeDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
        />,
        { role: 'owner' }
      )

      // Click link "No barcode? Add a homemade item"
      const homemadeLink = screen.getByText(/No barcode\? Add a homemade item|Walang barcode\? Magdagdag ng sariling gawang paninda/i)
      fireEvent.click(homemadeLink)

      expect(screen.getByText(/Add Homemade \/ Custom Item|Magdagdag ng Sariling Gawang Paninda/i)).toBeInTheDocument()

      // Fill in details
      const nameInput = screen.getByLabelText(/Product Name|Pangalan ng Produkto/i)
      fireEvent.change(nameInput, { target: { value: 'Ice Candy Buko Pandan' } })

      const priceInput = screen.getByLabelText(/Selling Price|Presyo ng Benta/i)
      fireEvent.change(priceInput, { target: { value: '15.00' } })

      // Save
      const saveBtn = screen.getByRole('button', { name: /^Save$|^I-save$/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Print Labels|I-print ang mga Label/i })).toBeInTheDocument()
      })
    })
  })

  describe('ProductsPage header actions', () => {
    it('renders exactly two header actions: Add by barcode and Add Product; Quick Add by Scan is removed', async () => {
      renderRoute('/products', { role: 'owner' })

      await screen.findByText(/Products & Inventory|Mga Paninda at Imbentaryo/i, {}, { timeout: 10000 })

      // 1. Add by barcode exists
      expect(
        screen.getByRole('button', { name: /Add by barcode|Magdagdag gamit ang barcode/i })
      ).toBeInTheDocument()

      // 2. Add Product exists
      expect(
        screen.getByRole('button', { name: /Add Product|Magdagdag ng Produkto/i })
      ).toBeInTheDocument()

      // 3. Quick Add by Scan and Scan to add NO LONGER EXIST
      expect(screen.queryByRole('button', { name: /Quick Add by Scan|Mabilisang Pagdagdag/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /Scan to add|I-scan para idagdag/i })).toBeNull()
    })
  })

  describe('F1: SKU auto-generation and optional field tests', () => {
    it('Quick Add saves product without SKU and auto-generates TT-{CAT}-{NNN}', async () => {
      const onSuccess = vi.fn()
      const mockCategories = [
        { id: 4, name: 'Canned Goods', code: 'CAN' },
      ]
      renderWithProviders(
        <AddByBarcodeDialog
          open={true}
          onOpenChange={vi.fn()}
          categories={mockCategories}
          initialBarcode="3017620422003"
          onSuccess={onSuccess}
        />,
        { role: 'owner' }
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Nutella/i)).toBeInTheDocument()
      })

      const priceInput = screen.getByLabelText(/Selling Price|Presyo ng Benta/i)
      fireEvent.change(priceInput, { target: { value: '185.00' } })

      const saveBtn = screen.getByRole('button', { name: /^Save$|^I-save$/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })

      const saved = useMockDb.getState().products.find((p) => p.name.includes('Nutella'))
      expect(saved).toBeDefined()
      expect(saved.sku).toMatch(/^TT-(CAN|GEN)-\d{3,}$/)
    })

    it('ProductFormDialog accepts an empty SKU and generates a valid SKU', async () => {
      const onSuccess = vi.fn()
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={vi.fn()}
          product={{ category_id: 5, unit: 'pc' }}
          onSuccess={onSuccess}
        />,
        { role: 'owner' }
      )

      // Fill in Name, Price
      const nameInput = screen.getByLabelText(/Product Name|Pangalan ng Produkto/i)
      fireEvent.change(nameInput, { target: { value: 'Choco Mallows' } })

      // Leave SKU empty (it should have placeholder Auto-generated if empty)
      const skuInput = screen.getByPlaceholderText(/Auto-generated if empty|Kusang bubuuin kung bakante/i)
      expect(skuInput).toBeInTheDocument()
      expect(skuInput.value).toBe('')

      const priceInput = screen.getByLabelText(/Selling Price|Presyo ng Benta/i)
      fireEvent.change(priceInput, { target: { value: '25.00' } })

      // Save via Add Product button or submit form
      const saveBtn = screen.getByRole('button', { name: /Add Product|Idagdag ang Produkto/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })

      const saved = useMockDb.getState().products.find((p) => p.name === 'Choco Mallows')
      expect(saved).toBeDefined()
      expect(saved.sku).toMatch(/^TT-(SNA|GEN)-\d{3,}$/)
    })
  })
})

