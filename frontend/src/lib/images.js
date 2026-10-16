import { getApiBaseUrl } from './api'

/**
 * Resolves a product image URL to a fully-qualified browser-loadable URL.
 * Handles:
 * - Empty / null / undefined -> null
 * - Absolute external URLs (http://, https://) -> as-is
 * - Inline data URLs (data:image/...) -> as-is
 * - Blob URLs (blob:...) -> as-is
 * - Local API paths (/api/product-images/{ulid}) -> prepends API origin if needed
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  // Only paths starting with /api/ resolve against the backend API origin
  if (cleanPath.startsWith('/api/')) {
    const apiBase = getApiBaseUrl() || '/api'
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      try {
        const parsed = new URL(apiBase)
        return `${parsed.origin}${cleanPath}`
      } catch {
        // Fallback to relative
      }
    }
    return cleanPath
  }

  // Static frontend assets (e.g. /demo-products/...) resolve against window.location.origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${cleanPath}`
  }

  return cleanPath
}

export default resolveImageUrl

