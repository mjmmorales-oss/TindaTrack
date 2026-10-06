import { Plus, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function CategoriesPage() {
  useDocumentTitle('Categories')

  return (
    <PageContainer>
      <PageHeader
        title="Product Categories"
        description="Organize tindahan items into intuitive groups with custom colors and icons"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <EmptyState
        icon={Tags}
        title="Category Manager — Coming in the next step"
        description="Visual category cards with color chips, product counts, and editing dialogs will be placed here."
      />
    </PageContainer>
  )
}
