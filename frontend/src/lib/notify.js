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

export default notify
