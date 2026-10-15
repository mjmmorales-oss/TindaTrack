import { Barcode } from '@/lib/barcode'
import { useMockDb } from '@/mocks/db'
import { ApiError, delay } from '@/lib/mockApi'

// Online catalog fixtures (Open Food Facts / Open Products Facts)
const ONLINE_CATALOG_FIXTURES = {
  // Online hit 1: Bear Brand Powdered Milk Drink 33g
  '4800016644800': {
    found: true,
    source: 'openfoodfacts',
    name: 'Bear Brand Fortified Powdered Milk Drink',
    brand: 'Bear Brand',
    size: '33g',
    image_url: 'https://images.openfoodfacts.org/images/products/480/001/664/4800/front_en.jpg',
    suggested_category_id: 2,
    attribution: 'Data from Open Food Facts (ODbL)',
  },
  // Online hit 2: Nutella Hazelnut Spread 350g
  '3017620422003': {
    found: true,
    source: 'openfoodfacts',
    name: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    size: '350g',
    image_url: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.jpg',
    suggested_category_id: 4,
    attribution: 'Data from Open Food Facts (ODbL)',
  },
  // Online hit 3: Lucky Me! Instant Pancit Canton Kalamansi 60g
  '4800016054111': {
    found: true,
    source: 'openfoodfacts',
    name: 'Lucky Me! Instant Pancit Canton Kalamansi',
    brand: 'Lucky Me!',
    size: '60g',
    image_url: 'https://images.openfoodfacts.org/images/products/480/001/605/4111/front_en.jpg',
    suggested_category_id: 3,
    attribution: 'Data from Open Food Facts (ODbL)',
  },
  // Online hit 4: Safeguard Pure White Soap 130g
  '4800110025543': {
    found: true,
    source: 'openproductsfacts',
    name: 'Safeguard Pure White Bar Soap',
    brand: 'Safeguard',
    size: '130g',
    image_url: 'https://images.openfoodfacts.org/images/products/480/011/002/5543/front_en.jpg',
    suggested_category_id: 8,
    attribution: 'Data from Open Products Facts (ODbL)',
  },
}

function getCurrentUserRole() {
  try {
    const raw = localStorage.getItem('tindatrack_user')
    if (raw) {
      const user = JSON.parse(raw)
      return user?.role || 'owner'
    }
  } catch {
    // fallback
  }
  return 'owner'
}

export const barcodeService = {
  /**
   * Looks up product locally or via simulated Open Food Facts catalog.
   */
  async lookupBarcode(barcode) {
    await delay(120)

    const normalized = Barcode.normalize(barcode)
    if (!Barcode.isAcceptable(normalized)) {
      throw new ApiError(422, {
        message: 'Invalid barcode format.',
        errors: { barcode: ['Invalid barcode format.'] },
      })
    }

    const role = getCurrentUserRole()
    const isCashier = role === 'cashier'

    // 1. Check local products in mock DB
    const { products } = useMockDb.getState()
    const local = (products || []).find((p) => p.is_active && p.barcode === normalized)

    if (local) {
      return {
        barcode: normalized,
        local_product: {
          ...local,
          stock: local.stock_quantity,
        },
        catalog: null,
      }
    }

    // Cashiers only receive local products, never external catalog
    if (isCashier) {
      return {
        barcode: normalized,
        local_product: null,
        catalog: null,
      }
    }

    // 2. Check online catalog fixtures
    const fixture = ONLINE_CATALOG_FIXTURES[normalized]
    if (fixture) {
      return {
        barcode: normalized,
        local_product: null,
        catalog: fixture,
      }
    }

    // 3. Not found anywhere
    return {
      barcode: normalized,
      local_product: null,
      catalog: {
        found: false,
        source: null,
        name: null,
        brand: null,
        size: null,
        image_url: null,
        suggested_category_id: null,
        attribution: null,
      },
    }
  },
}

export default barcodeService
