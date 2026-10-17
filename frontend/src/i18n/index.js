import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '@/locales/en/common.json'
import enNav from '@/locales/en/nav.json'
import enAuth from '@/locales/en/auth.json'
import enLanding from '@/locales/en/landing.json'
import enDashboard from '@/locales/en/dashboard.json'
import enPos from '@/locales/en/pos.json'
import enProducts from '@/locales/en/products.json'
import enInventory from '@/locales/en/inventory.json'
import enCategories from '@/locales/en/categories.json'
import enSales from '@/locales/en/sales.json'
import enCustomers from '@/locales/en/customers.json'
import enUtang from '@/locales/en/utang.json'
import enReports from '@/locales/en/reports.json'
import enUsers from '@/locales/en/users.json'
import enSettings from '@/locales/en/settings.json'
import enScanner from '@/locales/en/scanner.json'
import enValidation from '@/locales/en/validation.json'
import enErrors from '@/locales/en/errors.json'
import enAiLab from '@/locales/en/aiLab.json'

import filCommon from '@/locales/fil/common.json'
import filNav from '@/locales/fil/nav.json'
import filAuth from '@/locales/fil/auth.json'
import filLanding from '@/locales/fil/landing.json'
import filDashboard from '@/locales/fil/dashboard.json'
import filPos from '@/locales/fil/pos.json'
import filProducts from '@/locales/fil/products.json'
import filInventory from '@/locales/fil/inventory.json'
import filCategories from '@/locales/fil/categories.json'
import filSales from '@/locales/fil/sales.json'
import filCustomers from '@/locales/fil/customers.json'
import filUtang from '@/locales/fil/utang.json'
import filReports from '@/locales/fil/reports.json'
import filUsers from '@/locales/fil/users.json'
import filSettings from '@/locales/fil/settings.json'
import filScanner from '@/locales/fil/scanner.json'
import filValidation from '@/locales/fil/validation.json'
import filErrors from '@/locales/fil/errors.json'
import filAiLab from '@/locales/fil/aiLab.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English (Default)' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino (Taglish)' },
]

export const getStoredLanguage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('tt_lang')
      if (stored === 'en' || stored === 'fil') {
        return stored
      }
    }
  } catch {
    // ignore localStorage errors
  }
  return 'en'
}

export const setStoredLanguage = (lng) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('tt_lang', lng)
    }
  } catch {
    // ignore
  }
}

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    landing: enLanding,
    dashboard: enDashboard,
    pos: enPos,
    products: enProducts,
    inventory: enInventory,
    categories: enCategories,
    sales: enSales,
    customers: enCustomers,
    utang: enUtang,
    reports: enReports,
    users: enUsers,
    settings: enSettings,
    scanner: enScanner,
    validation: enValidation,
    errors: enErrors,
    aiLab: enAiLab,
  },
  fil: {
    common: filCommon,
    nav: filNav,
    auth: filAuth,
    landing: filLanding,
    dashboard: filDashboard,
    pos: filPos,
    products: filProducts,
    inventory: filInventory,
    categories: filCategories,
    sales: filSales,
    customers: filCustomers,
    utang: filUtang,
    reports: filReports,
    users: filUsers,
    settings: filSettings,
    scanner: filScanner,
    validation: filValidation,
    errors: filErrors,
    aiLab: filAiLab,
  },
}

const initialLang = getStoredLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fil'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  })

// Sync document element lang attribute
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || initialLang
}

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
  setStoredLanguage(lng)
})

export default i18n
