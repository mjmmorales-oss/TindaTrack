import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { Download, Share2, PlusSquare, CheckCircle2, Smartphone, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

/**
 * Dialog displaying step-by-step instructions for adding PWA to home screen on iOS Safari.
 */
export function PwaInstallIosDialog({ open, onOpenChange }) {
  const { t } = useTranslation(['settings', 'common'])

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings:installIosTitle', 'How to install on iPhone/iPad')}
      description={t(
        'settings:installAppDesc',
        'Add to home screen for faster checkout and full-screen experience',
      )}
    >
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/40 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold text-foreground">Step 1</p>
            <p className="text-muted-foreground">
              {t('settings:installIosStep1', "Tap the Share button in Safari's bottom toolbar")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/40 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlusSquare className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold text-foreground">Step 2</p>
            <p className="text-muted-foreground">
              {t('settings:installIosStep2', "Scroll down and tap 'Add to Home Screen'")}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t('settings:close', 'Close')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

/**
 * Settings Card exposing PWA installation or installed status badge.
 */
export function PwaInstallCard({ className }) {
  const { t } = useTranslation(['settings', 'common'])
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [iosDialogOpen, setIosDialogOpen] = useState(false)
  const [devNoticeDismissed, setDevNoticeDismissed] = useState(false)

  const handleInstallClick = async () => {
    const res = await promptInstall()
    if (res === 'ios') {
      setIosDialogOpen(true)
    } else if (res === 'unavailable') {
      // Never a silent no-op: tell them how to install from the browser menu
      notify.info(t('settings:installUnavailableTitle'), t('settings:installUnavailableDesc'))
    }
  }

  return (
    <>
      <Card className={cn('border-border', className)}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                {t('settings:installAppTitle', 'Install TindaTrack App')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t(
                  'settings:installAppDesc',
                  'Add to home screen for faster checkout and full-screen experience',
                )}
              </CardDescription>
            </div>
            {isInstalled && (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 px-2.5 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('settings:alreadyInstalled', 'App Installed')}
              </Badge>
            )}
          </div>
        </CardHeader>
        {!isInstalled && (
          <>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {isIos
                  ? t('settings:installIosStep1', "Tap the Share button in Safari's bottom toolbar, then Add to Home Screen")
                  : t('settings:installAppDesc', 'Add to home screen for faster checkout and full-screen experience')}
              </p>
              {import.meta.env.DEV && !devNoticeDismissed && (
                <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground border border-border">
                  <span>
                    {t('settings:pwaDevNotice', 'Install is available on the production build (npm run pwa:preview) or the deployed site.')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDevNoticeDismissed(true)}
                    className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    aria-label={t('common:close', 'Close')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/70 pt-4">
              <Button
                type="button"
                onClick={handleInstallClick}
                className="gap-2 w-full sm:w-auto font-semibold"
              >
                <Download className="h-4 w-4" />
                {t('settings:installButton', 'Install App')}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      <PwaInstallIosDialog
        open={iosDialogOpen}
        onOpenChange={setIosDialogOpen}
      />
    </>
  )
}

/**
 * Top bar icon button with tooltip when beforeinstallprompt has fired and app is not installed.
 */
export function PwaInstallTopBarButton({ className }) {
  const { t } = useTranslation(['settings', 'common'])
  const { isInstalled, promptInstall, deferredPrompt } = usePwaInstall()

  // Only show when beforeinstallprompt has fired on supported browser and not already installed
  if (isInstalled || !deferredPrompt) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => promptInstall()}
          className={cn(
            'h-9 gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-medium text-xs px-2.5',
            className,
          )}
          aria-label={t('settings:installButton', 'Install App')}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">{t('settings:installButton', 'Install App')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {t('settings:installAppDesc', 'Add to home screen for faster checkout and full-screen experience')}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * One-time dismissible banner on the dashboard for mobile / installable browsers.
 */
export function PwaDashboardBanner({ className }) {
  const { t } = useTranslation(['settings', 'common'])
  const { isInstalled, isIos, isInstallable, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('tindatrack_pwa_banner_dismissed') === 'true'
    } catch {
      return false
    }
  })
  const [iosDialogOpen, setIosDialogOpen] = useState(false)

  if (isInstalled || dismissed) return null
  if (!isInstallable && !isIos) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem('tindatrack_pwa_banner_dismissed', 'true')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  const handleInstallClick = async () => {
    const res = await promptInstall()
    if (res === 'ios') {
      setIosDialogOpen(true)
    }
  }

  return (
    <>
      <div
        className={cn(
          'mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4 text-xs sm:text-sm shadow-xs transition-all',
          className,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isIos ? <Share2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {isIos
                ? t('settings:installIosTitle', 'How to install on iPhone/iPad')
                : t('settings:installAppTitle', 'Install TindaTrack App')}
            </p>
            <p className="text-muted-foreground text-xs line-clamp-1">
              {isIos
                ? t('settings:installIosStep1', "Tap the Share button in Safari's bottom toolbar, then Add to Home Screen")
                : t('settings:installAppDesc', 'Add to home screen for faster checkout and full-screen experience')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isIos ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIosDialogOpen(true)}
              className="h-8 text-xs font-medium"
            >
              {t('common:view', 'View')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('settings:installButton', 'Install App')}</span>
            </Button>
          )}

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={t('common:close', 'Close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PwaInstallIosDialog
        open={iosDialogOpen}
        onOpenChange={setIosDialogOpen}
      />
    </>
  )
}

/**
 * Dropdown item for NavUser menu.
 */
export function PwaInstallMenuItem() {
  const { t } = useTranslation(['settings', 'common'])
  const { isInstalled, promptInstall } = usePwaInstall()
  const [iosDialogOpen, setIosDialogOpen] = useState(false)

  if (isInstalled) return null

  const handleClick = async () => {
    const res = await promptInstall()
    if (res === 'ios') {
      setIosDialogOpen(true)
    }
  }

  return (
    <>
      <DropdownMenuItem
        onClick={handleClick}
        className="cursor-pointer text-primary focus:text-primary font-medium"
      >
        <Download className="mr-2 h-4 w-4" />
        {t('settings:installButton', 'Install App')}
      </DropdownMenuItem>
      <PwaInstallIosDialog
        open={iosDialogOpen}
        onOpenChange={setIosDialogOpen}
      />
    </>
  )
}
