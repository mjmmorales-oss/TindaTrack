import { notify } from '@/lib/notify'
import i18n from '@/i18n'

/**
 * Formats a technical field name or dot-notation path to readable English.
 * e.g., 'category_id' -> 'Category'
 *       'products.0.price' -> 'Product 1 price'
 *       'sku' -> 'SKU'
 */
export function formatFieldName(field) {
  if (!field) return ''
  const nestedMatch = String(field).match(/^([a-zA-Z_-]+)\.(\d+)\.([a-zA-Z_-]+)$/)
  if (nestedMatch) {
    const [, collection, idx, subField] = nestedMatch
    const base = collection.endsWith('s') ? collection.slice(0, -1) : collection
    const subClean = subField.replace(/_/g, ' ')
    return `${base.charAt(0).toUpperCase() + base.slice(1)} ${Number(idx) + 1} ${subClean}`
  }

  const clean = String(field).replace(/\./g, ' ').replace(/_/g, ' ')
  const acronyms = {
    sku: 'SKU',
    id: 'ID',
    url: 'URL',
    ean: 'EAN',
    pos: 'POS',
    ai: 'AI',
  }
  return clean
    .split(' ')
    .filter(Boolean)
    .map((word) => acronyms[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/**
 * Maps Laravel 422 validation errors to React Hook Form field errors,
 * handling field mapping, nested dot notation, and friendly toasts for unmapped fields.
 *
 * @param {object} error - The caught API/Axios error
 * @param {Function|object} setErrorOrForm - RHF setError function or form instance { setError, getValues }
 * @param {object} [options]
 * @param {object} [options.fieldMap] - Mapping from backend field name to frontend form key
 * @param {Array<string>|Set<string>} [options.visibleFields] - List of fields visible in the form
 * @returns {boolean} Whether any 422 errors were processed
 */
export function applyServerErrors(error, setErrorOrForm, { fieldMap = {}, visibleFields = null } = {}) {
  const backendErrors =
    error?.response?.data?.errors ||
    error?.errors ||
    (error?.response?.status === 422 && error?.response?.data && typeof error.response.data === 'object' && !error.response.data.message
      ? error.response.data
      : null)

  const setError = typeof setErrorOrForm === 'function' ? setErrorOrForm : setErrorOrForm?.setError

  if (!backendErrors || typeof backendErrors !== 'object' || Array.isArray(backendErrors)) {
    // Non-422 or unexpected error shape: show toast
    const message =
      error?.response?.data?.message ||
      error?.message ||
      i18n.t('errors:serverError', { defaultValue: 'Something went wrong. Please try again.' })
    notify.error(message)
    return false
  }

  // Derive visible fields if not explicitly passed
  let visibleSet = null
  if (visibleFields) {
    visibleSet = new Set(visibleFields)
  } else if (setErrorOrForm?.getValues && typeof setErrorOrForm.getValues === 'function') {
    visibleSet = new Set(Object.keys(setErrorOrForm.getValues() || {}))
  }

  const unmappedFields = []

  Object.entries(backendErrors).forEach(([rawKey, msgs]) => {
    const rawMsg = Array.isArray(msgs) ? msgs[0] : String(msgs)
    const targetKey = fieldMap[rawKey] || rawKey

    const isVisible = visibleSet ? visibleSet.has(targetKey) : true

    if (isVisible && typeof setError === 'function') {
      setError(targetKey, {
        type: 'server',
        message: rawMsg,
      })
    } else {
      unmappedFields.push(rawKey)
    }
  })

  if (unmappedFields.length > 0) {
    const friendlyList = [
      ...new Set(unmappedFields.map((f) => formatFieldName(fieldMap[f] || f))),
    ].join(', ')

    notify.error(
      i18n.t('errors:validationCheckFields', 'Please check the highlighted fields'),
      friendlyList,
    )
  }

  return true
}

export default applyServerErrors
