import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from '@/context/ThemeProvider'
import { AuthProvider } from '@/context/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { OfflineBanner } from '@/components/system/OfflineBanner'

function VisualViewportWatcher() {
  useVisualViewport()
  return null
}

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="tindatrack-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <MotionConfig reducedMotion="user">
              <VisualViewportWatcher />
              <OfflineBanner />
              {children}
              <Toaster richColors position="top-right" />
              {import.meta.env.DEV && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </MotionConfig>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
