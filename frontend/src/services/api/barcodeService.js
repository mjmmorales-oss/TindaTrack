import { apiClient } from './apiClient.js'

export const barcodeService = {
  /**
   * Looks up product details locally or from Open Food Facts / open catalogs.
   * GET /api/barcode-lookup/{barcode}
   */
  async lookupBarcode(barcode) {
    const res = await apiClient.get(`/barcode-lookup/${encodeURIComponent(barcode)}`)
    return res?.data ?? res
  },
}

export default barcodeService
