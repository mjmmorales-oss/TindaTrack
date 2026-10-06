import { ArrowDownUp, Printer, Warehouse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function InventoryPage() {
  useDocumentTitle('Stock & Inventory')

  return (
    <PageContainer>
      <PageHeader
        title="Stock & Inventory Control"
        description="Monitor low-stock items, log physical adjustments, and print restock shopping lists"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" />
              Restock List
            </Button>
            <Button size="sm" className="gap-1.5">
              <ArrowDownUp className="h-4 w-4" />
              Adjust Stock
            </Button>
          </div>
        }
      />

      <EmptyState
        icon={Warehouse}
        title="Inventory Manager — Coming in the next step"
        description="Tabbed view for Stock Overview, Running Low items, Stock Movement Audit Log, and Printable Restock List will appear here."
      />
    </PageContainer>
  )
}
