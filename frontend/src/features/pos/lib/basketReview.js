/**
 * Pure helpers for the AI Basket review (shared by the sheet and the POS page).
 * A "draft" is the cashier's working copy: { confirmedItems, unmatchedItems }.
 */

/**
 * Review rows from a normalized basket result (normalizeBasketResult).
 *
 * @param {object|null} scanResult
 * @returns {{ confirmedItems: object[], unmatchedItems: object[] }}
 */
export function toReviewDraft(scanResult) {
  const confirmedItems = (scanResult?.items || []).map((item, idx) => ({
    id: item.id || `item_${idx}`,
    matched_product_id: item.matched_product_id,
    matched_product: item.matched_product,
    label: item.label,
    quantity: Math.max(1, Number(item.quantity) || 1),
    confidence: item.confidence || 0.9,
    bounding_box: item.bounding_box || null,
    original_product_id: item.matched_product_id,
    original_quantity: item.quantity,
    is_manual: false,
  }))

  const unmatchedItems = (scanResult?.unmatched_items || []).map((item, idx) => ({
    id: item.id || `unmatched_${idx}`,
    label: item.label,
    quantity: Math.max(1, Number(item.quantity) || 1),
    confidence: item.confidence || 0.7,
    bounding_box: item.bounding_box || null,
  }))

  return { confirmedItems, unmatchedItems }
}

/**
 * Adds a new scan to an existing draft: same product → quantities summed (keeping the
 * cashier's edits on that row), new products appended, unmatched detections appended.
 *
 * @param {{ confirmedItems: object[], unmatchedItems: object[] }} draft
 * @param {object} scanResult
 */
export function mergeIntoDraft(draft, scanResult) {
  const incoming = toReviewDraft(scanResult)
  const stamp = Date.now()
  const confirmedItems = (draft?.confirmedItems || []).map((row) => ({ ...row }))

  for (const row of incoming.confirmedItems) {
    const existing = confirmedItems.find(
      (r) => r.matched_product_id != null && Number(r.matched_product_id) === Number(row.matched_product_id),
    )
    if (existing) {
      existing.quantity += row.quantity
    } else {
      confirmedItems.push({ ...row, id: `${row.id}_m${stamp}` })
    }
  }

  return {
    confirmedItems,
    unmatchedItems: [
      ...(draft?.unmatchedItems || []),
      ...incoming.unmatchedItems.map((u) => ({ ...u, id: `${u.id}_m${stamp}` })),
    ],
  }
}

/** Number of physical items in a draft (for "Resume scan (4 items)"). */
export function draftItemCount(draft) {
  return (draft?.confirmedItems || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
}
