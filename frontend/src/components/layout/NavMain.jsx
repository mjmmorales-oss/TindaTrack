import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const { data: lowStockRes } = useLowStockProducts()
  const { data: utangSummaryRes } = useUtangSummary()

  const lowStockCount = lowStockRes?.data?.length || 0
  const overdueUtangCount = utangSummaryRes?.data?.overdue_count || 0

  const getBadgeValue = (key) => {
    if (key === 'lowStock') return lowStockCount
    if (key === 'overdueUtang') return overdueUtangCount
    return 0
  }

  const getGroupTitle = (group) => {
    const keyMap = {
      Overview: t('nav:overviewGroup', 'Overview'),
      Inventory: t('nav:inventoryGroup', 'Inventory'),
      Customers: t('nav:customersGroup', 'Customers'),
      Insights: t('nav:insightsGroup', 'Insights'),
      Admin: t('nav:adminGroup', 'Admin'),
    }
    return keyMap[group.title] || group.title
  }

  const getItemTitle = (item) => {
    const keyMap = {
      '/dashboard': t('nav:dashboard', 'Dashboard'),
      '/pos': t('nav:pos', 'Point of Sale'),
      '/sales': t('nav:sales', 'Sales History'),
      '/products': t('nav:products', 'Products'),
      '/categories': t('nav:categories', 'Categories'),
      '/inventory': t('nav:inventory', 'Inventory'),
      '/customers': t('nav:customers', 'Customers'),
      '/utang': t('nav:utang', 'Utang / Credit'),
      '/reports': t('nav:reports', 'Reports'),
      '/staff': t('nav:staff', 'Staff Management'),
      '/settings': t('nav:settings', 'Settings'),
    }
    return keyMap[item.path] || item.title
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
          <SidebarGroupLabel>{getGroupTitle(group)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon
              const translatedTitle = getItemTitle(item)
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={translatedTitle}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/70'
                      }
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span>{translatedTitle}</span>
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
