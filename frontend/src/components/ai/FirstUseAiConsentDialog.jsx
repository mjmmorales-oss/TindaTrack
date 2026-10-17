import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ShieldCheck,
  EyeOff,
  Database,
  CheckCircle2,
} from 'lucide-react'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'

/**
 * FirstUseAiConsentDialog Component.
 *
 * Mandatory first-use privacy and safety disclosure shown to users before
 * their first AI camera basket scan or AI product intake.
 *
 * Discloses that photos are analyzed via Google Gemini cloud services, warns
 * against capturing faces/sensitive info, notes Google free-tier training policies,
 * and reminds cashiers that AI outputs are suggestions requiring human verification.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {() => void} props.onAccept - Consent accepted callback
 * @param {() => void} [props.onDecline] - Consent declined callback
 */
export function FirstUseAiConsentDialog({
  open,
  onOpenChange,
  onAccept,
  onDecline,
}) {
  const { t } = useTranslation(['pos', 'common'])

  const handleAccept = () => {
    onAccept?.()
    onOpenChange?.(false)
  }

  const handleDecline = () => {
    onDecline?.()
    onOpenChange?.(false)
  }

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleDecline}
        className="min-h-[44px] h-11 sm:h-10 text-xs font-medium w-full sm:w-auto"
      >
        {t('pos:aiConsentDecline', 'Not Now')}
      </Button>
      <Button
        type="button"
        onClick={handleAccept}
        className="min-h-[44px] h-11 sm:h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold w-full sm:w-auto shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        <span>{t('pos:aiConsentAccept', 'I Understand & Accept')}</span>
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          onDecline?.()
        }
        onOpenChange?.(val)
      }}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span>{t('pos:aiConsentTitle', 'AI Privacy & Image Usage Notice')}</span>
        </div>
      }
      description={t(
        'pos:aiConsentDesc',
        'Please review how images and data are handled before using AI features.',
      )}
      footer={footer}
      className="sm:max-w-lg"
    >
      <div className="space-y-4 py-2">
        {/* Core Notice Callout */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5 text-xs text-foreground leading-relaxed">
          <p className="font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>TindaTrack AI Notice</span>
          </p>
          <p className="text-muted-foreground">
            {t(
              'pos:aiConsentNotice',
              "Photos are sent to Google Gemini for analysis. Do not include people's faces. Free-tier data may be used by Google to improve its models. Results are suggestions; always review before adding.",
            )}
          </p>
        </div>

        {/* Feature & Privacy Highlights */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Item 1: Cloud Vision */}
          <div className="rounded-xl border border-border/70 p-3 bg-card space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{t('pos:aiConsentCloudTitle', 'Cloud Vision Analysis')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t(
                'pos:aiConsentCloudDesc',
                'Photos are sent to Google Gemini for basket detection and catalog matching.',
              )}
            </p>
          </div>

          {/* Item 2: No Faces */}
          <div className="rounded-xl border border-border/70 p-3 bg-card space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <EyeOff className="h-3.5 w-3.5 text-warning" />
              <span>{t('pos:aiConsentPrivacyTitle', 'No Faces or Personal Data')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t(
                'pos:aiConsentPrivacyDesc',
                "Do not capture people's faces, customers, or private personal information.",
              )}
            </p>
          </div>

          {/* Item 3: Google Free-Tier Policy */}
          <div className="rounded-xl border border-border/70 p-3 bg-card space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>{t('pos:aiConsentGoogleTitle', 'Google Free-Tier Policy')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t(
                'pos:aiConsentGoogleDesc',
                'Free-tier data may be used by Google to improve its AI models.',
              )}
            </p>
          </div>

          {/* Item 4: Human Review */}
          <div className="rounded-xl border border-border/70 p-3 bg-card space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>{t('pos:aiConsentReviewTitle', 'Review Before Adding')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t(
                'pos:aiConsentReviewDesc',
                'Results are suggestions; always review detected items and prices before confirming.',
              )}
            </p>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default FirstUseAiConsentDialog
