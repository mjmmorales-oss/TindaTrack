import { ReceiptText, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SalesPage() {
  useDocumentTitle('Sales History')

  return (
    <PageContainer>
      <PageHeader
        title="Sales History"
        description="View past receipts, transactions, cashier audits, and void records"
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/pos">
              <Plus className="h-4 w-4" />
              New Sale
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={ReceiptText}
        title="Sales Records — Coming in the next step"
        description="Transaction table with date filters, receipt previews, and cashier filtering will be available here."
        action={
          <Button variant="outline" asChild>
            <Link to="/pos">Go to POS</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
