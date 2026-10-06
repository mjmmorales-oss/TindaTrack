import { Link } from 'react-router'
import { ShieldAlert, ArrowLeft, ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ForbiddenPage() {
  useDocumentTitle('Access Denied')
  const { user } = useAuth()
  const isCashier = user?.role === 'cashier'

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
      <div className="bg-destructive/10 text-destructive mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <span className="text-destructive bg-destructive/10 mb-3 rounded-full px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
        403 · Access Denied
      </span>
      <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        Store Owner Access Only
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        {isCashier
          ? 'Ang pahinang ito ay para lamang sa store owner. Ang iyong cashier account ay may limitadong access upang maprotektahan ang mga ulat at settings.'
          : 'You do not have permission to view or manage this module.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {isCashier ? (
          <Button asChild className="gap-2">
            <Link to="/pos">
              <ScanBarcode className="h-4 w-4" />
              Go to POS Terminal
            </Link>
          </Button>
        ) : (
          <Button asChild className="gap-2">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
