import { useState, useEffect } from 'react'
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
import { usePermissions } from '@/hooks/usePermissions'
import { useProducts } from '@/features/products/hooks/useProducts'

export function CommandPalette({ open, onOpenChange }) {
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
      <CommandInput placeholder="Mag-type ng utos, pahina, o maghanap ng paninda..." />
      <CommandList>
        <CommandEmpty>Walang nahanap na resulta.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Mabilisang Aksyon (Quick Actions)">
          <CommandItem onSelect={() => runCommand(() => navigate('/pos'))}>
            <ScanBarcode className="mr-2 h-4 w-4 text-primary" />
            <span>Bagong Benta sa POS (New Sale)</span>
          </CommandItem>
          {can('products.manage') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/products?action=new'))}>
              <PlusCircle className="mr-2 h-4 w-4 text-success" />
              <span>Magdagdag ng Bagong Produkto (Add Product)</span>
            </CommandItem>
          )}
          {can('utang.record_payment') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/utang?action=payment'))}>
              <CreditCard className="mr-2 h-4 w-4 text-utang" />
              <span>Magtala ng Bayad sa Utang (Record Payment)</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Pahina (Navigation)">
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
            <span>Talaan ng Benta (Sales)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/products'))}>
            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Mga Produkto (Products)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/customers'))}>
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Kustomer at Suki (Customers)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/utang'))}>
            <NotebookPen className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Listahan ng Utang (Debtors)</span>
          </CommandItem>

          {role === 'owner' && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/categories'))}>
                <Tags className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Kategorya (Categories)</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/inventory'))}>
                <Warehouse className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Imbentaryo at Stock (Inventory)</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/reports'))}>
                <ChartColumn className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Mga Ulat (Reports)</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/staff'))}>
                <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Kawani at Kahera (Staff)</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Setting ng Tindahan (Settings)</span>
              </CommandItem>
            </>
          )}

          <CommandItem onSelect={() => runCommand(() => navigate('/account'))}>
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Aking Account (Profile)</span>
          </CommandItem>
        </CommandGroup>

        {/* Product Quick-Search */}
        {products.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Mabilisang Paghahanap ng Produkto (Products)">
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
                      {p.sku || 'Walang SKU'} · Stock: {p.stock_quantity ?? p.stock ?? 0}
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
