import { toast } from 'sonner'

/**
 * Standard notification helper for the TindaTrack app (wraps Sonner).
 */
export const notify = {
  success: (title, descriptionOrOptions) => {
    const opts =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions
    return toast.success(title, opts)
  },
  error: (titleOrError, descriptionOrOptions) => {
    const title =
      typeof titleOrError === 'string'
        ? titleOrError
        : titleOrError?.message || 'May naganap na error'
    const opts =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions
    return toast.error(title, opts)
  },
  info: (title, descriptionOrOptions) => {
    const opts =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions
    return toast.info(title, opts)
  },
  warning: (title, descriptionOrOptions) => {
    const opts =
      typeof descriptionOrOptions === 'string'
        ? { description: descriptionOrOptions }
        : descriptionOrOptions
    return toast.warning(title, opts)
  },
  promise: (promise, options) => toast.promise(promise, options),
  dismiss: (id) => toast.dismiss(id),
}
