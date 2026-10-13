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

  const apiBase = getApiBaseUrl() || '/api'
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const parsed = new URL(apiBase)
      const origin = parsed.origin
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
      return `${origin}${cleanPath}`
    } catch {
      // Fallback to relative
    }
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export default resolveImageUrl
