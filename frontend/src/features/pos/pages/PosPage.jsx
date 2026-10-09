import { useState, useRef, useEffect, useMemo } from 'react'
import {
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SearchInput } from '@/components/forms/SearchInput'
import { ProductGrid } from '@/features/pos/components/ProductGrid'
import { CartPanel } from '@/features/pos/components/CartPanel'
import { MobileCartBar } from '@/features/pos/components/MobileCartBar'
import { CartDrawer } from '@/features/pos/components/CartDrawer'
import { PaymentDialog } from '@/features/pos/components/PaymentDialog'
import { ProductDetailDialog } from '@/features/pos/components/ProductDetailDialog'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useCartStore, selectCartItemCount, selectCartTotal } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { useHotkey } from '@/hooks/useHotkey'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notify } from '@/lib/notify'

/**
 * Main POS Terminal Page.
 * Implements sticky search, horizontal category filters, responsive product grid,
 * desktop right-panel cart & mobile cart drawer, cash calculator, and utang checkout.
 */
export function PosPage() {
  useDocumentTitle('POS Terminal')

  const { user } = useAuth()
  const searchInputRef = useRef(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Cart store
  const items = useCartStore((state) => state.items)
  const addToCart = useCartStore((state) => state.add)
  const setItemQuantity = useCartStore((state) => state.setQuantity)
  const removeFromCart = useCartStore((state) => state.remove)
  const clearCart = useCartStore((state) => state.clear)
  const itemCount = useCartStore(selectCartItemCount)
  const cartTotal = useCartStore(selectCartTotal)

  // Server queries
  const { data: productsRes, isLoading: isLoadingProducts } = useProducts({
    is_active: true,
    per_page: 100,
  })
  const { data: categoriesRes } = useCategories()
  const { data: customersRes } = useCustomers({ per_page: 100 })
  const { data: settingsRes } = useSettings()

  const allProducts = useMemo(() => productsRes?.data || [], [productsRes?.data])
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])
  const customers = useMemo(() => customersRes?.data || [], [customersRes?.data])
  const settings = settingsRes?.data

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let list = allProducts

    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter((p) => String(p.category_id) === String(selectedCategory))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      )
    }

    return list
  }, [allProducts, selectedCategory, searchQuery])

  // Autofocus search on desktop only on initial load
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      searchInputRef.current?.focus()
    }
  }, [])

  // Keyboard shortcut: F2 focuses search input
  useHotkey('F2', () => {
    searchInputRef.current?.focus()
  })

  // Keyboard shortcut: F9 opens payment modal
  useHotkey('F9', () => {
    if (items.length > 0) {
      setIsPaymentOpen(true)
    } else {
      notify.warning('Walang laman ang cart', 'Pumili muna ng mga paninda bago magbayad.')
    }
  })

  // Keyboard shortcut: Esc closes drawer/modals
  useHotkey('Escape', () => {
    if (isPaymentOpen) setIsPaymentOpen(false)
    if (isDrawerOpen) setIsDrawerOpen(false)
    if (isPreviewOpen) setIsPreviewOpen(false)
  })

  // Handle barcode / SKU scan on Enter
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = searchQuery.trim().toLowerCase()
      if (!term) return

      // 1. Look for exact barcode match
      let match = allProducts.find((p) => p.barcode && p.barcode.toLowerCase() === term)
      // 2. Look for exact SKU match
      if (!match) {
        match = allProducts.find((p) => p.sku && p.sku.toLowerCase() === term)
      }
      // 3. If single filtered product, pick it
      if (!match && filteredProducts.length === 1) {
        match = filteredProducts[0]
      }

      if (match) {
        e.preventDefault()
        if (match.stock_quantity <= 0) {
          notify.error('Out of Stock', `Ubos na ang stock ng "${match.name}".`)
        } else {
          addToCart(match, 1)
          notify.success(`+1 ${match.name}`, 'Idinagdag sa cart.')
          setSearchQuery('')
        }
      }
    }
  }

  const handleAddToCart = (product) => {
    addToCart(product, 1)
  }

  const handleViewProduct = (product) => {
    setPreviewProduct(product)
    setIsPreviewOpen(true)
  }

  const handleResetCartAndRefocus = () => {
    clearCart()
    setSearchQuery('')
    if (window.innerWidth >= 1024) {
      setTimeout(() => searchInputRef.current?.focus(), 150)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:flex-row overflow-hidden bg-background">
      {/* LEFT COLUMN: Products catalog view */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* Sticky Top Filter Area */}
        <div className="border-b border-border/80 bg-background/95 px-3 py-2.5 sm:px-4 sm:py-3 shrink-0 backdrop-blur-md space-y-2 z-10 print:hidden">
          {/* Search Bar Row */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                ref={searchInputRef}
                value={searchQuery}
                onChange={setSearchQuery}
                onKeyDown={handleSearchKeyDown}
                onClear={() => setSearchQuery('')}
                placeholder="Maghanap ng pangalan, SKU, o i-scan ang barcode (F2)..."
                showKbdHint={true}
                className="w-full h-10 text-sm"
              />
            </div>
            {searchQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-10 text-xs px-2.5 shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Linisin
              </Button>
            )}
          </div>

          {/* Category Chips Horizontal ScrollArea */}
          <div className="flex items-center overflow-x-auto no-scrollbar py-0.5">
            <ToggleGroup
              type="single"
              value={selectedCategory}
              onValueChange={(val) => {
                if (val !== undefined) setSelectedCategory(val || 'all')
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 snap-x snap-mandatory flex-nowrap"
            >
              <ToggleGroupItem
                value="all"
                className="h-8 shrink-0 snap-start text-xs font-semibold px-3 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Lahat (All)
              </ToggleGroupItem>
              {categories.map((cat) => (
                <ToggleGroupItem
                  key={cat.id}
                  value={String(cat.id)}
                  className="h-8 shrink-0 snap-start text-xs font-medium px-3 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {cat.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Scrollable Product Grid */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 pb-24 lg:pb-6">
          <ProductGrid
            products={filteredProducts}
            isLoading={isLoadingProducts}
            onAddToCart={handleAddToCart}
            onViewProduct={handleViewProduct}
            onClearFilter={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Desktop Cart Panel (lg+) */}
      <div className="hidden lg:flex h-full print:hidden">
        <CartPanel
          items={items}
          itemCount={itemCount}
          total={cartTotal}
          onQuantityChange={setItemQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onOpenPayment={() => setIsPaymentOpen(true)}
        />
      </div>

      {/* MOBILE STICKY CART BAR (< lg) */}
      <MobileCartBar
        itemCount={itemCount}
        total={cartTotal}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenPayment={() => setIsPaymentOpen(true)}
      />

      {/* MOBILE CART DRAWER (< lg) */}
      <CartDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        items={items}
        itemCount={itemCount}
        total={cartTotal}
        onQuantityChange={setItemQuantity}
        onRemove={removeFromCart}
        onClear={clearCart}
        onOpenPayment={() => setIsPaymentOpen(true)}
      />

      {/* PAYMENT & CHECKOUT MODAL */}
      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        cartItems={items}
        total={cartTotal}
        customers={customers}
        settings={settings}
        currentUser={user}
        onSuccessNewSale={handleResetCartAndRefocus}
      />

      {/* QUICK PRODUCT PREVIEW MODAL */}
      <ProductDetailDialog
        product={previewProduct}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}

export default PosPage
