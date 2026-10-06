import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Row actions dropdown trigger and menu for table rows.
 *
 * @component
 * @param {object} props
 * @param {any} props.row - Row data
 * @param {Array<{
 *   label: string,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   onClick: (row: any) => void,
 *   variant?: 'default'|'destructive',
 *   disabled?: boolean,
 *   separator?: boolean
 * }>} props.actions - Actions list
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function DataTableRowActions({ row, actions = [], className }) {
  if (!actions.length) return null

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'data-[state=open]:bg-muted h-8 w-8 p-0',
                className,
              )}
              aria-label="Buksan ang menu ng aksyon"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Buksan ang menu</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Mga Aksyon</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-[160px]">
        {actions.map((action, idx) => {
          const Icon = action.icon
          const isDestructive = action.variant === 'destructive'

          return (
            <div key={`${action.label}-${idx}`}>
              {action.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => action.onClick?.(row)}
                disabled={action.disabled}
                className={cn(
                  'cursor-pointer text-xs',
                  isDestructive &&
                    'text-destructive focus:bg-destructive/10 focus:text-destructive',
                )}
              >
                {Icon && <Icon className="mr-2 h-3.5 w-3.5" />}
                <span>{action.label}</span>
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DataTableRowActions
