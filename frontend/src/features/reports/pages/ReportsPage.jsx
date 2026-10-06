import { ChartColumn, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ReportsPage() {
  useDocumentTitle('Reports')

  return (
    <PageContainer>
      <PageHeader
        title="Business Reports & Analytics"
        description="Daily, weekly, and monthly sales trends, gross profit estimates, and top-selling goods"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <EmptyState
        icon={ChartColumn}
        title="Reports & Analytics — Coming in the next step"
        description="Visual charts for sales trend, cash vs utang mix, top 5 best sellers, and gross profit estimates will be displayed here."
      />
    </PageContainer>
  )
}
