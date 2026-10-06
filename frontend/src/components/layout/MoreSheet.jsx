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
    { title: 'Sales History', path: '/sales', icon: ReceiptText, visible: true },
    { title: 'Categories', path: '/categories', icon: Tags, visible: can('categories.manage') },
    { title: 'Stock & Inventory', path: '/inventory', icon: Warehouse, visible: can('inventory.adjust') },
    { title: 'Customers', path: '/customers', icon: Users, visible: can('customers.view') },
    { title: 'Reports & Analytics', path: '/reports', icon: ChartColumn, visible: can('reports.view') },
    { title: 'Staff Accounts', path: '/staff', icon: UserCog, visible: can('staff.manage') },
    { title: 'Store Settings', path: '/settings', icon: Settings, visible: can('settings.manage') },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-5 pb-8 pt-4">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-base font-semibold">TindaTrack Menu</SheetTitle>
        </SheetHeader>

        {/* User profile card */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 mb-4">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge
            variant={user.role === 'owner' ? 'default' : 'secondary'}
            className="text-[10px] uppercase font-bold"
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
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
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
            className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              Account & Security
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
              Appearance
            </span>
            <span className="text-xs text-muted-foreground capitalize">{theme}</span>
          </button>

          <Button
            variant="destructive"
            className="w-full justify-center gap-2 mt-4"
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
