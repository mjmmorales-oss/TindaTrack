import { Link, useParams } from 'react-router'
import { ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ProductDetailPage() {
  const { id } = useParams()
  useDocumentTitle(`Product #${id}`)

  return (
    <PageContainer>
      <PageHeader
        title={`Product Details #${id}`}
        description="Stock history, pricing details, and performance metrics"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/products">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Products
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Package}
        title="Product Profile — Coming in the next step"
        description={`Stock adjustments, sales metrics, and profile details for product ID ${id} will be shown here.`}
        action={
          <Button variant="outline" asChild>
            <Link to="/products">Back to Products</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
