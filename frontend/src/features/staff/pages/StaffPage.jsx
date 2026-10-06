import { Plus, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function StaffPage() {
  useDocumentTitle('Staff Management')

  return (
    <PageContainer>
      <PageHeader
        title="Staff & Cashier Accounts"
        description="Manage cashier logins, role assignments, and active account statuses"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Cashier
          </Button>
        }
      />

      <EmptyState
        icon={UserCog}
        title="Staff Management — Coming in the next step"
        description="Cashier list with role badges, active/inactive switches, and cashier invite modal will be implemented here."
      />
    </PageContainer>
  )
}
