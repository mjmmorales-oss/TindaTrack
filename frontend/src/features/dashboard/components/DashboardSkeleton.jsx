import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Loading skeleton matching the dashboard grid layout.
 *
 * @param {{ isOwner?: boolean }} props
 */
export function DashboardSkeleton({ isOwner = true }) {
  return (
    <div className="space-y-6">
      {/* Greeting & Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 md:w-80" />
          <Skeleton className="h-4 w-40 md:w-56" />
        </div>
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>

      {/* KPI 4 Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <CardContent className="space-y-3 p-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 sm:w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-28 sm:h-8 sm:w-36" />
              <Skeleton className="h-3 w-20 sm:w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {isOwner ? (
        <>
          {/* Charts Row Skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[260px] w-full rounded-lg" />
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <Skeleton className="h-[220px] w-[220px] rounded-full" />
              </CardContent>
            </Card>
          </div>

          {/* 3 Columns Section Skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-44" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between py-1">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* Cashier Shift Skeleton */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardSkeleton
