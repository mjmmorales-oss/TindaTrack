/**
 * Generate a DiceBear avatar URL based on user seed.
 * @param {string} seed
 * @param {'initials'|'thumbs'|'notionists'} [style='initials']
 * @returns {string}
 */
export function getAvatarUrl(seed, style = 'initials') {
  const encoded = encodeURIComponent(seed || 'User')
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encoded}&backgroundColor=0E7C66,F5A524,0369A1,15803D`
}

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
