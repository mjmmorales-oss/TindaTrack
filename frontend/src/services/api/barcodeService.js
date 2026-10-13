import { apiClient } from './apiClient.js'

export const barcodeService = {
  /**
   * Looks up product details locally or from Open Food Facts / open catalogs.
   * GET /api/barcode-lookup/{barcode}
   */
  async lookupBarcode(barcode) {
    return apiClient.get(`/barcode-lookup/${encodeURIComponent(barcode)}`)
  },
}

export default barcodeService
