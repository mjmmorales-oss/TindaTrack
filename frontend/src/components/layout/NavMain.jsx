import { NavLink } from 'react-router'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from '@/components/ui/sidebar'
import { NAV_GROUPS } from '@/config/nav'
import { usePermissions } from '@/hooks/usePermissions'
import { useLowStockProducts } from '@/features/products/hooks/useProducts'
import { useUtangSummary } from '@/features/utang/hooks/useUtang'

export function NavMain() {
  const { can } = usePermissions()

  const { data: lowStockRes } = useLowStockProducts()
  const { data: utangSummaryRes } = useUtangSummary()

  const lowStockCount = lowStockRes?.data?.length || 0
  const overdueUtangCount = utangSummaryRes?.data?.overdue_count || 0

  const getBadgeValue = (key) => {
    if (key === 'lowStock') return lowStockCount
    if (key === 'overdueUtang') return overdueUtangCount
    return 0
  }

  // Filter groups and items based on abilities
  const accessibleGroups = NAV_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) => {
      if (!item.ability) return true
      return can(item.ability)
    })
    return {
      ...group,
      items: visibleItems,
    }
  }).filter((group) => group.items.length > 0)

  return (
    <>
      {accessibleGroups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/70'
                      }
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badgeKey && getBadgeValue(item.badgeKey) > 0 && (
                    <SidebarMenuBadge className={
                      item.badgeKey === 'lowStock'
                        ? 'bg-warning/20 text-warning-foreground font-mono text-xs font-semibold'
                        : 'bg-destructive/20 text-destructive-foreground font-mono text-xs font-semibold'
                    }>
                      {getBadgeValue(item.badgeKey)}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
