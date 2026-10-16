import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { initStandaloneMode } from '@/lib/standalone'
import { PwaInstallCard } from '@/components/common/PwaInstallPrompt'
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt'
import { toast } from 'sonner'

// Mock virtual:pwa-register/react
let mockNeedRefresh = false
const mockUpdateServiceWorker = vi.fn()

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}))

vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      if (typeof fallback === 'string') return fallback
      if (key === 'settings:installAppTitle') return 'Install TindaTrack App'
      if (key === 'settings:installButton') return 'Install App'
      if (key === 'settings:alreadyInstalled') return 'App Installed'
      if (key === 'settings:newVersionAvailable') return 'A new version is available'
      if (key === 'settings:reload') return 'Reload'
      if (key === 'settings:installIosTitle') return 'How to install on iPhone/iPad'
      if (key === 'settings:installIosStep1') return "Tap the Share button in Safari's bottom toolbar"
      if (key === 'settings:installIosStep2') return "Scroll down and tap 'Add to Home Screen'"
      return fallback || key
    },
  }),
}))

function mockMedia(matcher) {
  return vi.fn().mockImplementation((query) => ({
    matches: typeof matcher === 'function' ? matcher(query) : Boolean(matcher),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('PWA Specifications & Native Shell', () => {
  const originalUserAgent = navigator.userAgent
  let originalMatchMedia

  beforeEach(() => {
    mockNeedRefresh = false
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-standalone')
    originalMatchMedia = window.matchMedia
    window.matchMedia = mockMedia(false)
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    })
    window.matchMedia = originalMatchMedia
    delete window.navigator.standalone
  })

  describe('Standalone Attribute Detection', () => {
    it('sets data-standalone="true" on <html> when display-mode: standalone matches', () => {
      window.matchMedia = mockMedia((q) => q.includes('display-mode: standalone'))

      initStandaloneMode()
      expect(document.documentElement.getAttribute('data-standalone')).toBe('true')
    })

    it('sets data-standalone="true" on <html> when navigator.standalone is true (iOS)', () => {
      window.matchMedia = mockMedia(false)
      window.navigator.standalone = true

      initStandaloneMode()
      expect(document.documentElement.getAttribute('data-standalone')).toBe('true')
    })

    it('does not set data-standalone when running in standard browser tab', () => {
      window.matchMedia = mockMedia(false)
      window.navigator.standalone = false

      initStandaloneMode()
      expect(document.documentElement.getAttribute('data-standalone')).toBeNull()
    })
  })

  describe('Install Helper and UI States', () => {
    it('shows iOS step sheet on iOS user agent when install is clicked', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        configurable: true,
      })
      window.navigator.standalone = false
      window.matchMedia = mockMedia(false)

      render(<PwaInstallCard />)

      const installButton = screen.getByRole('button', { name: /install/i })
      expect(installButton).toBeInTheDocument()

      fireEvent.click(installButton)

      expect(await screen.findByText(/How to install on iPhone\/iPad/i)).toBeInTheDocument()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent(/Tap the Share button/i)
      expect(dialog).toHaveTextContent(/Scroll down and tap 'Add to Home Screen'/i)
    })

    it('triggers prompt() when beforeinstallprompt fires and install is clicked', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36',
        configurable: true,
      })
      window.matchMedia = mockMedia(false)

      render(<PwaInstallCard />)

      const promptSpy = vi.fn().mockResolvedValue(undefined)
      const event = new Event('beforeinstallprompt')
      event.prompt = promptSpy
      event.userChoice = Promise.resolve({ outcome: 'accepted' })
      event.preventDefault = vi.fn()

      act(() => {
        window.dispatchEvent(event)
      })

      const installBtn = screen.getByRole('button', { name: /install/i })
      await act(async () => {
        fireEvent.click(installBtn)
      })

      expect(promptSpy).toHaveBeenCalled()
    })

    it('hides install button and shows "App Installed" badge when in standalone mode', () => {
      window.matchMedia = mockMedia((q) => q.includes('display-mode: standalone'))

      render(<PwaInstallCard />)

      expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument()
      expect(screen.getByText('App Installed')).toBeInTheDocument()
    })
  })

  describe('Update Prompt & Toast', () => {
    it('triggers sonner toast with reload action when needRefresh is true', () => {
      mockNeedRefresh = true
      render(<PwaUpdatePrompt />)

      expect(toast).toHaveBeenCalledWith(
        'A new version is available',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Reload',
          }),
        }),
      )
    })
  })
})
