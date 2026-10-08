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
      message: error.message || 'Hindi maabot ang server (Network error).',
      errors: {},
    })
  }
}

export const apiClient = {
  get(url, params) {
    return handleRequest(api.get(url, { params }))
  },
  post(url, data) {
    return handleRequest(api.post(url, data))
  },
  put(url, data) {
    return handleRequest(api.put(url, data))
  },
  patch(url, data) {
    return handleRequest(api.patch(url, data))
  },
  delete(url, params) {
    return handleRequest(api.delete(url, { params }))
  },
}

export default apiClient
