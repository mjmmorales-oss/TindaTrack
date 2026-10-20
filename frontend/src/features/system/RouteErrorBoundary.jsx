import { useRouteError, isRouteErrorResponse, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** After a new deploy, an open tab can request a lazy chunk that no longer exists. */
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i

/**
 * Friendly fallback for any route that throws while loading or rendering.
 * Raw error text is shown in development only.
 */
export function RouteErrorBoundary() {
  const { t } = useTranslation(['errors'])
  const error = useRouteError()

  let title = t('errors:routeErrorTitle')
  let message = t('errors:routeErrorDesc')

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? t('errors:pageNotFoundTitle') : title
  } else if (error instanceof Error && STALE_CHUNK.test(error.message)) {
    title = t('errors:newVersionTitle')
    message = t('errors:newVersionDesc')
  }

  const detail = import.meta.env.DEV
    ? isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : error?.message
    : null

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="bg-destructive/10 text-destructive mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{message}</p>
      {detail && <p className="text-muted-foreground mt-2 font-mono text-xs break-all">{detail}</p>}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" className="h-11 gap-2" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          {t('errors:reloadPage')}
        </Button>
        <Button asChild className="h-11 gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            {t('errors:backToHome')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
