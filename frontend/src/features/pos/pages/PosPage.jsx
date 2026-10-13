import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  ScanBarcode,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchInput } from '@/components/forms/SearchInput'
import { ProductGrid } from '@/features/pos/components/ProductGrid'
import { CartPanel } from '@/features/pos/components/CartPanel'
import { MobileCartBar } from '@/features/pos/components/MobileCartBar'
import { CartDrawer } from '@/features/pos/components/CartDrawer'
import { PaymentDialog } from '@/features/pos/components/PaymentDialog'
import { ProductDetailDialog } from '@/features/pos/components/ProductDetailDialog'
import { ScannerSheet } from '@/components/scanner/ScannerSheet'
import { PairPhoneDialog } from '@/components/scanner/PairPhoneDialog'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useCartStore, selectCartItemCount, selectCartTotal } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { useHotkey } from '@/hooks/useHotkey'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Barcode } from '@/lib/barcode'
import { beep } from '@/lib/feedback'
import { lookupBarcode } from '@/services/barcode'
import { getScannerSession, endScannerSession } from '@/services/scanner'
import { subscribeToScanner } from '@/lib/realtime'
import { notify } from '@/lib/notify'

const POS_SCANNER_SESSION_KEY = 'tt_pos_scanner_session'

/**
 * Main POS Terminal Page.
 * Implements sticky search, horizontal category filters, responsive product grid,
 * desktop right-panel cart & mobile cart drawer, cash calculator, utang checkout,
 * and live barcode scanning (Webcam, USB Wedge, Phone sync).
 */
export function PosPage() {
  const { t } = useTranslation(['pos', 'common', 'scanner'])
  useDocumentTitle(t('pos:title', 'POS Terminal'))

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

  // Scanner states
  const [isScannerSheetOpen, setIsScannerSheetOpen] = useState(false)
  const [isPairDialogOpen, setIsPairDialogOpen] = useState(false)
  const [pairedSession, setPairedSession] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(POS_SCANNER_SESSION_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (!parsed?.expires_at || new Date(parsed.expires_at) > new Date()) {
            return parsed
          }
          sessionStorage.removeItem(POS_SCANNER_SESSION_KEY)
        }
      } catch {
        // ignore
      }
    }
    return null
  })
  const [isScannerOnline, setIsScannerOnline] = useState(false)

  // Quick product create for unknown barcodes (owner)
  const [isRegisterProductOpen, setIsRegisterProductOpen] = useState(false)
  const [registerBarcodeProduct, setRegisterBarcodeProduct] = useState(null)

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

  // Shared scan handler for all sources (wedge, webcam, phone, search)
  const handleScannedCode = useCallback(
    async (rawCode, options = {}) => {
      if (!rawCode) return
      const normalized = Barcode.normalize(String(rawCode))
      if (!normalized) return

      // 1. Resolve product locally first (exact barcode match)
      let product = allProducts.find(
        (p) => p.is_active && p.barcode && Barcode.normalize(p.barcode) === normalized,
      )

      // 2. If not found in loaded product list, call lookupBarcode
      if (!product) {
        try {
          const res = await lookupBarcode(normalized)
          if (res?.local_product) {
            product = res.local_product
          } else {
            // Unknown product
            if (user?.role === 'owner') {
              notify.info(t('pos:notRegistered', 'Not registered yet'), t('pos:notRegisteredBarcode', { barcode: normalized, defaultValue: `Barcode: ${normalized}` }), {
                action: {
                  label: t('pos:registerProduct', 'Register product'),
                  onClick: () => {
                    setRegisterBarcodeProduct({
                      barcode: normalized,
                      name: res?.catalog?.name || '',
                      brand: res?.catalog?.brand || '',
                      size: res?.catalog?.size || '',
                      image_url: res?.catalog?.image_url || '',
                      category_id: res?.catalog?.suggested_category_id || '',
                      source: res?.catalog?.source || 'manual',
                    })
                    setIsRegisterProductOpen(true)
                  },
                },
              })
            } else {
              notify.warning(
                t('pos:notRegistered', 'Not registered yet'),
                t('pos:notRegisteredDescCashier', 'This barcode is not registered yet. Please inform the store owner.'),
              )
            }
            return
          }
        } catch (err) {
          notify.error(t('pos:lookupFailed', 'Barcode lookup failed'), err?.message)
          return
        }
      }

      // Check stock
      const stock = Number(product.stock_quantity ?? product.stock ?? 0)
      if (stock <= 0) {
        notify.warning(t('pos:outOfStock', 'Out of Stock'), t('pos:stockEmptyWarning', { name: product.name, defaultValue: `Out of stock for "${product.name}".` }))
        return
      }

      // Found and in stock!
      const qty = Number(options?.quantity || options?.event?.quantity) || 1
      addToCart(product, qty)
      beep()
      notify.success(`+${qty} ${product.name}`, t('pos:addedToCart', { name: product.name, defaultValue: `Added: ${product.name}` }))
    },
    [allProducts, user, addToCart, t],
  )

  // Hardware scanner wedge support
  useBarcodeWedge({
    onBarcode: (code) => {
      handleScannedCode(code, { source: 'wedge' })
    },
    enabled: true,
  })

  // Live phone scanner subscription
  useEffect(() => {
    if (!pairedSession?.id) return

    const unsub = subscribeToScanner(pairedSession.id, {
      onEvent: (event) => {
        setIsScannerOnline(true)
        if (event?.barcode) {
          handleScannedCode(event.barcode, { source: 'phone', event })
        }
      },
    })

    // Periodic check for session online / ended status
    const timer = setInterval(async () => {
      try {
        const status = await getScannerSession(pairedSession.id)
        if (status?.ended_at) {
          setPairedSession(null)
          setIsScannerOnline(false)
          sessionStorage.removeItem(POS_SCANNER_SESSION_KEY)
          notify.info(t('scanner:sessionExpired', 'Session Expired'), t('pos:sessionEnded', 'Phone scanner session has ended.'))
        } else {
          setIsScannerOnline(Boolean(status?.online))
        }
      } catch {
        // ignore
      }
    }, 5000)

    return () => {
      unsub()
      clearInterval(timer)
    }
  }, [pairedSession?.id, handleScannedCode, t])

  const handleDisconnectScanner = async () => {
    if (!pairedSession?.id) return
    try {
      await endScannerSession(pairedSession.id)
    } catch {
      // ignore
    }
    setPairedSession(null)
    setIsScannerOnline(false)
    sessionStorage.removeItem(POS_SCANNER_SESSION_KEY)
    notify.info(t('scanner:disconnect', 'Disconnect'), t('pos:phoneDisconnected', 'Phone scanner disconnected.'))
  }

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
      notify.warning(t('pos:cartEmptyTitle', 'Your cart is empty'), t('pos:cartEmptyDesc', 'Scan a barcode or click a product to add it to this sale.'))
    }
  })

  // Keyboard shortcut: Esc closes drawer/modals
  useHotkey('Escape', () => {
    if (isPaymentOpen) setIsPaymentOpen(false)
    if (isDrawerOpen) setIsDrawerOpen(false)
    if (isPreviewOpen) setIsPreviewOpen(false)
    if (isScannerSheetOpen) setIsScannerSheetOpen(false)
    if (isPairDialogOpen) setIsPairDialogOpen(false)
    if (isRegisterProductOpen) setIsRegisterProductOpen(false)
  })

  // Handle barcode / SKU scan on Enter in search box
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = searchQuery.trim()
      if (!term) return

      // If term matches a barcode format or exact barcode, delegate to scan handler
      const normalized = Barcode.normalize(term)
      const exactBarcode = allProducts.find(
        (p) => p.barcode && Barcode.normalize(p.barcode) === normalized,
      )
      if (exactBarcode || Barcode.isValidGtin(normalized)) {
        e.preventDefault()
        handleScannedCode(term, { source: 'search' })
        setSearchQuery('')
        return
      }

      // Look for exact SKU match
      let match = allProducts.find((p) => p.sku && p.sku.toLowerCase() === term.toLowerCase())
      // If single filtered product, pick it
      if (!match && filteredProducts.length === 1) {
        match = filteredProducts[0]
      }

      if (match) {
        e.preventDefault()
        if (match.stock_quantity <= 0) {
          notify.error(t('pos:outOfStock', 'Out of Stock'), t('pos:stockEmptyWarning', { name: match.name, defaultValue: `Out of stock for "${match.name}".` }))
        } else {
          addToCart(match, 1)
          notify.success(`+1 ${match.name}`, t('pos:addedToCart', { name: match.name, defaultValue: `Added: ${match.name}` }))
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
        {/* Sticky Top Filter Area with Search & Scanner Actions */}
        <div className="border-b border-border/80 bg-background/95 px-3 py-2.5 sm:px-4 sm:py-3 shrink-0 backdrop-blur-md space-y-2 z-10 print:hidden">
          {/* Search Bar & Actions Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchInput
                ref={searchInputRef}
                value={searchQuery}
                onChange={setSearchQuery}
                onKeyDown={handleSearchKeyDown}
                onClear={() => setSearchQuery('')}
                placeholder={t('pos:searchPlaceholder', 'Search products (name, barcode, SKU)...')}
                showKbdHint={true}
                data-barcode-input="true"
                className="w-full h-10 text-sm"
              />
            </div>

            {/* Actions: Scan, Pair Phone, Phone Badge */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScannerSheetOpen(true)}
                className="h-10 text-xs font-semibold px-3 gap-1.5"
              >
                <ScanBarcode className="h-4 w-4 text-primary" />
                {t('pos:scanWithCamera', 'Scan')}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPairDialogOpen(true)}
                className="h-10 text-xs font-semibold px-3 gap-1.5"
              >
                <Smartphone className="h-4 w-4 text-primary" />
                {t('pos:connectPhone', 'Connect Phone')}
              </Button>

              {pairedSession && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 text-xs font-medium px-3 gap-2 border border-border"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span className="hidden md:inline">Phone:</span>
                      <span
                        className={`flex items-center gap-1.5 font-semibold ${
                          isScannerOnline ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isScannerOnline ? 'bg-success animate-pulse' : 'bg-muted-foreground'
                          }`}
                        />
                        {isScannerOnline ? 'Online' : 'Offline'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleDisconnectScanner}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      {t('pos:disconnectPhone', 'Disconnect Phone')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-10 text-xs px-2.5 shrink-0 sm:hidden"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('pos:clearCart', 'Clear')}
                </Button>
              )}
            </div>
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
                {t('common:all', 'All')}
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

      {/* CONTINUOUS CAMERA SCANNER SHEET */}
      <ScannerSheet
        open={isScannerSheetOpen}
        onOpenChange={setIsScannerSheetOpen}
        continuous={true}
        title={t('pos:scanSheetTitle', 'Scan Barcode in POS')}
        onDetected={(code) => handleScannedCode(code, { source: 'camera' })}
      />

      {/* PHONE PAIRING MODAL */}
      <PairPhoneDialog
        open={isPairDialogOpen}
        onOpenChange={setIsPairDialogOpen}
        mode="pos"
        onPaired={(session) => {
          setPairedSession(session)
          setIsScannerOnline(true)
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(POS_SCANNER_SESSION_KEY, JSON.stringify(session))
          }
        }}
      />

      {/* QUICK PRODUCT CREATE FOR UNKNOWN BARCODES (OWNER) */}
      {user?.role === 'owner' && (
        <ProductFormDialog
          open={isRegisterProductOpen}
          onOpenChange={setIsRegisterProductOpen}
          product={registerBarcodeProduct}
          categories={categories}
          onSuccess={() => {
            setIsRegisterProductOpen(false)
            setRegisterBarcodeProduct(null)
          }}
        />
      )}
    </div>
  )
}

export default PosPage
