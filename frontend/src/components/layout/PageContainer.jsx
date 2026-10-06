import { cn } from '@/lib/utils'

export function PageContainer({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8 space-y-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
