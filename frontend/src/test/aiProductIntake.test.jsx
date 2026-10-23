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

describe('AiProductReviewTable (v2.1.0 G4 & G8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const mockScanResult = {
    scan_id: 'scan_prod_test_456',
    detected_count: 2,
    more_than_five: false,
    products: [
      {
        id: 'cand_1',
        suggested_name: 'Piattos Cheese 85g',
        suggested_barcode: '4800016644208',
        suggested_category_id: 2,
        brand: "Jack 'n Jill",
        size: '85g',
        unit: 'pc',
        estimated_count: 2,
        suggested_price: 38.0,
        confidence: 0.94,
        bounding_box: [120, 100, 480, 550],
        is_duplicate: false,
      },
      {
        id: 'cand_2',
        suggested_name: 'C2 Green Tea Apple 500ml',
        suggested_barcode: '4800016052300',
        suggested_category_id: 1,
        brand: 'Universal Robina',
        size: '500ml',
        unit: 'bottle',
        estimated_count: 3,
        suggested_price: 25.0,
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

  it('starting stock defaults to estimated_count || 1 (not 5)', () => {
    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
      />
    )

    // Piattos estimated_count was 2, so starting stock input is 2
    expect(screen.getAllByDisplayValue('2')[0]).toBeInTheDocument()
    // C2 estimated_count was 3, so starting stock input is 3
    expect(screen.getAllByDisplayValue('3')[0]).toBeInTheDocument()
  })

  it('price starts empty and is required before saving', () => {
    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
      />
    )

    // Price input must start empty despite suggested_price in AI result
    const priceInputs = screen.getAllByPlaceholderText('0.00')
    expect(priceInputs[0].value).toBe('')

    // Save ready items button is disabled when no ready items have valid price
    const saveBtn = screen.getByRole('button', { name: /save ready items/i })
    expect(saveBtn).toBeDisabled()

    // Entering a valid price enables saving for that row
    fireEvent.change(priceInputs[0], { target: { value: '38.50' } })
    expect(saveBtn).not.toBeDisabled()
  })

  it('category is matched by id and has no silent default', () => {
    const scanWithNoCategory = {
      scan_id: 'scan_nocat',
      products: [
        {
          id: 'cand_nocat',
          suggested_name: 'Unknown Item',
          suggested_category_id: null,
          category_id: null,
          estimated_count: 1,
          is_duplicate: false,
        },
      ],
    }

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={scanWithNoCategory}
      />
    )

    const selects = screen.getAllByRole('combobox')
    // Category select should be empty (no silent default)
    expect(selects[0].value).toBe('')
  })

  it('the SKU is not an input and shows auto-generated notice', () => {
    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
      />
    )

    // Verify there is no SKU input in the form
    expect(screen.queryByPlaceholderText(/sku/i)).not.toBeInTheDocument()

    // Expand Advanced section
    const advancedBtns = screen.getAllByText(/advanced/i)
    fireEvent.click(advancedBtns[0])

    // Verify read-only notice is present
    expect(screen.getAllByText(/SKU: auto-generated on save/i)[0]).toBeInTheDocument()
  })

  it('a duplicate row starts unchecked and shows Add stock instead', () => {
    const onRestockMock = vi.fn()

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
        onRestockProduct={onRestockMock}
      />
    )

    // Checkboxes: 0 is select-all, 1 is Piattos (checked), 2 is C2 duplicate (unchecked)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[1]).toBeChecked()
    expect(checkboxes[2]).not.toBeChecked()

    // Banner displays Already in catalog & Looks like
    expect(screen.getAllByText(/Already in catalog/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Already in catalog/i)[0].textContent).toMatch(/looks like|mukhang/i)

    // Restock button is present and triggers restock callback
    const restockBtn = screen.getAllByText(/Add stock instead/i)[0]
    fireEvent.click(restockBtn)

    expect(onRestockMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, name: 'C2 Green Tea Apple 500ml' }),
      3
    )
  })

  it('"Save ready items" sends only ready rows with reorder_level, brand and size', async () => {
    const bulkCreateSpy = vi.spyOn(aiService, 'bulkCreateProducts').mockResolvedValue({
      data: [{ id: 101, name: 'Piattos Cheese 85g' }],
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

    // Fill price for Piattos so row 1 becomes Ready
    const priceInputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(priceInputs[0], { target: { value: '38.00' } })

    const saveBtn = screen.getByRole('button', { name: /save ready items/i })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(bulkCreateSpy).toHaveBeenCalledTimes(1)
      const sentPayload = bulkCreateSpy.mock.calls[0][0]
      expect(sentPayload).toHaveLength(1)
      expect(sentPayload[0]).toEqual(
        expect.objectContaining({
          name: 'Piattos Cheese 85g',
          brand: "Jack 'n Jill",
          size: '85g',
          unit: 'pc',
          category_id: 2,
          price: 38.0,
          reorder_level: 5,
        })
      )
    })
  })

  it('a 422 error maps to the correct row with inline errors', async () => {
    const error422 = new Error('The given data was invalid.')
    error422.errors = {
      'products.0.price': ['The price must be at least 0.01.'],
    }
    vi.spyOn(aiService, 'bulkCreateProducts').mockRejectedValue(error422)

    renderWithClient(
      <AiProductReviewTable
        open={true}
        onOpenChange={() => {}}
        scanResult={mockScanResult}
      />
    )

    // Set price for Piattos and save
    const priceInputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(priceInputs[0], { target: { value: '38.00' } })

    const saveBtn = screen.getByRole('button', { name: /save ready items/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('The price must be at least 0.01.')).toBeInTheDocument()
    })
  })
})
