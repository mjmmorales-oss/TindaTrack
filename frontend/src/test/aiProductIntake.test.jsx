import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AiProductReviewTable } from '@/features/products/components/AiProductReviewTable'
import { aiService } from '@/services/ai'

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

describe('AI Bulk Product Intake (Task A5)', () => {
  const mockScanResult = {
    scan_id: 'scan_prod_test_456',
    detected_count: 2,
    products: [
      {
        id: 'cand_1',
        suggested_name: 'Piattos Cheese 85g',
        suggested_barcode: '4800016644208',
        suggested_category: 'Snacks',
        suggested_price: 38.0,
        suggested_cost: 32.5,
        confidence: 0.94,
        bounding_box: [120, 100, 480, 550],
        is_duplicate: false,
      },
      {
        id: 'cand_2',
        suggested_name: 'C2 Green Tea Apple 500ml',
        suggested_barcode: '4800016052300',
        suggested_category: 'Beverages',
        suggested_price: 25.0,
        suggested_cost: 21.0,
        confidence: 0.91,
        bounding_box: [520, 150, 880, 700],
        is_duplicate: true,
        possible_duplicate_product: {
          id: 42,
          name: 'C2 Green Tea Apple 500ml',
          stock_quantity: 15,
        },
      },
    ],
  }

  it('prefills product details and ensures duplicate rows start unchecked', async () => {
    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
      />
    )

    // Name prefilled
    expect(screen.getAllByDisplayValue('Piattos Cheese 85g')[0]).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('C2 Green Tea Apple 500ml')[0]).toBeInTheDocument()

    // Barcode prefilled
    expect(screen.getAllByDisplayValue('4800016644208')[0]).toBeInTheDocument()

    // Duplicate warning displayed
    expect(screen.getAllByText(/Looks like:/i)[0]).toBeInTheDocument()

    // The non-duplicate item is selected; the duplicate item starts unchecked
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is select-all, second is Piattos (checked), third is C2 duplicate (unchecked)
    expect(checkboxes[1]).toBeChecked()
    expect(checkboxes[2]).not.toBeChecked()
  })

  it('validates price is required before saving', async () => {
    const scanWithNoPrice = {
      scan_id: 'scan_noprice',
      detected_count: 1,
      products: [
        {
          id: 'cand_noprice',
          suggested_name: 'No Price Snack',
          suggested_barcode: '',
          suggested_category: 'Snacks',
          suggested_price: 0,
          confidence: 0.85,
          is_duplicate: false,
        },
      ],
    }

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={scanWithNoPrice}
      />
    )

    // Button should be disabled because price is 0
    const saveBtn = screen.getByRole('button', { name: /save selected/i })
    expect(saveBtn).toBeDisabled()

    // Enter a valid price
    const priceInputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(priceInputs[0], { target: { value: '20' } })

    expect(saveBtn).not.toBeDisabled()
  })

  it('calls bulkCreateProducts and sends feedback when save selected is clicked', async () => {
    const bulkCreateSpy = vi.spyOn(aiService, 'bulkCreateProducts').mockResolvedValue({
      products: [{ id: 1001, name: 'Piattos Cheese 85g' }],
    })
    const feedbackSpy = vi.spyOn(aiService, 'sendFeedback').mockResolvedValue({
      success: true,
    })

    const onSavedMock = vi.fn()

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
        onSaved={onSavedMock}
      />
    )

    const saveBtn = screen.getByRole('button', { name: /save selected/i })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(bulkCreateSpy).toHaveBeenCalledTimes(1)
      expect(feedbackSpy).toHaveBeenCalledWith('scan_prod_test_456', expect.any(Array))
      expect(onSavedMock).toHaveBeenCalledTimes(1)
    })

    bulkCreateSpy.mockRestore()
    feedbackSpy.mockRestore()
  })

  it('redirects duplicate items to restock callback when requested', async () => {
    const onRestockMock = vi.fn()

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
        onRestockProduct={onRestockMock}
      />
    )

    const restockBtn = screen.getAllByText(/Restock instead/i)[0]
    fireEvent.click(restockBtn)

    expect(onRestockMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, name: 'C2 Green Tea Apple 500ml' })
    )
  })
})
