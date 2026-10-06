import { Link } from 'react-router'
import { ArrowLeft, ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Kbd } from '@/components/ui/kbd'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function PosPage() {
  useDocumentTitle('POS Terminal')

  return (
    <PageContainer>
      <PageHeader
        title="Point of Sale Terminal"
        description="Fast barcode scanning, instant change calculator, and cash/utang checkout"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Shortcuts: <Kbd>F2</Kbd> Search <Kbd>F9</Kbd> Pay
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Exit POS
              </Link>
            </Button>
          </div>
        }
      />

      <EmptyState
        icon={ScanBarcode}
        title="POS Interface — Coming in the next step"
        description="The full Point of Sale interface with product search, category chips, cart state, cash calculator, and utang checkout will be built in the subsequent phase."
        action={
          <Button asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
