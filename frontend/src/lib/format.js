import { format, formatDistanceToNow, isValid } from 'date-fns'

const phpCurrencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const phpNumberFormatter = new Intl.NumberFormat('en-PH')

/**
 * Format a number into Philippine Peso currency string (e.g. ₱1,250.00).
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0
  return phpCurrencyFormatter.format(num)
}

/**
 * Format a number with thousands separators (e.g. 1,250).
 * @param {number|string} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  const num = Number(value) || 0
  if (Object.keys(options).length > 0) {
    return new Intl.NumberFormat('en-PH', options).format(num)
  }
  return phpNumberFormatter.format(num)
}

/**
 * Round an amount to 2 decimal places to prevent floating-point drift.
 * @param {number|string} value
 * @returns {number}
 */
export function toMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/**
 * Helper to safely parse a date input into a valid Date object.
 * @param {string|number|Date} date
 * @returns {Date|null}
 */
function toValidDate(date) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  return isValid(d) ? d : null
}

/**
 * Format a date string or timestamp (e.g. "Oct 7, 2026").
 * @param {string|number|Date} date
 * @param {string} [pattern='MMM d, yyyy']
 * @returns {string}
 */
export function formatDate(date, pattern = 'MMM d, yyyy') {
  const d = toValidDate(date)
  if (!d) return ''
  return format(d, pattern)
}

/**
 * Format a date and time (e.g. "Oct 7, 2026 · 10:42 AM").
 * @param {string|number|Date} date
 * @param {string} [pattern="MMM d, yyyy · h:mm a"]
 * @returns {string}
 */
export function formatDateTime(date, pattern = 'MMM d, yyyy · h:mm a') {
  const d = toValidDate(date)
  if (!d) return ''
  return format(d, pattern)
}

/**
 * Format relative time distance from now (e.g. "5 minutes ago").
 * @param {string|number|Date} date
 * @param {object} [options]
 * @returns {string}
 */
export function formatRelative(date, options = { addSuffix: true }) {
  const d = toValidDate(date)
  if (!d) return ''
  return formatDistanceToNow(d, options)
}
