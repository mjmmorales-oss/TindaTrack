import { forwardRef } from 'react'
import { Phone } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

/**
 * Formats a raw string into a Philippine mobile phone number format: 09XX-XXX-XXXX.
 *
 * @param {string} raw
 * @returns {string}
 */
export function formatPhilippinePhone(raw = '') {
  if (typeof raw !== 'string') {
    raw = String(raw ?? '')
  }
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 4) {
    return digits
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`
}

/**
 * Philippine mobile phone input (09XX-XXX-XXXX mask).
 *
 * @component
 * @param {object} props
 * @param {string} [props.value] - Controlled input value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange] - Change event handler
 * @param {string} [props.placeholder='09XX-XXX-XXXX'] - Placeholder
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.hasError=false] - Error styling indicator
 * @param {string} [props.className] - InputGroup wrapper class
 * @param {string} [props.inputClassName] - Input element class
 * @param {React.Ref<HTMLInputElement>} ref - Forwarded input ref
 * @returns {React.JSX.Element}
 */
export const PhoneInput = forwardRef(
  (
    {
      value,
      onChange,
      placeholder = '09XX-XXX-XXXX',
      disabled = false,
      hasError = false,
      className,
      inputClassName,
      id,
      name,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const stringVal =
      value !== undefined && value !== null
        ? formatPhilippinePhone(String(value))
        : ''

    const handleChange = (e) => {
      const formatted = formatPhilippinePhone(e.target.value)
      e.target.value = formatted
      onChange?.(e)
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
          <Phone className="text-muted-foreground h-4 w-4 select-none" />
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          id={id || name}
          name={name}
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={stringVal}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn('tracking-wide tabular-nums', inputClassName)}
          {...props}
        />
      </InputGroup>
    )
  },
)

PhoneInput.displayName = 'PhoneInput'

export default PhoneInput
