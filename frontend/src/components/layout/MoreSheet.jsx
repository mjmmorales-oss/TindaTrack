import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  ChartColumn,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  Smartphone,
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
import { useOverlayStore } from '@/stores/overlayStore'
import { getAvatarUrl, getInitials } from '@/lib/avatar'

export function MoreSheet({ open, onOpenChange }) {
  const { t } = useTranslation(['nav'])
  const { user, logout } = useAuth()
  const { can } = usePermissions()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      const unregister = useOverlayStore.getState().registerModal()
      return unregister
    }
  }, [open])

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
      title: t('nav:salesHistory'),
      path: '/sales',
      icon: ReceiptText,
      visible: true,
    },
    {
      title: t('nav:categories'),
      path: '/categories',
      icon: Tags,
      visible: can('categories.manage'),
    },
    {
      title: t('nav:stockInventory'),
      path: '/inventory',
      icon: Warehouse,
      visible: can('inventory.adjust'),
    },
    {
      title: t('nav:customers'),
      path: '/customers',
      icon: Users,
      visible: can('customers.view'),
    },
    {
      title: t('nav:reportsAnalytics'),
      path: '/reports',
      icon: ChartColumn,
      visible: can('reports.view'),
    },
    {
      title: t('nav:staffAccounts'),
      path: '/staff',
      icon: UserCog,
      visible: can('staff.manage'),
    },
    {
      title: t('nav:storeSettings'),
      path: '/settings',
      icon: Settings,
      visible: can('settings.manage'),
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top)-12px)] overflow-y-auto overscroll-contain rounded-t-2xl px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="text-base font-semibold">
            {t('nav:menuTitle')}
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
            {user.role === 'owner' ? t('nav:storeOwner') : t('nav:cashier')}
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

        {/* Phones only (this sheet is md:hidden): pair this phone with the laptop's POS */}
        <Link
          to="/scan"
          onClick={() => onOpenChange(false)}
          className="border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10 mt-1 flex min-h-11 items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition-colors"
        >
          <Smartphone className="text-primary h-4 w-4 shrink-0" />
          <span className="truncate">{t('nav:usePhoneAsScanner')}</span>
        </Link>

        <Separator className="my-3" />

        <div className="space-y-2">
          <Link
            to="/account"
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <BadgeCheck className="text-muted-foreground h-4 w-4" />
              {t('nav:accountSecurity')}
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
              {t('nav:theme')}
            </span>
            <span className="text-muted-foreground text-xs">
              {theme === 'dark' ? t('nav:themeDark') : theme === 'light' ? t('nav:themeLight') : t('nav:themeSystem')}
            </span>
          </button>

          <Button
            variant="destructive"
            className="mt-4 w-full justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {t('nav:logout')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
