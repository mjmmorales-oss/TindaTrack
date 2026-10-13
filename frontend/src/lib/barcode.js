/**
 * Barcode utilities for validation, normalization, and generation.
 * Parity-matched with App\Support\Barcode in the Laravel backend.
 */

/**
 * Trims and strips whitespace and hyphens. Converts 12-digit UPC-A to 13-digit EAN-13 by prefixing '0'.
 *
 * @param {string} barcode
 * @returns {string}
 */
export function normalize(barcode) {
  const cleaned = String(barcode || '')
    .trim()
    .replace(/[\s-]+/g, '')

  if (/^\d{12}$/.test(cleaned)) {
    return `0${cleaned}`
  }

  return cleaned
}

/**
 * Computes standard GS1 modulo-10 check digit for numeric digits.
 *
 * @param {string} digitsWithoutCheck
 * @returns {number}
 */
export function computeCheckDigit(digitsWithoutCheck) {
  let sum = 0
  const len = digitsWithoutCheck.length

  for (let i = 0; i < len; i++) {
    const digit = parseInt(digitsWithoutCheck[len - 1 - i], 10)
    const weight = i % 2 === 0 ? 3 : 1
    sum += digit * weight
  }

  return (10 - (sum % 10)) % 10
}

/**
 * Verifies EAN-8, EAN-13, or UPC-A check digit.
 *
 * @param {string} barcode
 * @returns {boolean}
 */
export function isValidGtin(barcode) {
  const normalized = normalize(barcode)

  if (!/^\d+$/.test(normalized)) {
    return false
  }

  const len = normalized.length
  if (![8, 12, 13, 14].includes(len)) {
    return false
  }

  const expected = computeCheckDigit(normalized.slice(0, -1))
  const actual = parseInt(normalized.slice(-1), 10)

  return expected === actual
}

/**
 * True for codes starting with '20' through '29' (GS1 restricted circulation range).
 *
 * @param {string} barcode
 * @returns {boolean}
 */
export function isInternal(barcode) {
  const normalized = normalize(barcode)
  return /^2[0-9]/.test(normalized)
}

/**
 * True for a valid GTIN, internal code, or custom alphanumeric code (4 to 32 chars).
 *
 * @param {string} barcode
 * @returns {boolean}
 */
export function isAcceptable(barcode) {
  const trimmed = String(barcode || '').trim()
  if (trimmed.length < 4 || trimmed.length > 32) {
    return false
  }

  const normalized = normalize(barcode)

  if (/^\d+$/.test(normalized)) {
    const len = normalized.length
    if (len < 4 || len > 32) {
      return false
    }

    if (len === 8 || len === 13) {
      if (isInternal(normalized)) {
        return true
      }
      return isValidGtin(normalized)
    }

    if (isInternal(normalized)) {
      return true
    }

    return true
  }

  return /^[A-Za-z0-9-]{4,32}$/.test(trimmed)
}

/**
 * Builds a valid EAN-13 = "20" + 10-digit zero-padded sequence + check digit.
 *
 * @param {number|string} sequence
 * @returns {string}
 */
export function makeInternal(sequence) {
  const seqNum = parseInt(sequence, 10) || 1
  const digits = `20${String(seqNum).padStart(10, '0')}`
  const check = computeCheckDigit(digits)
  return `${digits}${check}`
}

export const Barcode = {
  normalize,
  computeCheckDigit,
  isValidGtin,
  isInternal,
  isAcceptable,
  makeInternal,
}

export default Barcode
