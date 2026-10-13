import i18n from '@/i18n'

/**
 * Translate error message string or Zod error key using i18n.
 * If the string corresponds to a translation key (e.g. 'validation.required' or 'validation:required'),
 * returns translated string. Otherwise returns the message as is.
 * @param {string|any} msg
 * @returns {string}
 */
export function translateErrorMessage(msg) {
  if (!msg) return ''
  const str = typeof msg === 'string' ? msg : msg?.message
  if (!str || typeof str !== 'string') return ''

  const trimmed = str.trim()
  if (
    trimmed.startsWith('validation.') ||
    trimmed.startsWith('validation:') ||
    trimmed.startsWith('errors.') ||
    trimmed.startsWith('errors:')
  ) {
    const key = trimmed.includes(':') ? trimmed : trimmed.replace('.', ':')
    return i18n.t(key)
  }

  return str
}

/**
 * Extract user-friendly error message from Axios / API errors.
 * Translates known error reasons and status codes using i18n errors.* namespace.
 * @param {any} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return i18n.t('errors:unexpected', 'An unexpected error occurred.')

  if (!error.response) {
    return i18n.t('errors:networkError', "Can't reach the server. Please check your internet connection.")
  }

  const { status, data } = error.response

  if (status === 429) {
    return i18n.t('errors:rateLimited', 'Too many attempts. Please try again in a few moments.')
  }

  if (status === 401) {
    return i18n.t('errors:unauthorized', 'You must be signed in to perform this action.')
  }

  if (status === 403) {
    return i18n.t('errors:forbidden', 'You do not have permission to access this resource.')
  }

  if (status === 404) {
    return i18n.t('errors:notFound', 'The requested resource was not found.')
  }

  // Check known machine-readable reason tags
  if (data?.reason) {
    const reasonKey = `errors:${data.reason}`
    if (i18n.exists(reasonKey)) {
      return i18n.t(reasonKey)
    }
  }

  if (data?.message) {
    return translateErrorMessage(data.message)
  }

  return i18n.t('errors:serverError', 'Something went wrong on the server. Please try again.')
}

/**
 * Extract validation field errors from Laravel 422 responses.
 * @param {any} error
 * @returns {Record<string, string[]>}
 */
export function getFieldErrors(error) {
  if (error?.response?.status === 422 && error.response.data?.errors) {
    const raw = error.response.data.errors
    const translated = {}
    for (const [key, msgs] of Object.entries(raw)) {
      translated[key] = Array.isArray(msgs)
        ? msgs.map(translateErrorMessage)
        : [translateErrorMessage(msgs)]
    }
    return translated
  }
  return {}
}
