import { Link, useParams } from 'react-router'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SaleDetailPage() {
  const { id } = useParams()
  useDocumentTitle(`Sale #${id}`)

  return (
    <PageContainer>
      <PageHeader
        title={`Sale #${id}`}
        description="Detailed transaction receipt, item breakdown, and audit log"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/sales">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Sales
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={ReceiptText}
        title="Sale Receipt Details — Coming in the next step"
        description={`Receipt breakdown and transaction history for transaction ${id} will be displayed here.`}
        action={
          <Button variant="outline" asChild>
            <Link to="/sales">Back to Sales</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
