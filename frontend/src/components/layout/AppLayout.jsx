import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
