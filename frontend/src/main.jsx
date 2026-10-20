import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/geist-mono'
import '@/i18n'
import './index.css'
import { initStandaloneMode } from '@/lib/standalone'
import { initPwaInstallCapture } from '@/lib/pwaInstall'

initStandaloneMode()
initPwaInstallCapture()
// Marker for scripts/check-prod-bundle.mjs: a production build must not use mock data
document.documentElement.dataset.dataSource =
  import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'api'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
