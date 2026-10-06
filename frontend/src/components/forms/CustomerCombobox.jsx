import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, User, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Money } from '@/components/common/Money'
import { cn } from '@/lib/utils'

/**
 * @typedef {object} Customer
 * @property {string|number} id - Customer identifier
 * @property {string} name - Customer full name
 * @property {string} [nickname] - Suki nickname
 * @property {string} [contact] - Mobile contact number
 * @property {number} [credit_balance] - Current outstanding utang balance
 * @property {number} [credit_limit] - Maximum credit limit
 */

/**
 * Searchable customer selection combobox built from Popover and Command.
 * Supports quick selection, balance display, and inline trigger to add a new suki.
 *
 * @component
 * @param {object} props
 * @param {string|number} [props.value] - Currently selected customer ID
 * @param {(customerId: string|number, customer: Customer | null) => void} props.onChange - Selection change callback
 * @param {Customer[]} [props.customers=[]] - List of store customers
 * @param {() => void} [props.onAddNew] - Callback fired when clicking "+ New suki"
 * @param {string} [props.placeholder='Pumili ng suki (Select customer)...'] - Placeholder text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Button trigger class name
 * @returns {React.JSX.Element}
 */
export function CustomerCombobox({
  value,
  onChange,
  customers = [],
  onAddNew,
  placeholder = 'Pumili ng suki (Select customer)...',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false)

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(value)),
    [customers, value],
  )

  const handleSelect = (customerId) => {
    if (String(customerId) === String(value)) {
      onChange?.('', null)
    } else {
      const cust = customers.find((c) => String(c.id) === String(customerId))
      onChange?.(customerId, cust || null)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={
            selectedCustomer
              ? `Selected: ${selectedCustomer.name}`
              : placeholder
          }
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between px-3 text-left font-normal',
            !selectedCustomer && 'text-muted-foreground',
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="text-muted-foreground h-4 w-4 shrink-0" />
            {selectedCustomer ? (
              <span className="text-foreground truncate font-medium">
                {selectedCustomer.name}
                {selectedCustomer.nickname && (
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    ({selectedCustomer.nickname})
                  </span>
                )}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] rounded-xl p-0 shadow-lg sm:w-[380px]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Maghanap ng pangalan o suki..." />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="px-3 py-4 text-center text-sm">
              <p className="text-muted-foreground mb-2">
                Walang nahanap na suki.
              </p>
              {onAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-primary gap-1.5 text-xs"
                  onClick={() => {
                    setOpen(false)
                    onAddNew()
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Idagdag bilang bagong suki
                </Button>
              )}
            </CommandEmpty>

            {onAddNew && (
              <>
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-full justify-start gap-2 text-xs font-medium"
                    onClick={() => {
                      setOpen(false)
                      onAddNew()
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />+ Bagong suki (Add new
                    suki)
                  </Button>
                </div>
                <CommandSeparator />
              </>
            )}

            <CommandGroup heading="Mga Suki">
              {customers.map((customer) => {
                const isSelected = String(customer.id) === String(value)
                const hasUtang = (customer.credit_balance || 0) > 0

                return (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.nickname || ''} ${customer.contact || ''}`}
                    onSelect={() => handleSelect(customer.id)}
                    className="flex cursor-pointer items-center justify-between py-2"
                  >
                    <div className="mr-2 flex min-w-0 items-center gap-2 truncate">
                      <Check
                        className={cn(
                          'text-primary h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="flex flex-col truncate">
                        <span className="truncate text-sm leading-snug font-medium">
                          {customer.name}
                        </span>
                        {customer.nickname && (
                          <span className="text-muted-foreground truncate text-xs">
                            &quot;{customer.nickname}&quot;
                          </span>
                        )}
                      </div>
                    </div>

                    {hasUtang && (
                      <div className="shrink-0 text-right">
                        <span className="text-utang block text-[10px] font-medium">
                          Utang:
                        </span>
                        <Money
                          amount={customer.credit_balance}
                          tone="utang"
                          size="xs"
                        />
                      </div>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default CustomerCombobox
