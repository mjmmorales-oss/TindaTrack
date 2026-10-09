import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ThemeProvider } from '@/context/ThemeProvider'
import { AuthContext } from '@/context/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionConfig } from 'motion/react'
import { routes } from '@/app/router'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function createMockAuthValue(role = 'owner', overrides = {}) {
  const isGuest = role === 'guest' || !role
  const user = isGuest
    ? null
    : {
        id: role === 'owner' ? 'usr_mock_001' : 'usr_mock_002',
        name: role === 'owner' ? 'Aling Nena' : 'Maria Santos',
        email: role === 'owner' ? 'nena@tindatrack.ph' : 'maria@tindatrack.ph',
        role,
        status: 'active',
        created_at: new Date().toISOString(),
      }

  return {
    user,
    status: isGuest ? 'guest' : 'authenticated',
    role: user?.role || null,
    isOwner: user?.role === 'owner',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  }
}

export function renderRoute(initialPath = '/', options = {}) {
  const {
    role = 'owner',
    queryClient = createTestQueryClient(),
    authOverrides = {},
    ...renderOptions
  } = options

  const authValue = createMockAuthValue(role, authOverrides)

  const memoryRouter = createMemoryRouter(routes, {
    initialEntries: [initialPath],
    initialIndex: 0,
  })

  return {
    ...render(
      <ThemeProvider defaultTheme="light" storageKey="tindatrack-theme-test">
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <TooltipProvider delayDuration={0}>
              <MotionConfig reducedMotion="always">
                <RouterProvider router={memoryRouter} />
              </MotionConfig>
            </TooltipProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>,
      renderOptions,
    ),
    router: memoryRouter,
    queryClient,
  }
}

export function renderWithProviders(ui, options = {}) {
  const {
    role = 'owner',
    route = '/',
    queryClient = createTestQueryClient(),
    authOverrides = {},
    ...renderOptions
  } = options

  const authValue = createMockAuthValue(role, authOverrides)

  return {
    ...render(
      <ThemeProvider defaultTheme="light" storageKey="tindatrack-theme-test">
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <TooltipProvider delayDuration={0}>
              <MotionConfig reducedMotion="always">
                <MemoryRouter initialEntries={[route]}>
                  {ui}
                </MemoryRouter>
              </MotionConfig>
            </TooltipProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>,
      renderOptions,
    ),
    queryClient,
  }
}
