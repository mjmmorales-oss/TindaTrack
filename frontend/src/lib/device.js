/**
 * Device heuristics shared by the scanner and pairing UI.
 */

/** Desktop/tablet POS: a precise pointer (mouse/trackpad) and a wide screen. */
export const DESKTOP_POS_QUERY = '(pointer: fine) and (min-width: 1024px)'

/**
 * True on a laptop/desktop POS (mouse + ≥1024px). False on phones and in
 * environments without matchMedia.
 *
 * @returns {boolean}
 */
export function isDesktopPos() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return Boolean(window.matchMedia(DESKTOP_POS_QUERY)?.matches)
}

/**
 * True on a phone-sized touch device (the opposite of a desktop POS).
 *
 * @returns {boolean}
 */
export function isPhoneLike() {
  return !isDesktopPos()
}
