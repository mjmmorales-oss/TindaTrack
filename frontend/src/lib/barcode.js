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

/** Pairing-code alphabet used by App\Models\ScannerSession (no 0/O, 1/I/L). */
const PAIRING_CODE_RE = /^([A-HJKMNP-Z2-9]{4})-?([A-HJKMNP-Z2-9]{4})$/i

/**
 * Formats a raw pairing code as "XXXX-XXXX" (upper-case), or returns null.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function parsePairingCode(value) {
  const match = String(value || '').trim().match(PAIRING_CODE_RE)
  return match ? `${match[1]}-${match[2]}`.toUpperCase() : null
}

/**
 * Classifies a scanned/typed string before anything is sent to the barcode lookup.
 *
 * - `{ kind: 'pairing', code, fromUrl }` — a TindaTrack pairing QR (`…/scan?code=XXXX-XXXX`)
 *   or a bare pairing code. A bare code could also be a custom alphanumeric barcode,
 *   so callers should prefer an exact local product match when `fromUrl` is false.
 * - `{ kind: 'barcode', value }` — an acceptable barcode, normalized.
 * - `{ kind: 'unknown' }` — URLs, free text and anything the lookup would reject.
 *
 * @param {string} text
 * @returns {{ kind: 'pairing', code: string, fromUrl: boolean } | { kind: 'barcode', value: string } | { kind: 'unknown' }}
 */
export function classifyScan(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return { kind: 'unknown' }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const code = parsePairingCode(url.searchParams.get('code'))
      if (code && /\/scan\/?$/.test(url.pathname)) {
        return { kind: 'pairing', code, fromUrl: true }
      }
    } catch {
      // malformed URL
    }
    return { kind: 'unknown' }
  }

  const pairing = parsePairingCode(raw)
  // A purely numeric value is always a barcode; pairing codes contain letters.
  if (pairing && /[A-Z]/i.test(raw)) {
    return { kind: 'pairing', code: pairing, fromUrl: false }
  }

  // Any digit string counts: stored/printed codes may carry a wrong check digit,
  // and the local product match / lookup decide what it is.
  const normalized = normalize(raw)
  if (isAcceptable(raw) || /^\d{4,32}$/.test(normalized)) {
    return { kind: 'barcode', value: normalized }
  }

  return { kind: 'unknown' }
}

export const Barcode = {
  normalize,
  computeCheckDigit,
  isValidGtin,
  isInternal,
  isAcceptable,
  makeInternal,
  parsePairingCode,
  classifyScan,
}

export default Barcode
