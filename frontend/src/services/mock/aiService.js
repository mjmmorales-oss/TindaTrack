import { delay } from '@/lib/mockApi'
import { useMockDb } from '@/mocks/db'
import {
  normalizeBasketResult,
  normalizeProductScanResult,
} from '@/lib/aiContract.js'

let mockScans = []
let mockEmbeddings = []
let mockExperiments = [
  {
    id: 1,
    name: 'Controlled Basket Evaluation',
    type: 'basket_evaluation',
    notes: 'Standard evaluation of 20 baskets under normal store lighting',
    cases_count: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    cases: [
      {
        id: 1,
        case_number: 1,
        is_correct: true,
        latency_ms: 340,
        ground_truth: [
          { product_id: 1, name: 'Lucky Me Instant Pancit Canton Original 60g', quantity: 2 },
          { product_id: 2, name: 'Coca-Cola Regular 290ml', quantity: 1 },
        ],
        predicted: [
          { matched_product_id: 1, label: 'Lucky Me Instant Pancit Canton Original 60g', quantity: 2, confidence: 0.94 },
          { matched_product_id: 2, label: 'Coca-Cola Regular 290ml', quantity: 1, confidence: 0.91 },
        ],
        metrics: {
          precision: 1.0,
          recall: 1.0,
          mae: 0.0,
          is_exact_match: true,
          true_positives: 3,
        },
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 2,
        case_number: 2,
        is_correct: false,
        latency_ms: 385,
        ground_truth: [
          { product_id: 3, name: 'Datu Puti Soy Sauce 385ml', quantity: 1 },
          { product_id: 4, name: 'Silver Swan Vinegar 385ml', quantity: 2 },
        ],
        predicted: [
          { matched_product_id: 3, label: 'Datu Puti Soy Sauce 385ml', quantity: 1, confidence: 0.88 },
          { matched_product_id: 4, label: 'Silver Swan Vinegar 385ml', quantity: 1, confidence: 0.79 },
        ],
        metrics: {
          precision: 1.0,
          recall: 0.67,
          mae: 0.5,
          is_exact_match: false,
          true_positives: 2,
        },
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
]

export const aiService = {
  async getAiStatus() {
    await delay(50)
    return {
      enabled: true,
      research_mode: false,
      visual_search_enabled: true,
      save_scan_images: true,
      provider: 'mock',
      model: 'mock-gemini-2.5-flash',
      daily_scans_today: mockScans.length,
      daily_limit: 1500,
    }
  },

  async basketScan(imageBlob, _options = {}) {
    await delay(350)
    const { products } = useMockDb.getState()
    const activeProducts = (products || []).filter((p) => p.is_active && (p.stock_quantity ?? p.stock ?? 0) > 0)
    
    // Pick 2-3 deterministic products based on blob size or fallback
    const size = imageBlob?.size || 12345
    const p1 = activeProducts[size % Math.max(1, activeProducts.length)] || activeProducts[0]
    const p2 = activeProducts[(size + 3) % Math.max(1, activeProducts.length)] || activeProducts[1]

    const matched = []
    if (p1) {
      matched.push({
        id: 'det_1',
        matched_product_id: p1.id,
        matched_product: {
          id: p1.id,
          name: p1.name,
          barcode: p1.barcode,
          price: Number(p1.price || 0),
          stock: Number(p1.stock_quantity ?? p1.stock ?? 0),
          category_id: p1.category_id,
          category_name: p1.category?.name || 'General',
          image_url: p1.image_url,
        },
        label: p1.name,
        quantity: 1,
        confidence: 0.95,
        bounding_box: [100, 150, 450, 500],
        notes: 'Clearly identified',
      })
    }
    if (p2 && p2.id !== p1?.id) {
      matched.push({
        id: 'det_2',
        matched_product_id: p2.id,
        matched_product: {
          id: p2.id,
          name: p2.name,
          barcode: p2.barcode,
          price: Number(p2.price || 0),
          stock: Number(p2.stock_quantity ?? p2.stock ?? 0),
          category_id: p2.category_id,
          category_name: p2.category?.name || 'General',
          image_url: p2.image_url,
        },
        label: p2.name,
        quantity: 2,
        confidence: 0.88,
        bounding_box: [480, 200, 850, 600],
        notes: 'Group of 2 items',
      })
    }

    const unmatched = [
      {
        id: 'det_3',
        label: 'Kopiko Blanca 30g Sachet',
        quantity: 1,
        confidence: 0.72,
        bounding_box: [200, 550, 600, 900],
        notes: 'Unmatched brand packaging',
      },
    ]

    const scanId = 'scan_mock_' + Math.random().toString(36).slice(2, 9)
    const scanRecord = {
      id: scanId,
      scan_type: 'basket',
      detected_count: matched.length + unmatched.length,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      latency_ms: 350,
      model_used: 'mock-gemini-2.5-flash',
      status: 'completed',
      created_at: new Date().toISOString(),
      items: matched,
      unmatched_items: unmatched,
    }
    mockScans.unshift(scanRecord)

    return normalizeBasketResult({
      scan_id: scanId,
      detected_count: scanRecord.detected_count,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      items: matched,
      unmatched_items: unmatched,
      latency_ms: 350,
      model: 'mock-gemini-2.5-flash',
    })
  },

  async productScan(imageBlob, options = {}) {
    await delay(350)
    const candidates = [
      {
        id: 'cand_1',
        suggested_name: 'Piattos Cheese 85g',
        suggested_barcode: '4800016644208',
        suggested_category: 'Snacks',
        category_id: 2,
        suggested_price: 38.0,
        suggested_cost: 32.5,
        estimated_count: 5,
        confidence: 0.94,
        bounding_box: [120, 100, 480, 550],
        is_duplicate: false,
      },
      {
        id: 'cand_2',
        suggested_name: 'C2 Green Tea Apple 500ml',
        suggested_barcode: '4800016052300',
        suggested_category: 'Drinks',
        category_id: 1,
        suggested_price: 25.0,
        suggested_cost: 21.0,
        estimated_count: 3,
        confidence: 0.91,
        bounding_box: [520, 150, 880, 700],
        is_duplicate: false,
      },
    ]

    const scanId = 'scan_prod_' + Math.random().toString(36).slice(2, 9)
    return normalizeProductScanResult(
      {
        scan_id: scanId,
        detected_count: candidates.length,
        products: candidates,
        latency_ms: 350,
        model: 'mock-gemini-2.5-flash',
      },
      options.categories || [],
    )
  },

  async sendFeedback(scanId, payload) {
    await delay(60)
    const lines = Array.isArray(payload) ? payload : (payload?.lines || [])
    return {
      success: true,
      message: 'Feedback recorded successfully',
      scan_id: scanId,
      recorded_lines: lines.length,
    }
  },

  async listScans(params = {}) {
    await delay(60)
    const page = Number(params?.page) || 1
    const limit = Number(params?.limit) || 20
    const start = (page - 1) * limit
    const paged = mockScans.slice(start, start + limit)
    return {
      data: paged,
      meta: {
        current_page: page,
        per_page: limit,
        total: mockScans.length,
        last_page: Math.ceil(mockScans.length / limit) || 1,
      },
    }
  },

  async getScanImage(_scanId) {
    await delay(60)
    // Return empty svg image blob for tests/mocks
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#e2e8f0"/></svg>'
    return new Blob([svg], { type: 'image/svg+xml' })
  },

  async getMetrics(_params = {}) {
    await delay(80)
    return {
      total_scans: Math.max(12, mockScans.length),
      basket_scans: 8,
      product_scans: 4,
      avg_latency_ms: 365,
      detection_accuracy_rate: 0.912,
      accepted_without_edit_rate: 0.84,
      daily_breakdown: [
        { date: '2026-10-14', count: 3, accuracy: 0.89 },
        { date: '2026-10-15', count: 4, accuracy: 0.92 },
        { date: '2026-10-16', count: 5, accuracy: 0.94 },
      ],
      hourly_distribution: [
        { hour: '08:00', count: 1 },
        { hour: '10:00', count: 3 },
        { hour: '14:00', count: 5 },
        { hour: '18:00', count: 3 },
      ],
      corrections: {
        quantity_changed: 2,
        item_removed: 1,
        item_added: 1,
      },
    }
  },

  async exportMetricsCsv(_params = {}) {
    await delay(50)
    return 'date,total_scans,accuracy,avg_latency_ms\n2026-10-14,3,0.89,350\n2026-10-15,4,0.92,370\n2026-10-16,5,0.94,365\n'
  },

  async getEmbeddings(params = {}) {
    await delay(50)
    const productId = params?.product_id
    if (productId) {
      return mockEmbeddings.filter((e) => String(e.product_id) === String(productId))
    }
    return mockEmbeddings
  },

  async saveEmbedding(productId, data) {
    await delay(50)
    const item = {
      id: mockEmbeddings.length + 1,
      product_id: Number(productId),
      vector: data.vector || [],
      model: data.model || 'Xenova/clip-vit-base-patch32',
      created_at: new Date().toISOString(),
    }
    mockEmbeddings.push(item)
    return item
  },

  async deleteEmbedding(productId, id) {
    await delay(50)
    mockEmbeddings = mockEmbeddings.filter(
      (e) => !(String(e.product_id) === String(productId) && String(e.id) === String(id))
    )
    return { success: true }
  },

  async bulkCreateProducts(products) {
    await delay(120)
    const state = useMockDb.getState()
    const { addProduct, nextIds, categories = [] } = state
    const created = []
    for (const p of products) {
      const id = nextIds ? nextIds.product++ : Date.now()
      const category = categories.find((c) => c.id === Number(p.category_id))
      const code = category?.code || 'GEN'
      const prefix = `TT-${code}`
      let maxNum = 0
      const allCurrent = [...(state.products || []), ...created]
      allCurrent.forEach((prod) => {
        if (prod.sku && prod.sku.startsWith(`${prefix}-`)) {
          const m = prod.sku.match(new RegExp(`^${prefix}-(\\d+)$`))
          if (m) {
            const num = parseInt(m[1], 10)
            if (num > maxNum) maxNum = num
          }
        }
      })
      const sku = p.sku || `${prefix}-${String(maxNum + 1).padStart(3, '0')}`

      const newProduct = {
        id,
        name: p.name,
        sku,
        barcode: p.barcode || null,
        category_id: p.category_id ? Number(p.category_id) : null,
        price: Number(p.price || 0),
        cost: Number(p.cost || 0),
        stock: Number(p.stock || p.initial_stock || 0),
        stock_quantity: Number(p.stock || p.initial_stock || 0),
        min_stock: Number(p.min_stock || 5),
        is_active: true,
        created_at: new Date().toISOString(),
      }
      if (typeof addProduct === 'function') {
        addProduct(newProduct)
      } else {
        state.products = [...(state.products || []), newProduct]
      }
      created.push(newProduct)
    }
    return {
      message: `${created.length} products created successfully.`,
      products: created,
    }
  },

  async getExperiments() {
    await delay(50)
    return {
      data: mockExperiments.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        notes: e.notes,
        cases_count: e.cases?.length || 0,
        created_at: e.created_at,
      })),
    }
  },

  async getExperiment(id) {
    await delay(50)
    const exp = mockExperiments.find((e) => String(e.id) === String(id))
    if (!exp) {
      throw new Error('Experiment not found')
    }
    return {
      data: {
        ...exp,
        cases_count: exp.cases?.length || 0,
      },
    }
  },

  async createExperiment(data) {
    await delay(50)
    const newExp = {
      id: mockExperiments.length + 1,
      name: data.name,
      type: data.type || 'basket_evaluation',
      notes: data.notes || '',
      cases_count: 0,
      cases: [],
      created_at: new Date().toISOString(),
    }
    mockExperiments.unshift(newExp)
    return {
      data: newExp,
      message: 'Experiment created successfully.',
    }
  },

  async runExperimentCase(id, _imageBlob, groundTruth) {
    await delay(300)
    const exp = mockExperiments.find((e) => String(e.id) === String(id))
    if (!exp) {
      throw new Error('Experiment not found')
    }

    const gtItems = Array.isArray(groundTruth)
      ? groundTruth
      : typeof groundTruth === 'string'
        ? JSON.parse(groundTruth)
        : []

    // Build predicted items from mock basketScan logic
    const { products } = useMockDb.getState()
    const activeProducts = (products || []).filter((p) => p.is_active)

    const predicted = gtItems.map((gt, idx) => {
      const prod = activeProducts.find((p) => String(p.id) === String(gt.product_id || gt.id))
      return {
        matched_product_id: prod?.id || gt.product_id || idx + 1,
        label: prod?.name || gt.name || 'Sample Product',
        quantity: gt.quantity || 1,
        confidence: 0.92,
      }
    })

    const caseNumber = (exp.cases?.length || 0) + 1
    const newCase = {
      id: Date.now(),
      case_number: caseNumber,
      is_correct: true,
      latency_ms: 320,
      ground_truth: gtItems,
      predicted,
      metrics: {
        precision: 1.0,
        recall: 1.0,
        mae: 0.0,
        is_exact_match: true,
        true_positives: gtItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0),
      },
      created_at: new Date().toISOString(),
    }

    exp.cases = exp.cases || []
    exp.cases.push(newCase)
    exp.cases_count = exp.cases.length

    return {
      data: newCase,
      message: 'Experiment case evaluated and recorded.',
    }
  },

  async resetExperiment(id) {
    await delay(50)
    const exp = mockExperiments.find((e) => String(e.id) === String(id))
    if (exp) {
      exp.cases = []
      exp.cases_count = 0
    }
    return {
      message: 'Experiment cases cleared successfully.',
    }
  },

  async exportExperimentCsv(id) {
    await delay(50)
    const exp = mockExperiments.find((e) => String(e.id) === String(id))
    const cases = exp?.cases || []
    let csv = 'case_number,is_correct,latency_ms,precision,recall,mae,ground_truth_count,predicted_count,created_at\n'
    for (const c of cases) {
      const m = c.metrics || {}
      csv += `${c.case_number},${c.is_correct ? 1 : 0},${c.latency_ms},${m.precision ?? 1},${m.recall ?? 1},${m.mae ?? 0},${c.ground_truth?.length || 0},${c.predicted?.length || 0},${c.created_at}\n`
    }
    return csv
  },
}

export default aiService
