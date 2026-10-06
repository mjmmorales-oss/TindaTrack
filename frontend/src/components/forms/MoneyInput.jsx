import { forwardRef } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

/**
 * Cleans user string input so it only contains valid non-negative decimal currency with at most 2 decimal places.
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeMoneyInput(raw = '') {
  if (typeof raw !== 'string') {
    raw = String(raw ?? '')
  }
  // Strip non-digits and non-decimal
  let cleaned = raw.replace(/[^0-9.]/g, '')

  // Keep only the first decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }

  // Max 2 decimals
  if (cleaned.includes('.')) {
    const [whole, decimal] = cleaned.split('.')
    cleaned = `${whole}.${decimal.slice(0, 2)}`
  }

  return cleaned
}

/**
 * Currency MoneyInput component utilizing InputGroup with Philippine Peso (₱) addon.
 * Restricts input to non-negative decimal numbers with a maximum of 2 decimal places.
 *
 * @component
 * @param {object} props
 * @param {string|number} [props.value] - Controlled input value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange] - Standard change handler
 * @param {(numericValue: number | null, stringValue: string) => void} [props.onValueChange] - Typed numeric callback
 * @param {string} [props.placeholder='0.00'] - Placeholder text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.id] - Element ID
 * @param {string} [props.name] - Form field name
 * @param {string} [props.className] - InputGroup wrapper class name
 * @param {string} [props.inputClassName] - Input element class name
 * @param {boolean} [props.hasError=false] - Error border indicator
 * @param {React.Ref<HTMLInputElement>} ref - Forwarded input ref
 * @returns {React.JSX.Element}
 */
export const MoneyInput = forwardRef(
  (
    {
      value,
      onChange,
      onValueChange,
      placeholder = '0.00',
      disabled = false,
      id,
      name,
      className,
      inputClassName,
      hasError = false,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const stringVal = value !== undefined && value !== null ? String(value) : ''

    const handleChange = (e) => {
      const sanitized = sanitizeMoneyInput(e.target.value)
      e.target.value = sanitized

      onChange?.(e)

      if (onValueChange) {
        const num = sanitized === '' ? null : parseFloat(sanitized)
        onValueChange(isNaN(num) ? null : num, sanitized)
      }
    }

    const isInvalid = ariaInvalid === true || ariaInvalid === 'true' || hasError

    return (
      <InputGroup
        data-disabled={disabled}
        className={cn(
          'transition-all',
          isInvalid && 'border-destructive focus-within:ring-destructive/30',
          className,
        )}
      >
        <InputGroupAddon align="inline-start">
          <span className="text-foreground/80 text-sm font-semibold select-none">
            ₱
          </span>
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          id={id || name}
          name={name}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={stringVal}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(
            'text-foreground font-medium tabular-nums',
            inputClassName,
          )}
          {...props}
        />
      </InputGroup>
    )
  },
)

MoneyInput.displayName = 'MoneyInput'

export default MoneyInput
