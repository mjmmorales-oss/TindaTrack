import { Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'

export function ProductsPage() {
  useDocumentTitle('Products')
  const { can } = usePermissions()

  return (
    <PageContainer>
      <PageHeader
        title="Products & Inventory"
        description="Catalog of sari-sari store goods, pricing, stock levels, and SKUs"
        actions={
          can('products.manage') && (
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          )
        }
      />

      <EmptyState
        icon={Package}
        title="Product Catalog — Coming in the next step"
        description="Searchable product data table with category filters, stock level indicators, and CRUD dialogs will appear here."
      />
    </PageContainer>
  )
}
