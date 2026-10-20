import { api } from '@/lib/api'
import { ApiError } from '@/lib/mockApi'

/**
 * Normalizes Axios errors into standard ApiError instances matching the Laravel JSON shape:
 * { status, message, errors: { [field]: string[] } }
 */
export async function handleRequest(requestPromise) {
  try {
    const response = await requestPromise
    return response.data
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response
      throw new ApiError(status, data)
    }
    throw new ApiError(500, {
      message: error.message || 'Could not reach server (Network error).',
      errors: {},
    })
  }
}

/**
 * Per-request config. The shared axios instance defaults to
 * `Content-Type: application/json`, and axios then JSON-stringifies FormData
 * (dropping every file). Multipart bodies therefore always get a multipart
 * Content-Type, which the browser replaces with the right boundary.
 */
function withBodyConfig(data, config = {}) {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  if (!isFormData) return config
  return {
    ...config,
    headers: { ...(config.headers || {}), 'Content-Type': 'multipart/form-data' },
  }
}

export const apiClient = {
  get(url, params, config = {}) {
    return handleRequest(api.get(url, { ...config, params }))
  },
  post(url, data, config) {
    return handleRequest(api.post(url, data, withBodyConfig(data, config)))
  },
  put(url, data, config) {
    return handleRequest(api.put(url, data, withBodyConfig(data, config)))
  },
  patch(url, data, config) {
    return handleRequest(api.patch(url, data, withBodyConfig(data, config)))
  },
  delete(url, params, config = {}) {
    return handleRequest(api.delete(url, { ...config, params }))
  },
}

export default apiClient
