import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { aiService } from '@/services/ai'
import { useCartStore } from '@/stores/cartStore'
import { BasketReviewSheet } from '@/features/pos/components/BasketReviewSheet'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/components/scanner/ScannerSheet', () => ({
  ScannerSheet: ({ onBasketScanned }) => (
    <button
      data-testid="mock-scanner-sheet-trigger"
      onClick={() =>
        onBasketScanned?.(
          {
            scan_id: 'scan_g1_1',
            detected_count: 1,
            matched_count: 1,
            unmatched_count: 0,
            items: [
              {
                id: 'item-1',
                matched_product_id: 101,
                matched_product: { id: 101, name: 'Bear Brand Fortified 33g', price: 15 },
                confidence: 0.95,
                quantity: 1,
              },
            ],
            unmatched_items: [],
          },
          'data:image/svg+xml;utf8,<svg></svg>'
        )
      }
    >
      Mock Scanner Trigger
    </button>
  ),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithClient(ui) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('AI Basket Scan and Cart Integration', () => {
  beforeEach(() => {
    useCartStore.getState().reset()
  })

  it('tracks cart_started_at and add_method in cartStore', () => {
    const store = useCartStore.getState()
    expect(store.cart_started_at).toBeNull()

    const mockProd = {
      id: 991,
      name: 'Nissin Cup Noodles Seafood',
      price: 35.0,
      stock_quantity: 10,
      sku: 'NISSIN-01',
    }

    store.add(mockProd, 2, 'ai')

    const updated = useCartStore.getState()
    expect(updated.cart_started_at).not.toBeNull()
    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].add_method).toBe('ai')
    expect(updated.items[0].quantity).toBe(2)

    // Clear resets cart_started_at
    updated.clear()
    expect(useCartStore.getState().cart_started_at).toBeNull()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('generates mock basketScan response with matched and unmatched items', async () => {
    const fakeBlob = new Blob(['sample-image'], { type: 'image/jpeg' })
    const result = await aiService.basketScan(fakeBlob)

    expect(result).toHaveProperty('scan_id')
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0]).toHaveProperty('matched_product_id')
    expect(result.items[0]).toHaveProperty('bounding_box')
    expect(result.items[0].confidence).toBeGreaterThan(0.7)
  })

  it('renders BasketReviewSheet and adds confirmed items to cart with ai method', async () => {
    const mockScan = {
      scan_id: 'scan_test_123',
      detected_count: 2,
      matched_count: 1,
      unmatched_count: 1,
      items: [
        {
          id: 'det_1',
          matched_product_id: 101,
          matched_product: {
            id: 101,
            name: 'Bear Brand Fortified 33g',
            price: 15.0,
            stock_quantity: 20,
          },
          label: 'Bear Brand Fortified 33g',
          quantity: 2,
          confidence: 0.96,
          bounding_box: [100, 100, 400, 400],
        },
      ],
      unmatched_items: [
        {
          id: 'det_2',
          label: 'Unknown Candy Bar',
          quantity: 1,
          confidence: 0.7,
          bounding_box: [500, 500, 800, 800],
        },
      ],
    }

    renderWithClient(
      <BasketReviewSheet
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScan}
        imageSrc="data:image/svg+xml;utf8,<svg></svg>"
      />
    )

    expect(screen.getByText(/Bear Brand Fortified 33g/i)).toBeInTheDocument()
    expect(screen.getByText(/Unknown Candy Bar/i)).toBeInTheDocument()

    // Click Add to Cart
    const addBtn = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      const items = useCartStore.getState().items
      expect(items.length).toBeGreaterThan(0)
      expect(items[0].product_id).toBe(101)
      expect(items[0].add_method).toBe('ai_basket') // AiMetricsService buckets 'ai_basket'
      expect(items[0].quantity).toBe(2)
    })
  })

  it('G1.1 regression: PosPage ScannerSheet onBasketScanned opens BasketReviewSheet without throwing', async () => {
    const { PosPage } = await import('@/features/pos/pages/PosPage.jsx')
    const { renderWithProviders } = await import('./renderRoute.jsx')

    renderWithProviders(<PosPage />, { role: 'owner' })

    const triggerBtn = await screen.findByTestId('mock-scanner-sheet-trigger')
    fireEvent.click(triggerBtn)

    await waitFor(() => {
      expect(screen.getByText(/Bear Brand Fortified 33g/i)).toBeInTheDocument()
    })
  })
})
