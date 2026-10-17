/**
 * Single source of truth for normalizing AI scan responses between backend and frontend.
 * Provides bidirectional translation between Laravel backend shapes and React component expectations.
 */

/**
 * Normalizes an AI basket scan response (real API or mock).
 * Guarantees consistent shape for BasketReviewSheet and POS consumption.
 *
 * @param {object} rawResponse - Raw response from /api/ai/basket-scan or mock
 * @returns {object} Normalized basket scan result
 */
export function normalizeBasketResult(rawResponse) {
  const raw = rawResponse || {}
  const scanId = raw.scan_id ?? raw.id ?? null

  const items = (raw.items || []).map((item, idx) => {
    const rawProduct = item.product ?? item.matched_product ?? null
    const matchedProductId =
      item.product_id ?? item.matched_product_id ?? rawProduct?.id ?? null

    const matchedProduct = rawProduct
      ? {
          id: rawProduct.id ?? matchedProductId,
          name: rawProduct.name ?? item.label ?? '',
          price: Number(rawProduct.price ?? 0),
          stock: Number(rawProduct.stock_quantity ?? rawProduct.stock ?? 0),
          image_url: rawProduct.image_url ?? null,
          unit: rawProduct.unit ?? 'pc',
          barcode: rawProduct.barcode ?? null,
          category_id: rawProduct.category_id ?? null,
          category_name: rawProduct.category?.name ?? rawProduct.category_name ?? '',
        }
      : null

    const label = rawProduct?.name ?? item.label ?? ''
    const quantity = Math.max(1, Number(item.quantity) || 1)
    const confidence = Number(item.confidence ?? 0.8)
    const boundingBox = item.box_2d ?? item.bounding_box ?? null

    return {
      id: item.id ? String(item.id) : `item_${matchedProductId || idx}_${idx}`,
      matched_product_id: matchedProductId,
      matched_product: matchedProduct,
      label,
      quantity,
      confidence,
      confidence_bucket:
        item.confidence_bucket ??
        (confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'check' : 'low'),
      bounding_box: boundingBox,
      boxes: item.boxes ?? (boundingBox ? [boundingBox] : []),
      exceeds_stock: Boolean(
        item.exceeds_stock ?? (matchedProduct && quantity > matchedProduct.stock),
      ),
      original_product_id: item.original_product_id ?? matchedProductId,
      original_quantity: item.original_quantity ?? quantity,
      is_manual: Boolean(item.is_manual ?? false),
    }
  })

  const rawUnmatched = raw.unmatched ?? raw.unmatched_items ?? []
  const unmatchedItems = rawUnmatched.map((u, idx) => ({
    id: u.id ? String(u.id) : `unmatched_${idx}`,
    label: u.label || 'Unmatched item',
    quantity: Math.max(1, Number(u.quantity) || 1),
    confidence: Number(u.confidence ?? 0.7),
    bounding_box: u.box_2d ?? u.bounding_box ?? null,
    original_quantity: Math.max(1, Number(u.quantity) || 1),
    original_label: u.label || 'Unmatched item',
  }))

  return {
    scan_id: scanId,
    provider: raw.provider ?? 'mock',
    model: raw.model ?? '',
    latency_ms: Number(raw.latency_ms ?? raw.processing_time_ms ?? 0),
    catalog_size: Number(raw.catalog_size ?? 0),
    catalog_truncated: Boolean(raw.catalog_truncated ?? false),
    items,
    unmatched_items: unmatchedItems,
    raw: raw.raw ?? null,
  }
}

/**
 * Normalizes an AI product intake scan response (real API or mock).
 * Guarantees consistent shape for AiProductReviewTable.
 *
 * @param {object} rawResponse - Raw response from /api/ai/product-scan or mock
 * @param {Array<object>} [categories=[]] - Available store categories for fallback matching
 * @returns {object} Normalized product scan result
 */
export function normalizeProductScanResult(rawResponse, categories = []) {
  const raw = rawResponse || {}
  const scanId = raw.scan_id ?? raw.id ?? null
  const rawProducts = raw.products || raw.candidates || []

  const products = rawProducts.map((p, idx) => {
    const suggestedName = p.name ?? p.suggested_name ?? ''
    const suggestedBarcode = p.barcode_text ?? p.suggested_barcode ?? p.barcode ?? ''

    // Match category: by id if valid, fallback by string name match
    let suggestedCategoryId = p.category_id ?? p.suggested_category_id ?? null
    const catNameCandidate = p.category?.name ?? p.suggested_category ?? p.category
    if (!suggestedCategoryId && typeof catNameCandidate === 'string' && categories.length > 0) {
      const match = categories.find(
        (c) => c.name?.toLowerCase() === catNameCandidate.toLowerCase(),
      )
      if (match) {
        suggestedCategoryId = match.id
      }
    }
    // If category_id given but categories array has it, ensure it's a number
    if (suggestedCategoryId !== null && suggestedCategoryId !== undefined) {
      suggestedCategoryId = Number(suggestedCategoryId)
    }

    // Suggested price: leave empty string if not explicitly defined so owner types it in (NEVER 0)
    let suggestedPrice = ''
    if (p.price !== undefined && p.price !== null && p.price !== '') {
      suggestedPrice = Number(p.price)
    } else if (p.suggested_price !== undefined && p.suggested_price !== null && p.suggested_price !== '') {
      suggestedPrice = Number(p.suggested_price)
    }

    const estimatedCount = Math.max(1, Number(p.estimated_count ?? p.quantity ?? 1))
    const confidence = Number(p.confidence ?? 0.8)
    const boundingBox = p.box_2d ?? p.bounding_box ?? null
    const isDuplicate = Boolean(p.duplicate_of ?? p.is_duplicate ?? false)
    const possibleDuplicateProduct =
      p.duplicate_of ?? p.duplicate_product ?? p.possible_duplicate_product ?? null

    const enrichment = p.enrichment || {}
    const officialName = enrichment.name ?? p.official_name ?? null
    const onlineImageUrl = enrichment.image_url ?? p.online_image_url ?? null

    return {
      id: p.id ? String(p.id) : `prod_${idx}_${Date.now()}`,
      suggested_name: suggestedName,
      brand: p.brand ?? enrichment.brand ?? '',
      size: p.size ?? enrichment.size ?? '',
      suggested_category_id: suggestedCategoryId,
      suggested_barcode: suggestedBarcode,
      suggested_price: suggestedPrice,
      suggested_cost: p.suggested_cost ?? p.cost_price ?? '',
      estimated_count: estimatedCount,
      confidence,
      bounding_box: boundingBox,
      is_duplicate: isDuplicate,
      possible_duplicate_product: possibleDuplicateProduct,
      official_name: officialName,
      online_image_url: onlineImageUrl,
    }
  })

  return {
    scan_id: scanId,
    provider: raw.provider ?? 'mock',
    model: raw.model ?? '',
    latency_ms: Number(raw.latency_ms ?? raw.processing_time_ms ?? 0),
    products,
    raw: raw.raw ?? null,
  }
}

/**
 * Builds feedback payload lines matching the backend Laravel AiScanFeedback validation:
 * - line_type: 'item' | 'unmatched' | 'missed'
 * - action: 'accepted' | 'qty_changed' | 'product_changed' | 'removed' | 'added_manually'
 *
 * @param {Array<object>} confirmedItems - Items confirmed by cashier in BasketReviewSheet
 * @param {Array<object>} unmatchedItems - Remaining unmatched items
 * @param {object} originalScan - Original normalized basket scan result
 * @returns {{ scan_id: string|number|null, lines: Array<object> }}
 */
export function buildBasketFeedbackLines(confirmedItems = [], unmatchedItems = [], originalScan = null) {
  const lines = []
  const originalItems = originalScan?.items || []

  // 1. Process original detected items
  for (const orig of originalItems) {
    const confirmed = confirmedItems.find((ci) => ci.id === orig.id)

    if (!confirmed) {
      // Item was removed from basket
      lines.push({
        line_type: 'item',
        suggested_product_id: orig.original_product_id ?? orig.matched_product_id ?? null,
        suggested_quantity: orig.original_quantity ?? orig.quantity ?? 1,
        confidence: orig.confidence ?? null,
        final_product_id: null,
        final_quantity: 0,
        action: 'removed',
      })
    } else if (confirmed.matched_product_id !== (orig.original_product_id ?? orig.matched_product_id)) {
      // Swapped to a different product
      lines.push({
        line_type: 'item',
        suggested_product_id: orig.original_product_id ?? orig.matched_product_id ?? null,
        suggested_quantity: orig.original_quantity ?? orig.quantity ?? 1,
        confidence: orig.confidence ?? null,
        final_product_id: confirmed.matched_product_id,
        final_quantity: confirmed.quantity,
        action: 'product_changed',
      })
    } else if (confirmed.quantity !== (orig.original_quantity ?? orig.quantity)) {
      // Quantity modified
      lines.push({
        line_type: 'item',
        suggested_product_id: orig.original_product_id ?? orig.matched_product_id ?? null,
        suggested_quantity: orig.original_quantity ?? orig.quantity ?? 1,
        confidence: orig.confidence ?? null,
        final_product_id: confirmed.matched_product_id,
        final_quantity: confirmed.quantity,
        action: 'qty_changed',
      })
    } else {
      // Accepted as detected
      lines.push({
        line_type: 'item',
        suggested_product_id: orig.original_product_id ?? orig.matched_product_id ?? null,
        suggested_quantity: orig.original_quantity ?? orig.quantity ?? 1,
        confidence: orig.confidence ?? null,
        final_product_id: confirmed.matched_product_id,
        final_quantity: confirmed.quantity,
        action: 'accepted',
      })
    }
  }

  // 2. Process manual additions (missed by AI)
  for (const item of confirmedItems) {
    if (item.is_manual) {
      lines.push({
        line_type: 'missed',
        suggested_product_id: null,
        suggested_quantity: 0,
        confidence: null,
        final_product_id: item.matched_product_id,
        final_quantity: item.quantity,
        action: 'added_manually',
      })
    }
  }

  // 3. Process unmatched items (either resolved into confirmed or discarded)
  const origUnmatched = originalScan?.unmatched_items || []
  for (const origU of origUnmatched) {
    const resolvedInConfirmed = confirmedItems.find((ci) => ci.id === origU.id)
    if (resolvedInConfirmed) {
      lines.push({
        line_type: 'unmatched',
        suggested_product_id: null,
        suggested_quantity: origU.quantity ?? 1,
        confidence: origU.confidence ?? null,
        final_product_id: resolvedInConfirmed.matched_product_id,
        final_quantity: resolvedInConfirmed.quantity,
        action: 'product_changed',
      })
    } else {
      lines.push({
        line_type: 'unmatched',
        suggested_product_id: null,
        suggested_quantity: origU.quantity ?? 1,
        confidence: origU.confidence ?? null,
        final_product_id: null,
        final_quantity: 0,
        action: 'removed',
      })
    }
  }

  return {
    scan_id: originalScan?.scan_id ?? null,
    lines,
  }
}

/**
 * Builds product intake feedback payload lines.
 *
 * @param {Array<object>} reviewedRows - Reviewed rows from AiProductReviewTable
 * @param {object} originalScan - Original normalized product scan result
 * @returns {{ scan_id: string|number|null, lines: Array<object> }}
 */
export function buildProductFeedbackLines(reviewedRows = [], originalScan = null) {
  const lines = reviewedRows.map((row) => {
    const isRemoved = row.selected === false
    const nameChanged = row.original_name && row.name !== row.original_name
    const catChanged =
      row.original_category_id !== undefined &&
      row.category_id !== undefined &&
      String(row.category_id) !== String(row.original_category_id)

    let action = 'accepted'
    if (isRemoved) {
      action = 'removed'
    } else if (row.is_duplicate || nameChanged || catChanged) {
      action = 'product_changed'
    }

    return {
      line_type: 'item',
      suggested_product_id:
        row.possible_duplicate?.id ??
        row.possible_duplicate_product?.id ??
        null,
      suggested_quantity: Number(row.estimated_count ?? row.stock ?? 1),
      confidence: Number(row.confidence ?? 0.8),
      final_product_id: row.created_product_id ?? null,
      final_quantity: isRemoved
        ? 0
        : Number(row.stock_quantity ?? row.stock ?? row.estimated_count ?? 1),
      action,
    }
  })

  return {
    scan_id: originalScan?.scan_id ?? null,
    lines,
  }
}
