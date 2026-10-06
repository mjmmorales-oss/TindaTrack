import { Link, useNavigate } from 'react-router'
import {
  BadgeCheck,
  ChartColumn,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  Sun,
  Tags,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/context/ThemeProvider'
import { getAvatarUrl, getInitials } from '@/lib/avatar'

export function MoreSheet({ open, onOpenChange }) {
  const { user, logout } = useAuth()
  const { can } = usePermissions()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    onOpenChange(false)
    await logout()
    navigate('/login')
  }

  const avatarUrl = getAvatarUrl(user.name || user.email)
  const initials = getInitials(user.name || user.email)

  const moreLinks = [
    {
      title: 'Sales History',
      path: '/sales',
      icon: ReceiptText,
      visible: true,
    },
    {
      title: 'Categories',
      path: '/categories',
      icon: Tags,
      visible: can('categories.manage'),
    },
    {
      title: 'Stock & Inventory',
      path: '/inventory',
      icon: Warehouse,
      visible: can('inventory.adjust'),
    },
    {
      title: 'Customers',
      path: '/customers',
      icon: Users,
      visible: can('customers.view'),
    },
    {
      title: 'Reports & Analytics',
      path: '/reports',
      icon: ChartColumn,
      visible: can('reports.view'),
    },
    {
      title: 'Staff Accounts',
      path: '/staff',
      icon: UserCog,
      visible: can('staff.manage'),
    },
    {
      title: 'Store Settings',
      path: '/settings',
      icon: Settings,
      visible: can('settings.manage'),
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pt-4 pb-8"
      >
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="text-base font-semibold">
            TindaTrack Menu
          </SheetTitle>
        </SheetHeader>

        {/* User profile card */}
        <div className="bg-muted/60 mb-4 flex items-center gap-3 rounded-xl p-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
          <Badge
            variant={user.role === 'owner' ? 'default' : 'secondary'}
            className="text-[10px] font-bold uppercase"
          >
            {user.role}
          </Badge>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-2 py-2">
          {moreLinks
            .filter((link) => link.visible)
            .map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => onOpenChange(false)}
                  className="border-border/60 bg-card text-foreground hover:bg-muted/70 flex items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition-colors"
                >
                  <Icon className="text-primary h-4 w-4 shrink-0" />
                  <span className="truncate">{link.title}</span>
                </Link>
              )
            })}
        </div>

        <Separator className="my-3" />

        <div className="space-y-2">
          <Link
            to="/account"
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <BadgeCheck className="text-muted-foreground h-4 w-4" />
              Account & Security
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="text-muted-foreground h-4 w-4" />
              ) : (
                <Moon className="text-muted-foreground h-4 w-4" />
              )}
              Appearance
            </span>
            <span className="text-muted-foreground text-xs capitalize">
              {theme}
            </span>
          </button>

          <Button
            variant="destructive"
            className="mt-4 w-full justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
