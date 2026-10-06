import { HandCoins, MessageSquareText, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function UtangPage() {
  useDocumentTitle('Utang Ledger')

  return (
    <PageContainer>
      <PageHeader
        title="Utang Ledger & Collections"
        description="Track credit balances, aging buckets (>30 days), and generate Taglish reminder messages"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquareText className="h-4 w-4" />
              Reminders
            </Button>
            <Button size="sm" className="gap-1.5">
              <HandCoins className="h-4 w-4" />
              Collect Payment
            </Button>
          </div>
        }
      />

      <EmptyState
        icon={NotebookPen}
        title="Utang Management — Coming in the next step"
        description="Debt aging charts (0-7d, 8-30d, 31-60d, 60d+), debtor tables, payment recording modal, and copy SMS reminder templates will be featured here."
      />
    </PageContainer>
  )
}
