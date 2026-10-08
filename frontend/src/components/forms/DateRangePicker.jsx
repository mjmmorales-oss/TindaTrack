import { useState } from 'react'
import {
  format,
  subDays,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/**
 * @typedef {object} DateRange
 * @property {Date} [from] - Start date
 * @property {Date} [to] - End date
 */

/**
 * Date range picker with popover calendar on desktop and touch drawer on mobile.
 *
 * @component
 * @param {object} props
 * @param {DateRange} [props.value] - Currently selected date range
 * @param {(range: DateRange | undefined) => void} props.onChange - Selection change callback
 * @param {string} [props.placeholder='Pumili ng petsa (Select date range)'] - Placeholder text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Trigger button class name
 * @param {'left'|'right'|'center'} [props.align='start'] - Popover alignment
 * @returns {React.JSX.Element}
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pumili ng petsa (Select dates)',
  disabled = false,
  className,
  align = 'start',
}) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  const presets = [
    {
      label: 'Ngayon (Today)',
      getRange: () => ({ from: startOfToday(), to: endOfToday() }),
    },
    {
      label: 'Kahapon (Yesterday)',
      getRange: () => ({ from: startOfYesterday(), to: endOfYesterday() }),
    },
    {
      label: 'Huling 7 Araw (Last 7 Days)',
      getRange: () => ({ from: subDays(startOfToday(), 6), to: endOfToday() }),
    },
    {
      label: 'Huling 30 Araw (Last 30 Days)',
      getRange: () => ({ from: subDays(startOfToday(), 29), to: endOfToday() }),
    },
    {
      label: 'Buwang Ito (This Month)',
      getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    },
  ]

  const formatRangeLabel = () => {
    if (!value?.from) return placeholder
    if (!value?.to) return format(value.from, 'MMM d, yyyy')
    return `${format(value.from, 'MMM d')} – ${format(value.to, 'MMM d, yyyy')}`
  }

  const handlePresetSelect = (preset) => {
    onChange?.(preset.getRange())
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.(undefined)
    setOpen(false)
  }

  const pickerContent = (
    <div className="flex flex-col sm:flex-row overflow-hidden">
      {/* Presets Sidebar */}
      <div className="border-border bg-muted/20 flex min-w-44 flex-col gap-1 border-b p-3 sm:border-r sm:border-b-0">
        <span className="text-muted-foreground px-2 py-1 text-xs font-semibold tracking-wider uppercase">
          Presets
        </span>
        {presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-primary/10 hover:text-primary h-8 justify-start text-xs font-normal"
            onClick={() => handlePresetSelect(preset)}
          >
            {preset.label}
          </Button>
        ))}
        {value?.from && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 mt-2 h-8 justify-start gap-1.5 text-xs"
            onClick={handleClear}
          >
            <RotateCcw className="h-3 w-3" />
            I-reset (Clear)
          </Button>
        )}
      </div>

      {/* Calendar Picker */}
      <div className="p-2 flex justify-center">
        <Calendar
          mode="range"
          defaultMonth={value?.from || new Date()}
          selected={value}
          onSelect={onChange}
          numberOfMonths={1}
        />
      </div>
    </div>
  )

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => setOpen(true)}
      className={cn(
        'h-9 justify-start gap-2.5 px-3 text-left font-normal',
        !value?.from && 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon className="text-muted-foreground h-4 w-4 shrink-0" />
      <span className="truncate text-sm">{formatRangeLabel()}</span>
    </Button>
  )

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90dvh] flex flex-col">
            <DrawerHeader className="border-b border-border px-4 py-3 text-left">
              <DrawerTitle className="text-base font-bold text-foreground">
                Pumili ng Petsa (Date Range)
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Salain ang mga transaksyon ayon sa petsa.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-2">
              {pickerContent}
            </div>
            <DrawerFooter className="border-t border-border p-3">
              <Button type="button" className="w-full h-11" onClick={() => setOpen(false)}>
                Ilapat ang Petsa
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex w-auto flex-col overflow-hidden rounded-xl p-0 shadow-lg sm:flex-row"
      >
        {pickerContent}
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker
