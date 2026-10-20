import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderRoute'
import { useMockDb } from '@/mocks/db'
import { setAutoBarcodeLookup } from '@/lib/barcodeSettings'
import { Barcode } from '@/lib/barcode'
import mockProductService from '@/services/mock/productService'
import mockBarcodeService from '@/services/mock/barcodeService'
import { AddByBarcodeDialog } from '@/features/products/components/AddByBarcodeDialog'

/**
 * v2.2 A2 regression: a deleted product's barcode must be reusable, and the
 * lookup must offer "Restore it" instead of letting the save fail with
 * "The barcode has already been taken". Mock mirrors the Laravel behaviour.
 */
describe('A2: archived products free their barcode and can be restored', () => {
  let product

  beforeEach(() => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
    setAutoBarcodeLookup(true)
    // Give one product a known-valid EAN-13 that is not in the online fixtures.
    const first = useMockDb.getState().products[0]
    useMockDb.getState().setProducts((prev) =>
      prev.map((p) => (p.id === first.id ? { ...p, barcode: '4801981118502', is_active: true } : p)),
    )
    product = useMockDb.getState().products.find((p) => p.id === first.id)
    expect(Barcode.isAcceptable(product.barcode)).toBe(true)
  })

  it('delete moves barcode/SKU to deleted_* and frees them', async () => {
    await mockProductService.remove(product.id)
    const { products, archivedProducts } = useMockDb.getState()

    expect(products.some((p) => p.id === product.id)).toBe(false)
    const row = archivedProducts.find((p) => p.id === product.id)
    expect(row).toMatchObject({
      archived: true,
      barcode: null,
      sku: null,
      deleted_barcode: product.barcode,
      deleted_sku: product.sku,
    })

    const lookup = await mockBarcodeService.lookupBarcode(product.barcode)
    expect(lookup.local_product).toBeNull()
    expect(lookup.archived_product?.id).toBe(product.id)
  })

  it('restore gives the barcode back and lists archived only for the owner', async () => {
    await mockProductService.remove(product.id)

    const archivedList = await mockProductService.list({ archived: 1 })
    expect(archivedList.data.map((p) => p.id)).toContain(product.id)

    const res = await mockProductService.restore(product.id)
    expect(res.barcode_restored).toBe(true)
    expect(res.data).toMatchObject({ id: product.id, barcode: product.barcode, sku: product.sku, archived: false })

    localStorage.setItem('tindatrack_user', JSON.stringify({ id: 2, role: 'cashier' }))
    await expect(mockProductService.list({ archived: 1 })).rejects.toMatchObject({ status: 403 })
    await expect(mockProductService.restore(product.id)).rejects.toMatchObject({ status: 403 })
  })

  it('Add by barcode shows Restore it / Add as new for an archived barcode', async () => {
    await mockProductService.remove(product.id)
    const onEditProduct = vi.fn()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <AddByBarcodeDialog
        open={true}
        onOpenChange={onOpenChange}
        categories={useMockDb.getState().categories}
        initialBarcode={product.barcode}
        onEditProduct={onEditProduct}
      />,
      { role: 'owner' },
    )

    const restoreBtn = await screen.findByRole('button', { name: /Restore it|Ibalik ito/i })
    expect(screen.getByRole('button', { name: /Add as new|Idagdag bilang bago/i })).toBeInTheDocument()

    fireEvent.click(restoreBtn)
    await waitFor(() => expect(onEditProduct).toHaveBeenCalled())
    expect(onEditProduct.mock.calls[0][0]).toMatchObject({ id: product.id, barcode: product.barcode })
    expect(useMockDb.getState().products.some((p) => p.id === product.id)).toBe(true)
  })

  it('Add as new continues to the add form with the freed barcode', async () => {
    await mockProductService.remove(product.id)

    renderWithProviders(
      <AddByBarcodeDialog
        open={true}
        onOpenChange={vi.fn()}
        categories={useMockDb.getState().categories}
        initialBarcode={product.barcode}
      />,
      { role: 'owner' },
    )

    fireEvent.click(await screen.findByRole('button', { name: /Add as new|Idagdag bilang bago/i }))
    await waitFor(() => expect(screen.getByLabelText(/Selling Price|Presyo ng Benta/i)).toBeInTheDocument())
  })
})
