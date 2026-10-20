import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@/services/api/apiClient.js'
import { friendlyError } from '@/lib/notify'
import { ApiError } from '@/lib/mockApi'

/** v2.2 Phase C regressions for API-only paths that the mock used to hide. */
describe('C: API services send what Laravel expects', () => {
  afterEach(() => vi.restoreAllMocks())

  it('staffService.update uses PATCH (PUT was a 405) and list sends flat query params', async () => {
    const { staffService } = await import('@/services/api/staffService.js')
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} })
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] })

    await staffService.update(7, { name: 'Juan' })
    await staffService.list({ status: 'archived', search: 'ju' })

    expect(patch).toHaveBeenCalledWith('/users/7', { name: 'Juan' })
    expect(get).toHaveBeenCalledWith('/users', { status: 'archived', search: 'ju' })
  })

  it('AI metrics / CSV pass params as the query and responseType as config', async () => {
    const { aiService } = await import('@/services/api/aiService.js')
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue('a,b\n1,2')

    await aiService.getMetrics({ from: '2026-10-01', to: '2026-10-21' })
    await aiService.exportMetricsCsv({ from: '2026-10-01' })

    expect(get.mock.calls[0]).toEqual(['/ai/metrics', { from: '2026-10-01', to: '2026-10-21' }])
    expect(get.mock.calls[1]).toEqual(['/ai/metrics/export.csv', { from: '2026-10-01' }, { responseType: 'text' }])
  })

  it('utangService.recordPayment returns { payment, new_balance } like the mock', async () => {
    const { utangService } = await import('@/services/api/utangService.js')
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: 3, amount: 50, customer: { id: 1, credit_balance: 120 } },
      message: 'Debt payment recorded successfully.',
    })

    const res = await utangService.recordPayment(1, { amount: 50 })
    expect(res.data.payment.amount).toBe(50)
    expect(res.data.new_balance).toBe(120)
  })
})

describe('C3: friendlyError never shows raw framework text', () => {
  const err = (status, data) => new ApiError(status, data)

  it('maps statuses and AI codes to plain language', () => {
    expect(friendlyError(err(404, { message: 'The route api/foo could not be found.' }))).toMatch(/not found|hindi mahanap/i)
    expect(friendlyError(err(405, { message: 'The PUT method is not supported for route api/users/1.' }))).toMatch(/refresh/i)
    expect(friendlyError(err(500, { message: 'Server Error' }))).toMatch(/server/i)
    expect(friendlyError(err(413, { message: 'Payload Too Large' }))).toMatch(/too large|malaki/i)
    expect(friendlyError(err(429, { message: 'Too Many Attempts.' }))).toMatch(/too many|try again/i)
    expect(friendlyError(err(429, { message: 'x', code: 'ai_daily_limit' }))).toMatch(/barcode/i)
    expect(friendlyError(err(0, { message: 'Network Error' }))).toMatch(/server|internet/i)
  })

  it('keeps validation and domain messages from our controllers', () => {
    expect(friendlyError(err(422, { message: 'The amount paid now (₱100) can’t be more than the total.' }))).toMatch(/amount paid now/)
    expect(friendlyError(err(403, { message: 'You cannot view receipts belonging to another cashier.' }))).toMatch(/another cashier/)
  })

  it('ApiError keeps code/reason from the payload (pairing errors, AI limits)', () => {
    const e = err(422, { message: 'Pairing code expired.', reason: 'expired', code: 'x' })
    expect(e.response.data.reason).toBe('expired')
    expect(e.reason).toBe('expired')
  })
})

describe('C: phone scan events are never replayed into the cart', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('a second subscription to the same session resumes after the last event', async () => {
    const scanner = await import('@/services/scanner.js')
    const events = [
      { id: 1, barcode: '111' },
      { id: 2, barcode: '222' },
    ]
    vi.spyOn(scanner, 'listScannerEvents').mockImplementation(async (_id, after) =>
      events.filter((e) => e.id > (after || 0)),
    )
    const { subscribeToScanner } = await import('@/lib/realtime')

    const first = vi.fn()
    const unsubFirst = subscribeToScanner('sess-1', { onEvent: first })
    await vi.advanceTimersByTimeAsync(10)
    unsubFirst()
    expect(first.mock.calls.map(([e]) => e.id)).toEqual([1, 2])

    // e.g. the POS re-subscribes after a sale refreshed its product list
    const second = vi.fn()
    const unsubSecond = subscribeToScanner('sess-1', { onEvent: second })
    await vi.advanceTimersByTimeAsync(2000)
    unsubSecond()
    expect(second).not.toHaveBeenCalled()
  })
})

describe('C: staff temporary password uses the Laravel key', () => {
  it('mock create/reset return temporary_password (UserController shape)', async () => {
    const { useMockDb } = await import('@/mocks/db')
    useMockDb.getState().resetDemoData()
    const mockStaff = (await import('@/services/mock/staffService.js')).default
    const res = await mockStaff.create({ name: 'Test Cashier', email: 'new.cashier@example.com', role: 'cashier', generate_password: true })
    expect(res.temporary_password).toEqual(expect.any(String))
    expect(res).not.toHaveProperty('temp_password')
  })
})

describe('C: one shared units list', () => {
  it('the product schema accepts every unit AI Stock-In can save', async () => {
    const { productSchema, PRODUCT_UNIT_VALUES } = await import('@/features/products/schemas')
    for (const unit of ['box', 'roll', 'bag', 'g', 'ml', 'pc', 'L']) {
      expect(PRODUCT_UNIT_VALUES).toContain(unit)
      expect(productSchema.shape.unit.safeParse(unit).success).toBe(true)
    }
    expect(productSchema.shape.unit.safeParse('banana').success).toBe(false)
  })
})
