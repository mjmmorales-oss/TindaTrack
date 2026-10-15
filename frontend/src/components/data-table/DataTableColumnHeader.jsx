import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Column header component supporting server-side sorting (asc/desc/clear) and column hiding.
 *
 * @component
 * @param {object} props
 * @param {import('@tanstack/react-table').Column<any, any>} props.column - TanStack Column instance
 * @param {string} props.title - Column header display title
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function DataTableColumnHeader({ column, title, className }) {
  const { t } = useTranslation()

  if (!column.getCanSort()) {
    return (
      <div
        className={cn('text-muted-foreground text-xs font-semibold', className)}
      >
        {title}
      </div>
    )
  }

  const isSorted = column.getIsSorted()

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="data-[state=open]:bg-accent hover:bg-muted/50 -ml-3 h-8 text-xs font-semibold"
            aria-label={t('common:sortColumnBy', { title, defaultValue: `Sort column by ${title}` })}
          >
            <span>{title}</span>
            {isSorted === 'desc' ? (
              <ArrowDown className="text-foreground ml-2 h-3.5 w-3.5" />
            ) : isSorted === 'asc' ? (
              <ArrowUp className="text-foreground ml-2 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="text-muted-foreground/70 ml-2 h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            {t('common:ascending', 'Ascending')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            {t('common:descending', 'Descending')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.clearSorting()}>
            <ArrowUpDown className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            {t('common:clearSort', 'Clear sort')}
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                {t('common:hideColumn', 'Hide column')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default DataTableColumnHeader
