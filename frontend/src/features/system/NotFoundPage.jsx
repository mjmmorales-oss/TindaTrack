import { Link } from 'react-router'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page Not Found')
  const { user } = useAuth()
  const homePath = user?.role === 'cashier' ? '/pos' : '/dashboard'

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[60vh]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
        404 · Not Found
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Paumanhin, hindi mahanap ang pahinang hinahanap mo. Maaaring mali ang link o nailipat ang lokasyon nito.
      </p>

      <div className="mt-8">
        <Button asChild className="gap-2">
          <Link to={user ? homePath : '/'}>
            <ArrowLeft className="h-4 w-4" />
            {user ? 'Back to App' : 'Back to Home'}
          </Link>
        </Button>
      </div>
    </div>
  )
}
