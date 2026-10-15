import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { StaffPage } from '../pages/StaffPage'
import { AuthContext } from '@/context/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createTestQueryClient } from '@/test/renderRoute'
import { resetTestMockDb } from '@/test/server'
import { useMockDb } from '@/mocks/db'

function renderStaffPage(currentUserOverrides = {}) {
  const queryClient = createTestQueryClient()
  const defaultUser = {
    id: 1,
    name: 'Nena Dela Cruz',
    email: 'owner@mock.local',
    role: 'owner',
    is_active: true,
  }

  const authValue = {
    user: { ...defaultUser, ...currentUserOverrides },
    status: 'authenticated',
    role: currentUserOverrides.role || 'owner',
    isOwner: (currentUserOverrides.role || 'owner') === 'owner',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    updateUser: vi.fn(),
  }

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <TooltipProvider>
            <StaffPage />
          </TooltipProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('Staff Management Feature Tests (Task U4)', () => {
  beforeEach(() => {
    resetTestMockDb()
    useMockDb.getState().setStaff([
      {
        id: 1,
        name: 'Nena Dela Cruz',
        email: 'owner@mock.local',
        phone: '09171234567',
        role: 'owner',
        is_active: true,
        must_change_password: false,
        deleted_at: null,
        last_login_at: '2026-10-07T08:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        name: 'Juan Dela Cruz',
        email: 'cashier@mock.local',
        phone: '09181234567',
        role: 'cashier',
        is_active: true,
        must_change_password: true,
        deleted_at: null,
        last_login_at: '2026-10-07T07:30:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 3,
        name: 'Bea Santos',
        email: 'inactive@mock.local',
        phone: null,
        role: 'cashier',
        is_active: false,
        must_change_password: false,
        deleted_at: null,
        last_login_at: '2026-09-15T12:00:00.000Z',
        created_at: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 4,
        name: 'Pedro Penduko',
        email: 'archived@mock.local',
        phone: null,
        role: 'cashier',
        is_active: false,
        must_change_password: false,
        deleted_at: '2026-10-01T00:00:00.000Z',
        last_login_at: null,
        created_at: '2026-02-01T00:00:00.000Z',
      },
    ])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders staff table with active staff members', async () => {
    renderStaffPage()

    expect(await screen.findByText(/Staff & Cashier Accounts|Mga Account ng Staff/i)).toBeInTheDocument()

    // Check active users in table (findAllByText handles desktop table + mobile card)
    const nenaElements = await screen.findAllByText('Nena Dela Cruz')
    expect(nenaElements.length).toBeGreaterThan(0)

    const juanElements = await screen.findAllByText('Juan Dela Cruz')
    expect(juanElements.length).toBeGreaterThan(0)

    // Inactive & archived users should not appear in active tab
    expect(screen.queryByText('Bea Santos')).toBeNull()
    expect(screen.queryByText('Pedro Penduko')).toBeNull()
  })

  it('filters list when switching to Inactive and Archived tabs', async () => {
    const user = userEvent.setup()
    renderStaffPage()

    // Click Inactive tab
    const inactiveTab = await screen.findByRole('tab', { name: /Inactive|Hindi Aktibo/i })
    await user.click(inactiveTab)

    // Inactive user appears
    const beaElements = await screen.findAllByText('Bea Santos')
    expect(beaElements.length).toBeGreaterThan(0)
    expect(screen.queryByText('Juan Dela Cruz')).toBeNull()

    // Click Archived tab
    const archivedTab = await screen.findByRole('tab', { name: /Archived|Naka-archive/i })
    await user.click(archivedTab)

    // Archived user appears
    const pedroElements = await screen.findAllByText('Pedro Penduko')
    expect(pedroElements.length).toBeGreaterThan(0)
    expect(screen.queryByText('Bea Santos')).toBeNull()
  })

  it('opens Add Staff modal, creates cashier with generated password, and displays Temporary Password modal with Copy button', async () => {
    renderStaffPage()

    // Click Add Cashier button
    const addButton = await screen.findByRole('button', { name: /Add Cashier|Magdagdag ng Kahera/i })
    fireEvent.click(addButton)

    // Modal opens
    expect(await screen.findByText(/Add New Cashier|Magdagdag ng Bagong Kahera/i)).toBeInTheDocument()

    // Fill form
    const nameInput = screen.getByPlaceholderText(/e\.g\. Maria Santos|Hal\. Maria Santos/i)
    const emailInput = screen.getByPlaceholderText(/maria@tindahan\.local/i)

    fireEvent.change(nameInput, { target: { value: 'Rizalina Santos' } })
    fireEvent.change(emailInput, { target: { value: 'rizalina@mock.local' } })

    // Submit
    const saveButton = screen.getByRole('button', { name: /Save Cashier|I-save ang Kahera/i })
    fireEvent.click(saveButton)

    // Temporary password ready dialog should appear
    expect(
      await screen.findByText(/Temporary Password Ready|Handa na ang Pansamantalang Password/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument()

    // Copy Password button exists
    const copyButton = screen.getByRole('button', { name: /Copy Password|Kopyahin ang Password/i })
    expect(copyButton).toBeInTheDocument()
  })

  it('disables self-deactivation switch for currently logged-in user', async () => {
    renderStaffPage({ id: 1, role: 'owner' })

    const switches = await screen.findAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)

    // First switch belongs to Nena (id: 1, currentUser), should be disabled
    expect(switches[0]).toBeDisabled()
  })

  it('opens staff details drawer when clicking on a staff member', async () => {
    renderStaffPage({ id: 1, role: 'owner' })

    const juanItems = await screen.findAllByText('Juan Dela Cruz')
    expect(juanItems.length).toBeGreaterThan(0)

    // Click on Juan Dela Cruz
    fireEvent.click(juanItems[0])

    // Detail modal opens
    expect(
      await screen.findByText(/Staff Details|Mga Detalye ng Staff/i),
    ).toBeInTheDocument()
  })
})
