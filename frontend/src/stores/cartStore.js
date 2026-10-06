import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

/**
 * Zustand persisted store for POS Shopping Cart.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      heldCarts: [], // Placeholder for parked carts (Phase 3)

      /**
       * Adds a product to the cart or increments existing quantity up to available stock.
       */
      add: (product, quantity = 1) => {
        const stock = product.stock_quantity ?? product.stock ?? 999
        if (stock <= 0) return

        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.product_id === product.id,
          )

          if (existingIndex !== -1) {
            const currentItem = state.items[existingIndex]
            const newQty = Math.min(stock, currentItem.quantity + quantity)
            const updatedItems = [...state.items]
            updatedItems[existingIndex] = {
              ...currentItem,
              quantity: newQty,
              stock,
            }
            return { items: updatedItems }
          }

          const newItem = {
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: Math.min(stock, Math.max(1, quantity)),
            stock,
            sku: product.sku,
            unit: product.unit || 'pc',
          }

          return { items: [...state.items, newItem] }
        })
      },

      /**
       * Increments an item's quantity by 1, clamped to stock.
       */
      increment: (productId) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.product_id === productId) {
              return {
                ...item,
                quantity: Math.min(item.stock, item.quantity + 1),
              }
            }
            return item
          }),
        }))
      },

      /**
       * Decrements an item's quantity by 1; removes if it reaches 0.
       */
      decrement: (productId) => {
        set((state) => {
          const item = state.items.find((i) => i.product_id === productId)
          if (!item) return state

          if (item.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.product_id !== productId),
            }
          }

          return {
            items: state.items.map((i) =>
              i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i,
            ),
          }
        })
      },

      /**
       * Sets exact quantity, clamped between 1 and available stock.
       */
      setQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.product_id === productId) {
              const clamped = Math.max(1, Math.min(item.stock, parseInt(quantity, 10) || 1))
              return { ...item, quantity: clamped }
            }
            return item
          }),
        }))
      },

      /**
       * Removes an item from the cart.
       */
      remove: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
        }))
      },

      /**
       * Clears all items in current cart.
       */
      clear: () => set({ items: [] }),

      /**
       * Holds current cart into heldCarts array (max 3).
       */
      holdCurrentCart: () => {
        const { items, heldCarts } = get()
        if (items.length === 0 || heldCarts.length >= 3) return
        set({
          heldCarts: [...heldCarts, { id: Date.now(), items, savedAt: new Date().toISOString() }],
          items: [],
        })
      },

      /**
       * Restores a held cart back to active cart.
       */
      restoreHeldCart: (index) => {
        const { heldCarts } = get()
        if (!heldCarts[index]) return
        const target = heldCarts[index]
        set({
          items: target.items,
          heldCarts: heldCarts.filter((_, i) => i !== index),
        })
      },
    }),
    {
      name: 'tindatrack-cart-v1',
    },
  ),
)

/**
 * Selectors for cart item count and total currency amount.
 */
export const selectCartItemCount = (state) =>
  state.items.reduce((acc, item) => acc + item.quantity, 0)

export const selectCartTotal = (state) =>
  toMoney(state.items.reduce((acc, item) => acc + item.quantity * item.price, 0))

export default useCartStore
