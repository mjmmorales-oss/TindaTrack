const STORAGE_KEY = 'tt_auto_barcode_lookup'

/**
 * Reads whether automatic online barcode lookup (Open Food Facts) is enabled.
 * Defaults to true.
 * @returns {boolean}
 */
export function getAutoBarcodeLookup() {
  if (typeof window === 'undefined' || !window.localStorage) return true
  const val = localStorage.getItem(STORAGE_KEY)
  if (val === null) return true
  return val === 'true'
}

/**
 * Persists the automatic online barcode lookup preference.
 * @param {boolean} enabled
 */
export function setAutoBarcodeLookup(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}

export default {
  getAutoBarcodeLookup,
  setAutoBarcodeLookup,
}
