import { createAvatar } from '@dicebear/core'
import { initials, notionists, thumbs } from '@dicebear/collection'

const styleMap = {
  initials,
  notionists,
  thumbs,
}

// In-memory memoization cache for generated SVGs
const avatarCache = new Map()

/**
 * Generate a DiceBear avatar Data URI based on user seed and style.
 * Uses local npm packages with zero external HTTP requests, fully memoized.
 *
 * @param {string} seed - Unique seed for avatar generation (e.g. name or email)
 * @param {'initials'|'notionists'|'thumbs'} [style='initials']
 * @returns {string} data URI string
 */
export function getAvatarUri(seed, style = 'initials') {
  const normalizedSeed = (seed || 'User').trim()
  const selectedStyle = styleMap[style] || initials
  const cacheKey = `${style}:${normalizedSeed}`

  if (avatarCache.has(cacheKey)) {
    return avatarCache.get(cacheKey)
  }

  const options = {
    seed: normalizedSeed,
  }

  if (style === 'initials') {
    options.backgroundColor = ['0e7c66', 'f5a524', '0369a1', '15803d', 'b45309']
  }

  const avatar = createAvatar(selectedStyle, options)
  const uri = avatar.toDataUri()
  avatarCache.set(cacheKey, uri)

  return uri
}

/**
 * Alias for getAvatarUri to maintain backwards compatibility with existing callers.
 */
export const getAvatarUrl = getAvatarUri

/**
 * Get 1-2 character initials for fallback avatar display.
 * @param {string} [name]
 * @returns {string}
 */
export function getInitials(name = '') {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
