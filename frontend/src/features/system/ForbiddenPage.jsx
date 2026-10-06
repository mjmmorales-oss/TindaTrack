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
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[60vh]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2.5 py-1 rounded-full mb-3">
        403 · Access Denied
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Store Owner Access Only
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
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
