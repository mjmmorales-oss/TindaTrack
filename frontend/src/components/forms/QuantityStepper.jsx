import { forwardRef, useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Stepper component for adjusting quantities with 44px touch targets and long-press rapid repeat.
 *
 * @component
 * @param {object} props
 * @param {number} props.value - Current quantity value
 * @param {(nextValue: number) => void} props.onChange - Callback fired when quantity changes
 * @param {number} [props.min=1] - Minimum permitted quantity
 * @param {number} [props.max] - Maximum permitted quantity (e.g. available stock)
 * @param {number} [props.step=1] - Increment/decrement step
 * @param {boolean} [props.disabled=false] - Disable entire stepper
 * @param {boolean} [props.disabledDecrement=false] - Disable decrement button specifically
 * @param {boolean} [props.disabledIncrement=false] - Disable increment button specifically
 * @param {string} [props.stockHint] - Optional helper text (e.g. "Only 3 left in stock")
 * @param {string} [props.className] - Additional class names
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded container ref
 * @returns {React.JSX.Element}
 */
export const QuantityStepper = forwardRef(
  (
    {
      value = 1,
      onChange,
      min = 1,
      max,
      step = 1,
      disabled = false,
      disabledDecrement = false,
      disabledIncrement = false,
      stockHint,
      className,
      ...props
    },
    ref,
  ) => {
    const timerRef = useRef(null)
    const intervalRef = useRef(null)

    const canDecrement =
      !disabled && !disabledDecrement && (min === undefined || value > min)
    const canIncrement =
      !disabled && !disabledIncrement && (max === undefined || value < max)

    const clearTimers = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    useEffect(() => {
      return () => clearTimers()
    }, [])

    const handleDecrement = () => {
      if (!canDecrement) return
      const next = Math.max(min ?? 0, value - step)
      onChange?.(next)
    }

    const handleIncrement = () => {
      if (!canIncrement) return
      const next =
        max !== undefined ? Math.min(max, value + step) : value + step
      onChange?.(next)
    }

    const startLongPress = (actionFn, canRun) => {
      if (!canRun) return
      actionFn()
      clearTimers()

      timerRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          actionFn()
        }, 100)
      }, 350)
    }

    const handleInputChange = (e) => {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      if (raw === '') {
        onChange?.(min ?? 0)
        return
      }
      let num = parseInt(raw, 10)
      if (isNaN(num)) num = min ?? 0
      if (min !== undefined && num < min) num = min
      if (max !== undefined && num > max) num = max
      onChange?.(num)
    }

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center gap-1', className)}
        {...props}
      >
        <div className="border-input bg-card inline-flex items-center rounded-lg border p-0.5 shadow-xs">
          {/* Decrement Button (44px touch target) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canDecrement}
                aria-label="Decrease quantity"
                className="active:bg-accent text-foreground h-11 w-11 shrink-0 rounded-md disabled:opacity-40"
                onPointerDown={(e) => {
                  e.preventDefault()
                  startLongPress(handleDecrement, canDecrement)
                }}
                onPointerUp={clearTimers}
                onPointerLeave={clearTimers}
                onPointerCancel={clearTimers}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDecrement()
                  }
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Bawasan (Decrease)</TooltipContent>
          </Tooltip>

          {/* Numeric Value Input */}
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            aria-label="Quantity"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            className="focus:ring-ring h-11 w-12 border-0 bg-transparent text-center font-mono text-base font-semibold tabular-nums focus:rounded focus:ring-1 focus:outline-none disabled:opacity-50"
          />

          {/* Increment Button (44px touch target) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canIncrement}
                aria-label="Increase quantity"
                className="active:bg-accent text-foreground h-11 w-11 shrink-0 rounded-md disabled:opacity-40"
                onPointerDown={(e) => {
                  e.preventDefault()
                  startLongPress(handleIncrement, canIncrement)
                }}
                onPointerUp={clearTimers}
                onPointerLeave={clearTimers}
                onPointerCancel={clearTimers}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleIncrement()
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Dagdagan (Increase)</TooltipContent>
          </Tooltip>
        </div>

        {stockHint && (
          <span className="text-warning text-center text-xs font-medium">
            {stockHint}
          </span>
        )}
      </div>
    )
  },
)

QuantityStepper.displayName = 'QuantityStepper'

export default QuantityStepper
