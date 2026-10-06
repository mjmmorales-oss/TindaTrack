import { RotateCcw, Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SettingsPage() {
  useDocumentTitle('Store Settings')

  return (
    <PageContainer>
      <PageHeader
        title="Store Settings"
        description="Configure tindahan profile, receipt headers/footers, default reorder levels, and demo data"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10">
              <RotateCcw className="h-4 w-4" />
              Reset Demo Data
            </Button>
            <Button size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        }
      />

      <EmptyState
        icon={Settings}
        title="Settings Tabs — Coming in the next step"
        description="Store profile settings, receipt customizer, inventory threshold controls, and demo data resetting will appear here."
      />
    </PageContainer>
  )
}
