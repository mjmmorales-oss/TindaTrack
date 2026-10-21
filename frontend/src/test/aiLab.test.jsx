import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, renderRoute } from './renderRoute'
import { AiLabPage } from '@/features/ai-lab/pages/AiLabPage'
import { AiMetricsTab } from '@/features/ai-lab/components/AiMetricsTab'
import { AiExperimentsTab } from '@/features/ai-lab/components/AiExperimentsTab'

describe('AI Research Lab (Task A7)', () => {
  let consoleErrors = []
  let originalConsoleError

  beforeEach(() => {
    consoleErrors = []
    originalConsoleError = console.error
    console.error = (...args) => {
      consoleErrors.push(args)
      originalConsoleError(...args)
    }
  })

  afterEach(() => {
    cleanup()
    // Reset any scroll lock left on body by Radix
    document.body.removeAttribute('data-scroll-locked')
    document.body.style.pointerEvents = 'auto'
    console.error = originalConsoleError
  })

  it('renders AiLabPage header and tabs', async () => {
    renderWithProviders(<AiLabPage />, { role: 'owner' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI Research Lab/i)
    expect(screen.getByRole('tab', { name: /Metrics Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Controlled Experiments/i })).toBeInTheDocument()
  })

  it('renders AiMetricsTab with basket scan accuracy and checkout timing section', async () => {
    renderWithProviders(<AiMetricsTab />, { role: 'owner' })

    // Check presence of key section headers and labels
    await waitFor(() => {
      expect(screen.getByText(/POS Basket Scans/i)).toBeInTheDocument()
      expect(screen.getByText(/Product Intake & Visual Search/i)).toBeInTheDocument()
      expect(screen.getByText(/Checkout Duration by Dominant Add Method/i)).toBeInTheDocument()
    })

    // Wait for async metric queries to resolve into StatCards
    await waitFor(() => {
      expect(screen.getAllByText(/Item Precision/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Item Recall/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Exact Qty Accuracy/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Mean Qty Error/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Calibration Hint/i).length).toBeGreaterThan(0)
    })
  })

  it('renders AiExperimentsTab with experiment selector, summary banner, and test cases', async () => {
    renderWithProviders(<AiExperimentsTab />, { role: 'owner' })

    // Verify benchmark summary after query resolves
    await waitFor(
      () => {
        expect(screen.getAllByText(/Controlled Basket Evaluation/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/Total Cases/i)).toBeInTheDocument()
        expect(screen.getByText(/Exact Match Rate/i)).toBeInTheDocument()
        expect(screen.getAllByText(/Avg Latency/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )

    // Table rows
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getAllByText(/Exact Match/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Partial/i)).toBeInTheDocument()
  })

  it('opens and closes the New Test Case dialog in AiExperimentsTab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AiExperimentsTab />, { role: 'owner' })

    await waitFor(() => {
      expect(screen.getAllByText(/Controlled Basket Evaluation/i).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /New Test Case/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /New Test Case/i }))

    await waitFor(() => {
      expect(screen.getByText(/Add Controlled Test Case/i)).toBeInTheDocument()
      expect(screen.getByText(/1\. Photo Capture/i)).toBeInTheDocument()
      expect(screen.getByText(/2\. Ground Truth Specification/i)).toBeInTheDocument()
    })

    // Cancel dialog
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Add Controlled Test Case/i)).not.toBeInTheDocument()
    })
  })

  it('opens ConfirmDialog when Reset Experiment is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AiExperimentsTab />, { role: 'owner' })

    // Wait until cases are loaded so Reset button is enabled
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      const resetBtn = screen.getByRole('button', { name: /Reset Experiment/i })
      expect(resetBtn).not.toBeDisabled()
    })

    const resetBtn = screen.getByRole('button', { name: /Reset Experiment/i })
    await user.click(resetBtn)

    await waitFor(() => {
      expect(screen.getByText(/Reset Experiment Cases\?/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Clear Cases/i })).toBeInTheDocument()
    })
  })

  it('routes to /ai-lab for owner role in route tests', async () => {
    renderRoute('/ai-lab', { role: 'owner' })

    // Lazy route: allow for a loaded CI machine (the default 1 s flaked under the full suite)
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI Research Lab/i)
      },
      { timeout: 10000 },
    )
  })
})
