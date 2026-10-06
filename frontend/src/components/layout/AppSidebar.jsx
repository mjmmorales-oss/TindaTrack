import { Store } from 'lucide-react'
import { Link } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/layout/NavMain'
import { NavUser } from '@/components/layout/NavUser'
import { useAuth } from '@/hooks/useAuth'

export function AppSidebar({ ...props }) {
  const { user } = useAuth()
  const homePath = user?.role === 'cashier' ? '/pos' : '/dashboard'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={homePath} className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg shadow-xs">
                  <Store className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-foreground truncate text-base font-bold tracking-tight">
                    TindaTrack
                  </span>
                  <span className="text-muted-foreground truncate text-xs font-medium">
                    Tindahan ni Aling Nena
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
