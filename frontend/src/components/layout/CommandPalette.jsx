import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  LayoutDashboard,
  ScanBarcode,
  ReceiptText,
  Package,
  Tags,
  Warehouse,
  Users,
  NotebookPen,
  ChartColumn,
  UserCog,
  Settings,
  User,
  PlusCircle,
  CreditCard,
  ShoppingBag,
} from 'lucide-react'

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Money } from '@/components/common/Money'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { useProducts } from '@/features/products/hooks/useProducts'

export function CommandPalette({ open, onOpenChange }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can, role } = usePermissions()

  // Query active products for quick search
  const { data: productsRes } = useProducts({ is_active: true, per_page: 50 })
  const products = productsRes?.data || []

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange])

  const runCommand = (command) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('common:commandPalettePlaceholder', 'Type a command, page, or search products...')} />
      <CommandList>
        <CommandEmpty>{t('common:noResultsFound', 'No results found.')}</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading={t('common:quickActions', 'Quick Actions')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/pos'))}>
            <ScanBarcode className="mr-2 h-4 w-4 text-primary" />
            <span>{t('common:newSaleAction', 'New POS Sale')}</span>
          </CommandItem>
          {can('products.manage') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/products?action=new'))}>
              <PlusCircle className="mr-2 h-4 w-4 text-success" />
              <span>{t('common:addProductAction', 'Add New Product')}</span>
            </CommandItem>
          )}
          {can('utang.record_payment') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/utang?action=payment'))}>
              <CreditCard className="mr-2 h-4 w-4 text-utang" />
              <span>{t('common:recordPaymentAction', 'Record Utang Payment')}</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading={t('common:navigation', 'Navigation')}>
          {role === 'owner' && (
            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
              <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Dashboard</span>
            </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate('/pos'))}>
            <ScanBarcode className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>POS Terminal</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/sales'))}>
            <ReceiptText className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('common:salesNav', 'Sales History')}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/products'))}>
            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('common:productsNav', 'Products')}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/customers'))}>
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('common:customersNav', 'Customers & Suki')}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/utang'))}>
            <NotebookPen className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('common:utangNav', 'Utang Ledger')}</span>
          </CommandItem>

          {role === 'owner' && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/categories'))}>
                <Tags className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t('common:categoriesNav', 'Categories')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/inventory'))}>
                <Warehouse className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t('common:inventoryNav', 'Inventory & Stock')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/reports'))}>
                <ChartColumn className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t('common:reportsNav', 'Reports')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/staff'))}>
                <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t('common:staffNav', 'Staff & Cashiers')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t('common:settingsNav', 'Store Settings')}</span>
              </CommandItem>
            </>
          )}

          <CommandItem onSelect={() => runCommand(() => navigate('/account'))}>
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('common:profileNav', 'My Account')}</span>
          </CommandItem>
        </CommandGroup>

        {/* Product Quick-Search */}
        {products.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('common:productQuickSearch', 'Quick Product Search')}>
              {products.slice(0, 15).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku || ''} ${p.barcode || ''}`}
                  onSelect={() => runCommand(() => navigate(`/products/${p.id}`))}
                >
                  <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground truncate block">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {p.sku || t('common:noSku', 'No SKU')} · Stock: {p.stock_quantity ?? p.stock ?? 0}
                    </span>
                  </div>
                  <Money amount={p.price} size="xs" className="font-mono font-semibold ml-2" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export default CommandPalette
