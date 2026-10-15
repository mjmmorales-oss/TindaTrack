import { create } from 'zustand'

/**
 * Zustand store to explicitly track active overlays/modals/drawers/sheets.
 * Used to coordinate hiding mobile bottom navigation and floating action elements
 * when a modal or sheet is open.
 */
export const useOverlayStore = create((set) => ({
  activeModalCount: 0,

  /**
   * Register an open modal/sheet/drawer.
   * Returns a cleanup unregister function.
   * @returns {() => void}
   */
  registerModal: () => {
    set((state) => ({ activeModalCount: state.activeModalCount + 1 }))
    return () => {
      set((state) => ({ activeModalCount: Math.max(0, state.activeModalCount - 1) }))
    }
  },

  /**
   * Reset the active modal count (e.g., on route navigation or tests).
   */
  reset: () => set({ activeModalCount: 0 }),
}))

export const selectIsAnyModalOpen = (state) => state.activeModalCount > 0

export default useOverlayStore
