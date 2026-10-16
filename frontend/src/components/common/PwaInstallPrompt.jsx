import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Share2, PlusSquare, CheckCircle2, Smartphone } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
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

  const handleInstallClick = async () => {
    const res = await promptInstall()
    if (res === 'ios') {
      setIosDialogOpen(true)
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
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {isIos
                  ? t('settings:installIosStep1', "Tap the Share button in Safari's bottom toolbar, then Add to Home Screen")
                  : t('settings:installAppDesc', 'Add to home screen for faster checkout and full-screen experience')}
              </p>
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
