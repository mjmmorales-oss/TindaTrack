import { PlusCircle, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/**
 * Faceted multi-select filter popover with counts and search.
 *
 * @component
 * @param {object} props
 * @param {string} props.title - Filter button title
 * @param {Array<{
 *   label: string,
 *   value: string,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   count?: number
 * }>} props.options - Selectable options list
 * @param {Set<string>|string[]} [props.selectedValues] - Currently active values
 * @param {(values: string[]) => void} props.onChange - Selection change handler
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function DataTableFacetedFilter({
  title,
  options = [],
  selectedValues,
  onChange,
  className,
}) {
  const selectedSet = new Set(
    selectedValues instanceof Set ? selectedValues : selectedValues || [],
  )

  const handleSelect = (value) => {
    const nextSet = new Set(selectedSet)
    if (nextSet.has(value)) {
      nextSet.delete(value)
    } else {
      nextSet.add(value)
    }
    onChange?.(Array.from(nextSet))
  }

  const handleClear = () => {
    onChange?.([])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 border-dashed text-xs', className)}
        >
          <PlusCircle className="mr-2 h-3.5 w-3.5" />
          {title}
          {selectedSet.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedSet.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedSet.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 text-[11px] font-normal"
                  >
                    {selectedSet.size} napili
                  </Badge>
                ) : (
                  options
                    .filter((opt) => selectedSet.has(opt.value))
                    .map((opt) => (
                      <Badge
                        variant="secondary"
                        key={opt.value}
                        className="rounded-sm px-1 text-[11px] font-normal"
                      >
                        {opt.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="text-xs" />
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-2 text-center text-xs">
              Walang nahanap.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                const Icon = option.icon

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer text-xs"
                  >
                    <div
                      className={cn(
                        'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-xs border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {Icon && (
                      <Icon className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                    )}
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedSet.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className="text-destructive focus:bg-destructive/10 cursor-pointer justify-center text-center text-xs font-medium"
                  >
                    Linisin ang mga Filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default DataTableFacetedFilter
