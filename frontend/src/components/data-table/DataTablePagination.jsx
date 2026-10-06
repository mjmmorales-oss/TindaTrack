import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Pagination component for server-paginated tables with Laravel metadata shape.
 *
 * @component
 * @param {object} props
 * @param {{
 *   current_page?: number,
 *   last_page?: number,
 *   per_page?: number,
 *   total?: number,
 *   from?: number,
 *   to?: number
 * }} [props.meta] - Laravel paginator meta object
 * @param {(page: number) => void} props.onPageChange - Page change handler
 * @param {(perPage: number) => void} [props.onPerPageChange] - Per page change handler
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function DataTablePagination({
  meta = {},
  onPageChange,
  onPerPageChange,
  className,
}) {
  const currentPage = meta.current_page || 1
  const lastPage = meta.last_page || 1
  const perPage = meta.per_page || 15
  const total = meta.total || 0
  const from = meta.from || (total > 0 ? (currentPage - 1) * perPage + 1 : 0)
  const to = meta.to || Math.min(total, currentPage * perPage)

  const canPrev = currentPage > 1
  const canNext = currentPage < lastPage

  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-between gap-4 px-2 py-4 text-xs sm:flex-row',
        className,
      )}
    >
      {/* Total and range description */}
      <div className="flex items-center gap-2">
        <span className="text-foreground font-medium">
          {total > 0 ? `${from}–${to} ng ${total}` : '0 aytem'}
        </span>
        <span>mga rekord</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Page size picker */}
        {onPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className="whitespace-nowrap">Bawat pahina:</span>
            <Select
              value={String(perPage)}
              onValueChange={(val) => onPerPageChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder={String(perPage)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 15, 25, 50].map((pageSize) => (
                  <SelectItem
                    key={pageSize}
                    value={String(pageSize)}
                    className="text-xs"
                  >
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page counter indicator */}
        <div className="flex items-center justify-center font-medium">
          Pahina {currentPage} ng {lastPage}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(1)}
                disabled={!canPrev}
                aria-label="Pumunta sa unang pahina"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Unang pahina</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canPrev}
                aria-label="Pumunta sa nakaraang pahina"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nakaraang pahina</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!canNext}
                aria-label="Pumunta sa susunod na pahina"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Susunod na pahina</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(lastPage)}
                disabled={!canNext}
                aria-label="Pumunta sa huling pahina"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Huling pahina</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

export default DataTablePagination
