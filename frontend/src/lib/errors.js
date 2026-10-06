/**
 * Extract user-friendly error message from Axios / API errors.
 * @param {any} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'

  if (!error.response) {
    return "Can't reach the server. Please check your internet connection."
  }

  if (error.response.status === 429) {
    return 'Too many attempts. Please try again in a few moments.'
  }

  if (error.response.data?.message) {
    return error.response.data.message
  }

  return 'Something went wrong. Please try again.'
}

/**
 * Extract validation field errors from Laravel 422 responses.
 * @param {any} error
 * @returns {Record<string, string[]>}
 */
export function getFieldErrors(error) {
  if (error?.response?.status === 422 && error.response.data?.errors) {
    return error.response.data.errors
  }
  return {}
}
