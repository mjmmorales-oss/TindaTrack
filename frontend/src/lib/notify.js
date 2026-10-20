import { toast } from 'sonner'
import i18n from '@/i18n'

/**
 * Accepts `(title, description)`, `(title, options)` or `(title, description, options)`.
 */
function toOptions(descriptionOrOptions, extraOptions) {
  const base =
    typeof descriptionOrOptions === 'string'
      ? { description: descriptionOrOptions }
      : descriptionOrOptions
  return extraOptions ? { ...(base || {}), ...extraOptions } : base
}

/**
 * Standard notification helper for the TindaTrack app (wraps Sonner).
 */
export const notify = {
  success: (title, descriptionOrOptions, extraOptions) =>
    toast.success(title, toOptions(descriptionOrOptions, extraOptions)),
  error: (titleOrError, descriptionOrOptions, extraOptions) => {
    const title =
      typeof titleOrError === 'string'
        ? titleOrError
        : titleOrError?.message || i18n.t('common:somethingWentWrong', 'An error occurred')
    return toast.error(title, toOptions(descriptionOrOptions, extraOptions))
  },
  info: (title, descriptionOrOptions, extraOptions) =>
    toast.info(title, toOptions(descriptionOrOptions, extraOptions)),
  warning: (title, descriptionOrOptions, extraOptions) =>
    toast.warning(title, toOptions(descriptionOrOptions, extraOptions)),
  promise: (promise, options) => toast.promise(promise, options),
  dismiss: (id) => toast.dismiss(id),
}

const RAW_FRAMEWORK_MESSAGE = /could not be found|No query results|method is not supported|Server Error|Too Many Attempts|Unauthenticated|This action is unauthorized|CSRF token mismatch|Payload Too Large|Network Error|timeout of \d+ms exceeded/i

/**
 * Plain-language (en/fil) message for an API error, so raw backend/framework
 * text such as "The route … could not be found" never reaches a toast.
 * 422 validation messages and domain messages from our own controllers pass through.
 *
 * @param {any} err - ApiError / axios error / Error
 * @returns {string}
 */
export function friendlyError(err) {
  if (!err) return i18n.t('errors:unexpected')

  const status = err.status ?? err.response?.status ?? 0
  const data = err.response?.data || {}
  const code = data.code || err.code
  const raw = data.message || err.message || ''
  const isRaw = RAW_FRAMEWORK_MESSAGE.test(raw)

  if (code === 'ai_daily_limit') return i18n.t('errors:aiDailyLimit')
  if (code === 'ai_rate_limited' || (status === 429 && /ai|gemini/i.test(raw))) return i18n.t('errors:aiRateLimited')
  if (code === 'ai_timeout' || code === 'ECONNABORTED' || /timeout of \d+ms/i.test(raw)) return i18n.t('errors:aiTimeout')
  if (code === 'ai_disabled') return i18n.t('errors:aiDisabled')

  if (!status) return i18n.t('errors:networkError')
  switch (status) {
    case 401:
    case 419:
      return i18n.t('errors:sessionExpired')
    case 403:
      return isRaw || !raw ? i18n.t('errors:forbidden') : raw
    case 404:
      return isRaw || !raw ? i18n.t('errors:notFound') : raw
    case 405:
      return i18n.t('errors:methodNotAllowed')
    case 413:
      return i18n.t('errors:tooLarge')
    case 422:
      return raw || i18n.t('errors:validationCheckFields')
    case 429:
      return i18n.t('errors:rateLimited')
    default:
      if (status >= 500) return isRaw || !raw ? i18n.t('errors:serverError') : raw
      return isRaw || !raw ? i18n.t('errors:unexpected') : raw
  }
}

export default notify
