import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'

import { useCartStore } from '@/stores/cartStore'
import { PairPhoneDialog } from '@/components/scanner/PairPhoneDialog'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { PhoneScannerPage } from '@/features/scanner/pages/PhoneScannerPage'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { DEFAULT_PRODUCT } from '@/features/products/schemas'
import { Barcode } from '@/lib/barcode'
import { AuthContext } from '@/context/AuthContext'
import mockScannerService from '@/services/mock/scannerService.js'
import mockBarcodeService from '@/services/mock/barcodeService.js'

// Mock feedback audio/vibration
vi.mock('@/lib/feedback', () => ({
  beep: vi.fn(),
  vibrate: vi.fn(),
}))

// Mock notify
vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  })
}

function renderWithAuth(ui, { role = 'owner' } = {}) {
  const queryClient = createTestQueryClient()
  const authValue = {
    user: { id: 1, name: 'Aling Nena', role, is_active: true },
    status: 'authenticated',
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        {ui}
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('B10: POS Scan Handler Effects on Cart', () => {
  beforeEach(() => {
    useCartStore.getState().clear()
    vi.clearAllMocks()
  })

  it('adds found product to cart and increments quantity on repeat scan', () => {
    const product = {
      id: 101,
      name: 'San Miguel Pale Pilsen',
      price: 65,
      stock_quantity: 10,
      sku: 'DRK-001',
    }

    // 1. First scan: adds 1
    useCartStore.getState().add(product, 1)
    let state = useCartStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].product_id).toBe(101)
    expect(state.items[0].quantity).toBe(1)

    // 2. Second scan: increments to 2
    useCartStore.getState().add(product, 1)
    state = useCartStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].quantity).toBe(2)

    // 3. Increment by 3: total 5
    useCartStore.getState().add(product, 3)
    state = useCartStore.getState()
    expect(state.items[0].quantity).toBe(5)
  })

  it('prevents adding product when stock is 0 (out of stock)', () => {
    const outOfStockProduct = {
      id: 102,
      name: 'Coca Cola 1.5L',
      price: 75,
      stock_quantity: 0,
      sku: 'DRK-002',
    }

    useCartStore.getState().add(outOfStockProduct, 1)
    const state = useCartStore.getState()
    expect(state.items).toHaveLength(0)
  })

  it('clamps added quantity to maximum available stock', () => {
    const lowStockProduct = {
      id: 103,
      name: 'Chippy Red 110g',
      price: 25,
      stock_quantity: 3,
      sku: 'SNA-001',
    }

    // Try adding 10
    useCartStore.getState().add(lowStockProduct, 10)
    const state = useCartStore.getState()
    expect(state.items[0].quantity).toBe(3)
  })
})

describe('B10: PairPhoneDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pairing code in monospace and QR code from mocked scanner session', async () => {
    vi.spyOn(mockScannerService, 'createScannerSession').mockResolvedValue({
      id: 'session-123',
      pairing_code: 'ABCD-9876',
      pairing_expires_at: new Date(Date.now() + 600000).toISOString(),
      expires_at: new Date(Date.now() + 43200000).toISOString(),
      mode: 'pos',
    })
    vi.spyOn(mockScannerService, 'getScannerSession').mockResolvedValue({
      id: 'session-123',
      paired: false,
      online: false,
    })

    const onPaired = vi.fn()
    render(
      <PairPhoneDialog
        open={true}
        onOpenChange={vi.fn()}
        onPaired={onPaired}
        mode="pos"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('ABCD-9876')).toBeInTheDocument()
    })

    expect(screen.getByText(/Buksan ang camera ng iyong phone/i)).toBeInTheDocument()
    expect(screen.getByText(/I-scan ang QR code sa itaas/i)).toBeInTheDocument()
  })

  it('shows localhost warning when origin is localhost', async () => {
    vi.spyOn(mockScannerService, 'createScannerSession').mockResolvedValue({
      id: 'session-456',
      pairing_code: 'EFGH-5432',
      pairing_expires_at: new Date(Date.now() + 600000).toISOString(),
      expires_at: new Date(Date.now() + 43200000).toISOString(),
      mode: 'pos',
    })
    vi.spyOn(mockScannerService, 'getScannerSession').mockResolvedValue({
      id: 'session-456',
      paired: false,
      online: false,
    })

    render(
      <PairPhoneDialog
        open={true}
        onOpenChange={vi.fn()}
        mode="pos"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('EFGH-5432')).toBeInTheDocument()
    })

    if (/localhost|127\.0\.0\.1/.test(window.location.origin)) {
      expect(screen.getByText('localhost')).toBeInTheDocument()
    }
  })
})

describe('B10: PhoneScannerPage (/scan)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('auto-pairs from URL parameter ?code=ABCD-1234 and renders paired view', async () => {
    vi.spyOn(mockScannerService, 'pairScanner').mockResolvedValue({
      token: 'mock-device-token-12345',
      session: {
        id: 'session-xyz',
        mode: 'pos',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      store_name: 'Tindahan ni Aling Nena',
      user_name: 'Aling Nena',
    })

    render(
      <MemoryRouter initialEntries={['/scan?code=ABCD-1234']}>
        <Routes>
          <Route path="/scan" element={<PhoneScannerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Tindahan ni Aling Nena')).toBeInTheDocument()
    })

    expect(screen.getByText(/Konektado kay Aling Nena/i)).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
  })

  it('renders scan result card upon successful sendScan', async () => {
    sessionStorage.setItem('tt_scanner_token', 'mock-device-token-12345')
    sessionStorage.setItem(
      'tt_scanner_info',
      JSON.stringify({
        store_name: 'Tindahan ni Aling Nena',
        user_name: 'Aling Nena',
        mode: 'pos',
      }),
    )

    vi.spyOn(mockScannerService, 'sendScan').mockResolvedValue({
      event_id: 1,
      status: 'found',
      product: {
        id: 10,
        name: 'Lucky Me Pancit Canton Original',
        price: 18.5,
        stock_quantity: 42,
      },
    })

    render(
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<PhoneScannerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Tindahan ni Aling Nena')).toBeInTheDocument()

    // Open manual entry drawer / input
    const manualBtn = screen.getByRole('button', { name: /manual/i })
    fireEvent.click(manualBtn)

    const input = screen.getByPlaceholderText(/I-type ang barcode dito/i)
    fireEvent.change(input, { target: { value: '4800016601011' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getAllByText('Lucky Me Pancit Canton Original').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText(/Naipadala sa POS/i)).toBeInTheDocument()
  })

  it('shows ended session message on 401 error', async () => {
    sessionStorage.setItem('tt_scanner_token', 'mock-device-token-12345')
    sessionStorage.setItem(
      'tt_scanner_info',
      JSON.stringify({
        store_name: 'Tindahan ni Aling Nena',
        user_name: 'Aling Nena',
        mode: 'pos',
      }),
    )

    const error401 = new Error('Scanner session ended')
    error401.response = { status: 401 }
    vi.spyOn(mockScannerService, 'sendScan').mockRejectedValue(error401)

    render(
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<PhoneScannerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const manualBtn = screen.getByRole('button', { name: /manual/i })
    fireEvent.click(manualBtn)

    const input = screen.getByPlaceholderText(/I-type ang barcode dito/i)
    fireEvent.change(input, { target: { value: '4800016601011' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(
        screen.getByText(/Natapos na ang session\. Mag-scan ng bagong QR\./i),
      ).toBeInTheDocument()
    })
  })
})

describe('B10: CameraScanner Component', () => {
  it('shows HTTPS error message when context is insecure', () => {
    const originalIsSecure = window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    })

    render(<CameraScanner onDetected={vi.fn()} />)

    expect(screen.getByText('Kailangan ng HTTPS')).toBeInTheDocument()
    expect(screen.getByText(/Kailangan ng HTTPS para gumana ang camera/i)).toBeInTheDocument()

    Object.defineProperty(window, 'isSecureContext', {
      value: originalIsSecure,
      configurable: true,
    })
  })

  it('manual barcode entry submits and calls onDetected callback', () => {
    const onDetected = vi.fn()
    render(<CameraScanner onDetected={onDetected} />)

    const manualBtn = screen.getByRole('button', { name: /manual/i })
    fireEvent.click(manualBtn)

    const input = screen.getByPlaceholderText(/I-type ang barcode dito/i)
    fireEvent.change(input, { target: { value: '3017620422003' } })

    const form = input.closest('form')
    fireEvent.submit(form)

    expect(onDetected).toHaveBeenCalledWith('3017620422003')
  })
})

describe('B10: ProductFormDialog Auto-Fill and Internal Barcode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a valid internal EAN-13 starting with 20', () => {
    const internal = Barcode.makeInternal(1)
    expect(internal).toHaveLength(13)
    expect(internal.startsWith('200000000001')).toBe(true)
    expect(Barcode.isValidGtin(internal)).toBe(true)
    expect(Barcode.isInternal(internal)).toBe(true)
  })

  it('prefills empty product fields from catalog data without overwriting existing entries', async () => {
    vi.spyOn(mockBarcodeService, 'lookupBarcode').mockResolvedValue({
      barcode: '3017620422003',
      local_product: null,
      catalog: {
        found: true,
        name: 'Nutella Hazelnut Spread',
        brand: 'Ferrero',
        size: '350g',
        image_url: 'https://images.openfoodfacts.org/nutella.jpg',
        suggested_category_id: 5,
        source: 'openfoodfacts',
      },
    })

    renderWithAuth(
      <ProductFormDialog
        open={true}
        onOpenChange={vi.fn()}
        product={DEFAULT_PRODUCT}
        categories={[{ id: 5, name: 'Snacks' }]}
      />,
    )

    expect(screen.getByRole('heading', { name: /Magdagdag ng Bagong Produkto/i })).toBeInTheDocument()

    // Type barcode into #product-barcode input (in portal)
    const barcodeInput = document.getElementById('product-barcode')
    expect(barcodeInput).not.toBeNull()
    fireEvent.change(barcodeInput, { target: { value: '3017620422003' } })

    const lookupBtn = screen.getByRole('button', { name: /Hanapin online/i })
    fireEvent.click(lookupBtn)

    await waitFor(() => {
      const nameInput = document.querySelector('input[name="name"]')
      expect(nameInput?.value).toContain('Nutella Hazelnut Spread')
    })

    const brandInput = document.querySelector('input[name="brand"]')
    expect(brandInput?.value).toBe('Ferrero')

    const sizeInput = document.querySelector('input[name="size"]')
    expect(sizeInput?.value).toBe('350g')

    expect(screen.getByText(/Data mula sa Open Food Facts/i)).toBeInTheDocument()
  })

  it('shows not found message when online lookup finds no data', async () => {
    // Generate valid 13-digit GTIN not in seeded products
    const validUnknownGtin = '899275321111' + Barcode.computeCheckDigit('899275321111')

    vi.spyOn(mockBarcodeService, 'lookupBarcode').mockResolvedValue({
      barcode: validUnknownGtin,
      local_product: null,
      catalog: {
        found: false,
      },
    })

    renderWithAuth(
      <ProductFormDialog
        open={true}
        onOpenChange={vi.fn()}
        product={DEFAULT_PRODUCT}
        categories={[]}
      />,
    )

    const barcodeInput = document.getElementById('product-barcode')
    expect(barcodeInput).not.toBeNull()
    fireEvent.change(barcodeInput, { target: { value: validUnknownGtin } })

    const lookupBtn = screen.getByRole('button', { name: /Hanapin online/i })
    fireEvent.click(lookupBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Walang nakitang data online, punan nang manual\./i),
      ).toBeInTheDocument()
    })
  })

  it('detects local duplicate barcode and disables saving', async () => {
    renderWithAuth(
      <ProductFormDialog
        open={true}
        onOpenChange={vi.fn()}
        product={DEFAULT_PRODUCT}
        categories={[]}
      />,
    )

    const barcodeInput = document.getElementById('product-barcode')
    // 4800016601011 exists in seeded mock database (Coca-Cola Mismo)
    fireEvent.change(barcodeInput, { target: { value: '4800016601011' } })

    await waitFor(() => {
      expect(screen.getByText(/Naka-rehistro na ito/i)).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /Idagdag ang Produkto/i })
    expect(submitBtn).toBeDisabled()
  })
})
