import { Link, useParams } from 'react-router'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function CustomerDetailPage() {
  const { id } = useParams()
  useDocumentTitle(`Customer #${id}`)

  return (
    <PageContainer>
      <PageHeader
        title={`Customer Profile #${id}`}
        description="Utang ledger timeline, purchase history, and credit balance management"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/customers">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Customers
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Users}
        title="Customer Profile & Ledger — Coming in the next step"
        description={`Interactive credit balance timeline, payment collection dialog, and order history for customer #${id} will appear here.`}
        action={
          <Button variant="outline" asChild>
            <Link to="/customers">Back to Customers</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
