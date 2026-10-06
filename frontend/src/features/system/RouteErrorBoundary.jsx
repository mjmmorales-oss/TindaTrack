import { useRouteError, isRouteErrorResponse, Link } from 'react-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RouteErrorBoundary() {
  const error = useRouteError()

  let title = 'Unexpected Error'
  let message = 'An unexpected error occurred while rendering this page.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    message = error.data?.message || error.statusText || message
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
          Reload Page
        </Button>
        <Button asChild className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
