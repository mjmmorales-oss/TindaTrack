import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English (Default)',
    description: 'Natural English terminology across all POS views and reports',
  },
  {
    code: 'fil',
    label: 'Filipino',
    nativeLabel: 'Filipino (Taglish)',
    description: 'Pamilyar na salitang tindahan (Utang, Suki, Sukli, Benta)',
  },
]

/**
 * Universal language switcher supporting card, compact dropdown, and menu variants.
 *
 * @param {object} props
 * @param {'card' | 'compact' | 'menu'} [props.variant='compact']
 * @param {string} [props.className]
 */
export function LanguageSwitcher({ variant = 'compact', className }) {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.language || 'en'

  const handleSelectLanguage = (code) => {
    if (code !== currentLang) {
      i18n.changeLanguage(code)
    }
  }

  if (variant === 'card') {
    return (
      <Card className={cn('border-border', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              {t('settings:languageCardTitle', 'Language Preferences')}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t(
              'settings:languageCardDesc',
              'Choose your preferred language for the TindaTrack interface'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={cn(
                    'flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer relative',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-sm text-foreground">
                      {lang.nativeLabel}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {lang.description}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact dropdown (for topbars, headers, public layout)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1.5 px-2 text-xs font-medium', className)}
          aria-label={t('nav:language', 'Language')}
        >
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="uppercase font-mono text-[11px] tracking-wider">
            {currentLang === 'fil' ? 'FIL' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelectLanguage(lang.code)}
            className="flex items-center justify-between text-xs cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeLabel}</span>
              <span className="text-[10px] text-muted-foreground">{lang.label}</span>
            </div>
            {currentLang === lang.code && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
