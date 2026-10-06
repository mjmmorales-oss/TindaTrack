const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a number into Philippine Peso currency string (e.g. ₱1,250.00).
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0
  return phpFormatter.format(num)
}

/**
 * Round an amount to 2 decimal places to prevent floating-point drift.
 * @param {number} value
 * @returns {number}
 */
export function toMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/**
 * Format a date string or timestamp.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(d)
}
