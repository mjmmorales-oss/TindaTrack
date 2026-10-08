import { useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton'
import { OwnerDashboard } from '@/features/dashboard/components/OwnerDashboard'
import { CashierDashboard } from '@/features/dashboard/components/CashierDashboard'

/**
 * Main Dashboard controller page supporting both store owner and cashier roles.
 * Implements all four required states: loading skeleton, error with retry, empty state, and data view.
 */
export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const [range, setRange] = useState('today')

  const { data: dashboardRes, isLoading, isError, error, refetch } = useDashboard(range)
  const { data: settingsRes } = useSettings()

  const isOwner = user?.role === 'owner'
  const dashboardData = dashboardRes?.data
  const settings = settingsRes?.data

  return (
    <PageContainer className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
      {isLoading ? (
        <DashboardSkeleton isOwner={isOwner} />
      ) : isError ? (
        <ErrorState
          title="Hindi ma-load ang Dashboard"
          description={error?.message || 'Nagkaroon ng problema habang kinukuha ang datos ng tindahan.'}
          onRetry={() => refetch()}
          className="my-8"
        />
      ) : !dashboardData ? (
        <EmptyState
          title="Walang datos na maipakita"
          description="Wala pang sapat na datos para buuin ang dashboard analytics."
          actionText="I-refresh"
          onAction={() => refetch()}
          className="my-8"
        />
      ) : isOwner ? (
        <OwnerDashboard
          dashboardData={dashboardData}
          range={range}
          onRangeChange={setRange}
          user={user}
          settings={settings}
        />
      ) : (
        <CashierDashboard
          dashboardData={dashboardData}
          user={user}
          settings={settings}
        />
      )}
    </PageContainer>
  )
}

export default DashboardPage
