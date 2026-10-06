import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function CustomersPage() {
  useDocumentTitle('Customers')

  return (
    <PageContainer>
      <PageHeader
        title="Suki & Customer Directory"
        description="Manage customer profiles, credit limits, contacts, and outstanding balances"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      <EmptyState
        icon={Users}
        title="Customer Directory — Coming in the next step"
        description="Customer directory with DiceBear avatars, credit balance badges, phone numbers, and quick ledger shortcuts."
      />
    </PageContainer>
  )
}
