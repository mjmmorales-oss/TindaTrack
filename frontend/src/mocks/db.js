import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateMockHistory } from './generators/index.js'

export const DB_STORAGE_KEY = 'tindatrack-mockdb-v1'

/**
 * Creates the fresh initial state generated from seeds.
 */
function createInitialDatabase() {
  const generated = generateMockHistory()
  return {
    settings: generated.settings,
    staff: generated.staff,
    categories: generated.categories,
    products: generated.products,
    customers: generated.customers,
    sales: generated.sales,
    utangPayments: generated.utangPayments,
    stockMovements: generated.stockMovements,
    nextIds: {
      category: Math.max(...generated.categories.map((c) => c.id), 0) + 1,
      product: Math.max(...generated.products.map((p) => p.id), 0) + 1,
      customer: Math.max(...generated.customers.map((c) => c.id), 0) + 1,
      sale: Math.max(...generated.sales.map((s) => s.id), 0) + 1,
      payment: Math.max(...generated.utangPayments.map((p) => p.id), 0) + 1,
      movement: Math.max(...generated.stockMovements.map((m) => m.id), 0) + 1,
    },
  }
}

/**
 * Zustand store representing the client-side mock MySQL database.
 * Persisted in localStorage under `tindatrack-mockdb-v1`.
 */
export const useMockDb = create(
  persist(
    (set, _get) => ({
      ...createInitialDatabase(),

      /**
       * Completely resets demo data back to newly generated seeds.
       */
      resetDemoData: () => {
        const fresh = createInitialDatabase()
        set(fresh)
        return fresh
      },

      /**
       * Updates settings table.
       */
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      /**
       * Mutates or updates product items.
       */
      setProducts: (updater) => {
        set((state) => ({
          products: typeof updater === 'function' ? updater(state.products) : updater,
        }))
      },

      /**
       * Mutates or updates customer items.
       */
      setCustomers: (updater) => {
        set((state) => ({
          customers: typeof updater === 'function' ? updater(state.customers) : updater,
        }))
      },

      /**
       * Mutates or updates sales items.
       */
      setSales: (updater) => {
        set((state) => ({
          sales: typeof updater === 'function' ? updater(state.sales) : updater,
        }))
      },

      /**
       * Mutates or updates utang payments.
       */
      setUtangPayments: (updater) => {
        set((state) => ({
          utangPayments:
            typeof updater === 'function' ? updater(state.utangPayments) : updater,
        }))
      },

      /**
       * Mutates or updates stock movements.
       */
      setStockMovements: (updater) => {
        set((state) => ({
          stockMovements:
            typeof updater === 'function' ? updater(state.stockMovements) : updater,
        }))
      },

      /**
       * Mutates or updates categories.
       */
      setCategories: (updater) => {
        set((state) => ({
          categories:
            typeof updater === 'function' ? updater(state.categories) : updater,
        }))
      },

      /**
       * Mutates or updates staff users.
       */
      setStaff: (updater) => {
        set((state) => ({
          staff: typeof updater === 'function' ? updater(state.staff) : updater,
        }))
      },
    }),
    {
      name: DB_STORAGE_KEY,
    },
  ),
)

export default useMockDb
