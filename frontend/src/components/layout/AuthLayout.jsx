import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react'
import { ModeToggle } from '@/components/common/ModeToggle'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh w-full">
      {/* Brand panel on lg+ */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-emerald-950 p-12 text-white lg:flex">
        {/* Subtle decorative dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient glow */}
        <div className="bg-primary/25 pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-highlight/20 pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full blur-3xl" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-xl shadow-md">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-white">
              TindaTrack
            </span>
            <span className="block text-xs font-medium text-emerald-300">
              {t('auth:brandTagline', 'POS & Inventory System')}
            </span>
          </div>
        </div>

        {/* Hero tagline & highlights */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/80 bg-emerald-900/60 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-xs">
            <Sparkles className="text-highlight h-3.5 w-3.5" />
            <span>{t('auth:badgeSariSari', 'Built for sari-sari stores')}</span>
          </div>

          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-white">
            {t('auth:heroTitle', 'Your store, organized and thriving.')}
          </h1>

          <p className="text-base leading-relaxed text-emerald-100/80">
            {t(
              'auth:heroSubtitle',
              'Fast POS checkout, real-time stock alerts, and clear customer credit ledgers — all in one modern system.'
            )}
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm text-emerald-100">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{t('auth:featureOffline', 'Offline-friendly POS with instant change calculator')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-100">
              <TrendingUp className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{t('auth:featureAlerts', 'Real-time stock depletion alerts')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-100">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{t('auth:featureUtang', 'Built-in credit ledger & limit protections')}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-emerald-800/50 pt-6 text-xs text-emerald-400/80">
          <span>{t('auth:footerProject', 'School Project · Integrative Programming')}</span>
          <span className="flex items-center gap-2">
            <span>SDG 1 No Poverty</span>
            <span>•</span>
            <span>SDG 8 Decent Work</span>
          </span>
        </div>
      </div>

      {/* Auth Content Area */}
      <div className="bg-background relative flex w-full flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12">
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <LanguageSwitcher variant="compact" />
          <ModeToggle />
        </div>

        {/* Mobile Header */}
        <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
          <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-xl shadow-xs">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <span className="text-foreground text-xl font-bold tracking-tight">
              TindaTrack
            </span>
            <span className="text-muted-foreground block text-[11px] font-medium">
              Sari-Sari Store POS
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
