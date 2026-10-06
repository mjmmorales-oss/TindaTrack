import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Hook to synchronize table parameters (search, pagination, sort, filters) with URL search parameters.
 *
 * @param {object} [defaultParams={}] - Default table parameter values
 * @param {string} [defaultParams.q=''] - Default search query
 * @param {number} [defaultParams.page=1] - Default page number
 * @param {number} [defaultParams.per_page=15] - Default items per page
 * @param {string} [defaultParams.sort=''] - Default sort column (e.g. 'name' or '-created_at')
 * @returns {{
 *   params: object,
 *   setParams: (updates: object | ((prev: object) => object)) => void,
 *   resetParams: () => void,
 *   setPage: (page: number) => void,
 *   setPerPage: (perPage: number) => void,
 *   setSearch: (q: string) => void,
 *   setSort: (column: string) => void
 * }}
 */
export function useTableParams(defaultParams = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const defaults = useMemo(
    () => ({
      q: '',
      page: 1,
      per_page: 15,
      sort: '',
      ...defaultParams,
    }),
    [defaultParams],
  )

  const params = useMemo(() => {
    const current = { ...defaults }

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (searchParams.has(key)) {
        const urlVal = searchParams.get(key)
        if (typeof defaultValue === 'number') {
          const parsed = parseInt(urlVal, 10)
          current[key] = isNaN(parsed) ? defaultValue : parsed
        } else if (typeof defaultValue === 'boolean') {
          current[key] = urlVal === 'true'
        } else {
          current[key] = urlVal
        }
      }
    }

    return current
  }, [searchParams, defaults])

  const setParams = useCallback(
    (updater) => {
      setSearchParams(
        (prevSearchParams) => {
          const prevParams = { ...defaults }
          for (const [key, defaultValue] of Object.entries(defaults)) {
            if (prevSearchParams.has(key)) {
              const urlVal = prevSearchParams.get(key)
              if (typeof defaultValue === 'number') {
                const parsed = parseInt(urlVal, 10)
                prevParams[key] = isNaN(parsed) ? defaultValue : parsed
              } else {
                prevParams[key] = urlVal
              }
            }
          }

          const nextParams =
            typeof updater === 'function'
              ? updater(prevParams)
              : { ...prevParams, ...updater }

          const nextSearchParams = new URLSearchParams()
          for (const [key, value] of Object.entries(nextParams)) {
            // Only add to query string if not empty/default
            if (
              value !== undefined &&
              value !== null &&
              value !== '' &&
              value !== defaults[key]
            ) {
              nextSearchParams.set(key, String(value))
            }
          }

          return nextSearchParams
        },
        { replace: true },
      )
    },
    [setSearchParams, defaults],
  )

  const resetParams = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const setPage = useCallback(
    (page) => {
      setParams((prev) => ({ ...prev, page }))
    },
    [setParams],
  )

  const setPerPage = useCallback(
    (per_page) => {
      setParams((prev) => ({ ...prev, per_page, page: 1 }))
    },
    [setParams],
  )

  const setSearch = useCallback(
    (q) => {
      setParams((prev) => ({ ...prev, q, page: 1 }))
    },
    [setParams],
  )

  const setSort = useCallback(
    (column) => {
      setParams((prev) => {
        let nextSort = column
        if (prev.sort === column) {
          nextSort = `-${column}` // Toggle from asc to desc
        } else if (prev.sort === `-${column}`) {
          nextSort = '' // Clear sort
        }
        return { ...prev, sort: nextSort, page: 1 }
      })
    },
    [setParams],
  )

  return {
    params,
    setParams,
    resetParams,
    setPage,
    setPerPage,
    setSearch,
    setSort,
  }
}

export default useTableParams
