import { useState } from 'react'
import { Filter, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { SearchInput } from '@/components/forms/SearchInput'
import { DataTableFacetedFilter } from '@/components/data-table/DataTableFacetedFilter'
import { DataTableViewOptions } from '@/components/data-table/DataTableViewOptions'
import { cn } from '@/lib/utils'

/**
 * Standard table toolbar with search input, faceted filters, reset action, and column visibility.
 * On mobile (< md), collapses faceted filters and view options into a touch-friendly Drawer.
 *
 * @component
 * @param {object} props
 * @param {import('@tanstack/react-table').Table<any>} props.table - TanStack Table instance
 * @param {string} [props.searchPlaceholder='Maghanap...'] - Search field placeholder
 * @param {string} [props.searchValue=''] - Controlled search query
 * @param {(value: string) => void} [props.onSearchChange] - Search update handler
 * @param {Array<{
 *   columnId: string,
 *   title: string,
 *   options: Array<{ label: string, value: string, icon?: any, count?: number }>,
 *   selectedValues?: string[],
 *   onChange: (values: string[]) => void
 * }>} [props.filters=[]] - Faceted filter configurations
 * @param {boolean} [props.isFiltered=false] - Whether any filters or search are currently active
 * @param {() => void} [props.onReset] - Reset all filters callback
 * @param {React.ReactNode} [props.children] - Additional toolbar elements or action buttons
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function DataTableToolbar({
  table,
  searchPlaceholder = 'Maghanap...',
  searchValue = '',
  onSearchChange,
  filters = [],
  isFiltered = false,
  onReset,
  children,
  className,
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const activeFiltersCount = filters.reduce((acc, f) => {
    const count = f.selectedValues ? (Array.isArray(f.selectedValues) ? f.selectedValues.length : f.selectedValues.size || 0) : 0
    return acc + count
  }, 0)

  return (
    <>
      <div
        className={cn(
          'flex flex-col items-stretch justify-between gap-2.5 py-1 md:flex-row md:items-center',
          className,
        )}
      >
        {/* Search input: full width on mobile, auto width on md+ */}
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          {onSearchChange && (
            <div className="w-full md:w-auto">
              <SearchInput
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearchChange}
                className="w-full md:w-[260px] lg:w-[320px]"
              />
            </div>
          )}

          {/* Desktop Inline Filters (md+) */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <DataTableFacetedFilter
                key={filter.columnId}
                title={filter.title}
                options={filter.options}
                selectedValues={filter.selectedValues}
                onChange={filter.onChange}
              />
            ))}

            {isFiltered && onReset && (
              <Button
                variant="ghost"
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs lg:px-3"
              >
                I-reset
                <X className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile controls & Desktop Actions */}
        <div className="flex items-center justify-between gap-2 md:justify-end">
          {/* Mobile Filters Drawer Trigger (< md) */}
          <div className="flex items-center gap-2 md:hidden">
            {filters.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileDrawerOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <Filter className="h-3.5 w-3.5 text-primary" />
                Mga Filter
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="ml-1 h-5 px-1.5 font-mono text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            )}

            {isFiltered && onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-muted-foreground h-9 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Actions & View options */}
          <div className="flex items-center gap-2">
            {children}
            {table && (
              <div className="hidden md:block">
                <DataTableViewOptions table={table} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer (< md) */}
      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="max-h-[85dvh] flex flex-col">
          <DrawerHeader className="border-b border-border px-4 py-3 text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Mga Filter at Opsyon
              </DrawerTitle>
              {isFiltered && onReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onReset()
                    setMobileDrawerOpen(false)
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                >
                  I-clear Lahat
                </Button>
              )}
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Pumili ng mga kategorya o katayuan para masala ang talaan.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filters.map((filter) => (
              <div key={filter.columnId} className="space-y-1.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {filter.title}
                </span>
                <div className="pt-1">
                  <DataTableFacetedFilter
                    title={filter.title}
                    options={filter.options}
                    selectedValues={filter.selectedValues}
                    onChange={filter.onChange}
                    className="w-full justify-between"
                  />
                </div>
              </div>
            ))}

            {table && (
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  Mga Kolum
                </span>
                <DataTableViewOptions table={table} className="w-full justify-between" />
              </div>
            )}
          </div>

          <DrawerFooter className="border-t border-border bg-card p-4">
            <Button
              type="button"
              className="w-full h-11 text-sm font-bold shadow-md"
              onClick={() => setMobileDrawerOpen(false)}
            >
              Ilapat ang mga Filter ({activeFiltersCount})
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default DataTableToolbar
