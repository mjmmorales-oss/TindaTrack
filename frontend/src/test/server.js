import { useMockDb } from '@/mocks/db'

// Force mock data source for tests
import.meta.env.VITE_DATA_SOURCE = 'mock'

/**
 * Reset mock database to fresh demo seeds
 */
export function resetTestMockDb() {
  import.meta.env.VITE_DATA_SOURCE = 'mock'
  return useMockDb.getState().resetDemoData()
}
