import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/forms/SearchInput'
import { DataTableFacetedFilter } from '@/components/data-table/DataTableFacetedFilter'
import { DataTableViewOptions } from '@/components/data-table/DataTableViewOptions'
import { cn } from '@/lib/utils'

/**
 * Standard table toolbar with search input, faceted filters, reset action, and column visibility.
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
  return (
    <div
      className={cn(
        'flex flex-col items-stretch justify-between gap-2.5 py-1 sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange && (
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        )}

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

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {children}
        {table && <DataTableViewOptions table={table} />}
      </div>
    </div>
  )
}

export default DataTableToolbar
