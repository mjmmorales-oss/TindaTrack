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

export function NavMain() {
  const { can } = usePermissions()

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
                  {item.badgeKey && (
                    <SidebarMenuBadge className="bg-highlight/20 text-highlight-foreground text-xs font-semibold">
                      •
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
