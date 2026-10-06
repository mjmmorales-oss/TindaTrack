import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { TableSkeleton } from '@/components/common/TableSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { cn } from '@/lib/utils'

/**
 * Reusable server-paginated data table built on TanStack Table.
 * Below `md` viewport, automatically switches to a mobile card list for mobile-first ergonomics.
 *
 * @component
 * @param {object} props
 * @param {import('@tanstack/react-table').ColumnDef<any, any>[]} props.columns - TanStack columns
 * @param {any[]} [props.data=[]] - Row items array
 * @param {{
 *   current_page?: number,
 *   last_page?: number,
 *   per_page?: number,
 *   total?: number,
 *   from?: number,
 *   to?: number
 * }} [props.meta] - Laravel paginator metadata
 * @param {boolean} [props.isLoading=false] - Whether table is currently fetching
 * @param {boolean} [props.isError=false] - Whether query threw an error
 * @param {() => void} [props.onRetry] - Error retry handler
 * @param {object} [props.params={}] - Table query parameters ({ q, page, per_page, sort, ... })
 * @param {(params: object) => void} [props.onParamsChange] - Parameters update handler
 * @param {(row: any, index: number) => React.ReactNode} [props.renderMobileCard] - Custom mobile card renderer
 * @param {React.ReactNode} [props.toolbar] - Table toolbar component
 * @param {(row: any) => void} [props.onRowClick] - Row click handler
 * @param {boolean} [props.enableRowSelection=false] - Whether row selection is enabled
 * @param {React.ReactNode} [props.emptyState] - Custom empty state component
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function DataTable({
  columns,
  data = [],
  meta,
  isLoading = false,
  isError = false,
  onRetry,
  params = {},
  onParamsChange,
  renderMobileCard,
  toolbar,
  onRowClick,
  enableRowSelection = false,
  emptyState,
  className,
}) {
  const [rowSelection, setRowSelection] = useState({})

  // Compute sorting state from server sort string (e.g. 'name' -> asc, '-name' -> desc)
  const sorting = useMemo(() => {
    if (!params.sort) return []
    const isDesc = params.sort.startsWith('-')
    const id = isDesc ? params.sort.slice(1) : params.sort
    return [{ id, desc: isDesc }]
  }, [params.sort])

  const handleSortingChange = (updater) => {
    if (!onParamsChange) return
    const nextSorting =
      typeof updater === 'function' ? updater(sorting) : updater
    if (!nextSorting.length) {
      onParamsChange({ ...params, sort: '', page: 1 })
    } else {
      const { id, desc } = nextSorting[0]
      const sortString = desc ? `-${id}` : id
      onParamsChange({ ...params, sort: sortString, page: 1 })
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    pageCount: meta?.last_page || -1,
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
  })

  // Loading state
  if (isLoading && !data.length) {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        <TableSkeleton rows={meta?.per_page || 5} cols={columns.length} />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        <ErrorState
          title="Hindi maikarga ang talaan"
          message="May naganap na suliranin sa pagkarga ng mga tala. Pakisubukang muli."
          onRetry={onRetry}
        />
      </div>
    )
  }

  const rows = table.getRowModel().rows

  return (
    <div className={cn('space-y-3.5', className)}>
      {toolbar}

      {/* --- MOBILE VIEW: Cards (< md) --- */}
      <div className="block md:hidden">
        {rows.length === 0 ? (
          emptyState || <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {rows.map((row, index) => {
              if (renderMobileCard) {
                return (
                  <div
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer active:scale-[0.99]',
                    )}
                  >
                    {renderMobileCard(row.original, index)}
                  </div>
                )
              }

              // Fallback mobile card if no custom renderer is supplied
              return (
                <div
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'bg-card space-y-2 rounded-xl border p-4 shadow-2xs transition-colors',
                    onRowClick &&
                      'hover:bg-muted/40 active:bg-muted/60 cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="border-border/50 flex items-center justify-between border-b py-1 text-xs last:border-b-0"
                    >
                      <span className="text-muted-foreground font-medium">
                        {cell.column.columnDef.header &&
                        typeof cell.column.columnDef.header === 'string'
                          ? cell.column.columnDef.header
                          : cell.column.id}
                      </span>
                      <span className="text-foreground text-right font-medium">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* --- DESKTOP VIEW: Table (>= md) --- */}
      <div className="bg-card hidden overflow-hidden rounded-xl border shadow-2xs md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 text-xs">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-48 text-center"
                >
                  {emptyState || (
                    <EmptyState className="min-h-0 border-none bg-transparent py-8" />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      {meta && (
        <DataTablePagination
          meta={meta}
          onPageChange={(page) => onParamsChange?.({ ...params, page })}
          onPerPageChange={(per_page) =>
            onParamsChange?.({ ...params, per_page, page: 1 })
          }
        />
      )}
    </div>
  )
}

export default DataTable
