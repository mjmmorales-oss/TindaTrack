import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import {
  CategoryFormDialog,
  ICON_OPTIONS,
} from '@/features/categories/components/CategoryFormDialog'
import { useCategories, useDeleteCategory } from '@/features/categories/hooks/useCategories'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

/**
 * Visual Category Management grid for Store Owners.
 * Displays category cards with custom icons, color chips, product counts, and delete guards.
 */
export function CategoriesPage() {
  const { t } = useTranslation(['categories', 'common'])
  useDocumentTitle(t('categories:pageTitle'))

  const { data: categoriesRes, isLoading, isError, error, refetch } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])

  const deleteMutation = useDeleteCategory()

  // Modal states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [blockedTarget, setBlockedTarget] = useState(null)

  const iconMap = useMemo(() => {
    const map = {}
    ICON_OPTIONS.forEach((item) => {
      map[item.name] = item.component
    })
    return map
  }, [])

  const handleCreate = () => {
    setEditingCategory(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (cat) => {
    setEditingCategory(cat)
    setFormDialogOpen(true)
  }

  const handleDeleteClick = (cat) => {
    if (cat.product_count > 0) {
      setBlockedTarget(cat)
    } else {
      setDeleteTarget(cat)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <PageContainer className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 space-y-6">
      <PageHeader
        title={t('categories:pageTitle')}
        description={t('categories:pageSubtitle')}
        actions={
          <Button onClick={handleCreate} className="h-11 sm:h-9 w-full sm:w-auto gap-1.5 shadow-xs font-semibold">
            <Plus className="h-4 w-4" />
            {t('categories:addCategory')}
          </Button>
        }
      />

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="pt-2 border-t border-border/50 flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title={t('categories:loadErrorTitle')}
          description={error?.message || t('categories:loadErrorDesc')}
          onRetry={refetch}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('categories:emptyTitle')}
          description={t('categories:emptyDesc')}
          actionText={t('categories:addCategory')}
          onAction={handleCreate}
        />
      ) : (
        /* Category Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => {
            const IconComponent = iconMap[cat.icon] || Package
            const colorClass = cat.color || 'bg-primary/20 text-primary border-primary/40'

            return (
              <Card
                key={cat.id}
                className="group relative flex flex-col justify-between overflow-hidden border-border/80 transition-all hover:border-primary/50 hover:shadow-xs"
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  {/* Color chip & Icon */}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs transition-transform group-hover:scale-105',
                      colorClass,
                    )}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>

                  {/* 44px Action Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground"
                        aria-label={t('categories:categoryActionAria', { name: cat.name })}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => handleEdit(cat)}
                        className="gap-2 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t('categories:edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(cat)}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('categories:delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-2 pt-2">
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
                      {cat.description || t('categories:noDesc')}
                    </p>
                  </div>

                  {/* Product Count & Link to Products */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                    <span className="font-mono text-muted-foreground">
                      <strong className="text-foreground font-semibold">
                        {cat.product_count}
                      </strong>{' '}
                      {cat.product_count === 1
                        ? t('categories:productCountSingle', { count: cat.product_count })
                        : t('categories:productCountPlural', { count: cat.product_count })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 px-2 text-xs text-primary hover:text-primary gap-1"
                    >
                      <Link to={`/products?category_id=${cat.id}`}>
                        {t('categories:view')}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <CategoryFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        category={editingCategory}
        onSuccess={refetch}
      />

      {/* Delete Confirmation Modal (When 0 products) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(val) => !val && setDeleteTarget(null)}
        title={t('categories:deleteConfirmTitleNamed', { name: deleteTarget?.name })}
        description={t('categories:deleteConfirmSafeDesc')}
        confirmText={t('categories:confirmDelete')}
        cancelText={t('common:cancel')}
        tone="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Delete Blocked Dialog (When products exist) */}
      <ResponsiveDialog
        open={!!blockedTarget}
        onOpenChange={(val) => !val && setBlockedTarget(null)}
        title={t('categories:cannotDeleteTitle')}
        description={t('categories:cannotDeleteDescNamed', { name: blockedTarget?.name })}
        className="sm:max-w-md"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlockedTarget(null)}
            >
              {t('categories:understood')}
            </Button>
            <Button
              asChild
              onClick={() => setBlockedTarget(null)}
              className="gap-1.5"
            >
              <Link to={`/products?category_id=${blockedTarget?.id}`}>
                {t('categories:moveProducts')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <Alert variant="destructive" className="py-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">
              {t('categories:integrityGuardTitle')}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
              {t('categories:integrityGuardDesc', { count: blockedTarget?.product_count })}
            </AlertDescription>
          </Alert>

          <p className="text-xs text-muted-foreground">
            {t('categories:integrityGuardPrompt')}
          </p>
        </div>
      </ResponsiveDialog>
    </PageContainer>
  )
}

export default CategoriesPage
