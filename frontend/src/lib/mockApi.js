/**
 * Custom error mimicking Laravel HTTP response error payloads.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code (422, 403, 404, 500, etc.)
   * @param {string|{ message: string, errors?: Record<string, string[]> }} payload
   */
  constructor(status, payload) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || 'An error occurred.'
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = typeof payload === 'object' ? payload.errors || {} : {}

    // Axios-compatible response structure
    this.response = {
      status,
      data: {
        message,
        errors: this.errors,
      },
    }
  }
}

/**
 * Simulates network latency with random jitter based on VITE_MOCK_LATENCY.
 * @param {number} [customMs]
 * @returns {Promise<void>}
 */
export async function delay(customMs) {
  let baseMs = 400
  if (typeof customMs === 'number') {
    baseMs = customMs
  } else if (
    typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_MOCK_LATENCY !== undefined
  ) {
    const envVal = parseInt(import.meta.env.VITE_MOCK_LATENCY, 10)
    if (!isNaN(envVal)) baseMs = envVal
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return Promise.resolve()
  }

  // Jitter ± 150 ms, minimum 30 ms
  const jitter = Math.floor(Math.random() * 300) - 150
  const totalDelay = Math.max(30, baseMs + jitter)

  return new Promise((resolve) => setTimeout(resolve, totalDelay))
}

/**
 * Paginates an array of records to match Laravel's LengthAwarePaginator.
 *
 * @template T
 * @param {T[]} items
 * @param {number|string} [page=1]
 * @param {number|string} [perPage=15]
 * @returns {{
 *   data: T[],
 *   meta: {
 *     current_page: number,
 *     last_page: number,
 *     per_page: number,
 *     total: number,
 *     from: number|null,
 *     to: number|null
 *   }
 * }}
 */
export function paginate(items = [], page = 1, perPage = 15) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = Math.max(1, parseInt(perPage, 10) || 15)
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const start = (pageNum - 1) * pageSize
  const end = start + pageSize

  const paginatedData = items.slice(start, end)
  const from = total === 0 ? null : start + 1
  const to = total === 0 ? null : Math.min(total, end)

  return {
    data: paginatedData,
    meta: {
      current_page: pageNum,
      last_page: lastPage,
      per_page: pageSize,
      total,
      from,
      to,
    },
  }
}

/**
 * Filters items by substring search across specified properties.
 *
 * @template T
 * @param {T[]} items
 * @param {string} query
 * @param {(keyof T)[]} fields
 * @returns {T[]}
 */
export function applySearch(items, query, fields) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return items
  }
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    return fields.some((field) => {
      const val = item[field]
      if (val === null || val === undefined) return false
      return String(val).toLowerCase().includes(q)
    })
  })
}

/**
 * Sorts array of objects by field key. Supports '-field' for descending order.
 *
 * @template T
 * @param {T[]} items
 * @param {string} [sortKey]
 * @returns {T[]}
 */
export function applySort(items, sortKey) {
  if (!sortKey || typeof sortKey !== 'string') {
    return items
  }
  const isDesc = sortKey.startsWith('-')
  const key = isDesc ? sortKey.slice(1) : sortKey

  return [...items].sort((a, b) => {
    let aVal = a[key]
    let bVal = b[key]

    if (aVal === undefined || aVal === null) aVal = ''
    if (bVal === undefined || bVal === null) bVal = ''

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const cmp = aVal.localeCompare(bVal)
      return isDesc ? -cmp : cmp
    }

    if (aVal < bVal) return isDesc ? 1 : -1
    if (aVal > bVal) return isDesc ? -1 : 1
    return 0
  })
}
