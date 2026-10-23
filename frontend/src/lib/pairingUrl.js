/**
 * Resolves the base URL encoded in the phone-pairing QR.
 *
 * Priority: VITE_PUBLIC_APP_URL → (only when this page is on localhost) the dev
 * server's LAN origin injected by vite.config.js → window.location.origin.
 * A phone can never open "localhost", so callers warn when that is all we have.
 */

const LOCALHOST_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?=[:/]|$)/i

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isLocalhostUrl(url) {
  return LOCALHOST_RE.test(String(url || '').trim())
}

function trimSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

/**
 * Pure resolver (easy to test for every branch).
 *
 * @param {{ publicAppUrl?: string, lanOrigin?: string, origin?: string }} sources
 * @returns {{ baseUrl: string, source: 'public'|'lan'|'origin', isLocalhost: boolean }}
 */
export function resolvePairingBaseUrl({ publicAppUrl, lanOrigin, origin } = {}) {
  const pub = trimSlash(publicAppUrl)
  if (pub) {
    return { baseUrl: pub, source: 'public', isLocalhost: isLocalhostUrl(pub) }
  }

  const here = trimSlash(origin)
  const lan = trimSlash(lanOrigin)
  if (isLocalhostUrl(here) && lan) {
    return { baseUrl: lan, source: 'lan', isLocalhost: false }
  }

  return { baseUrl: here, source: 'origin', isLocalhost: isLocalhostUrl(here) }
}

/**
 * Resolver wired to the real environment.
 */
export function getPairingBaseUrl() {
  return resolvePairingBaseUrl({
    publicAppUrl: import.meta.env?.VITE_PUBLIC_APP_URL,
    lanOrigin: import.meta.env?.VITE_DEV_LAN_ORIGIN,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  })
}

/**
 * @param {string} baseUrl
 * @param {string} code
 * @returns {string}
 */
export function buildPairingUrl(baseUrl, code) {
  return `${trimSlash(baseUrl)}/scan?code=${encodeURIComponent(code)}`
}
