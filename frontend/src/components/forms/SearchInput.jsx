import { useState, useEffect, forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

/**
 * Debounced search input using InputGroup, with instant clear button and keyboard hint.
 *
 * @component
 * @param {object} props
 * @param {string} [props.value=''] - Current search term
 * @param {(value: string) => void} props.onChange - Debounced search callback
 * @param {() => void} [props.onClear] - Explicit clear callback
 * @param {string} [props.placeholder='Maghanap...'] - Placeholder text
 * @param {boolean} [props.showKbdHint=true] - Whether to show the ⌘K badge
 * @param {number} [props.debounceMs=300] - Debounce delay in milliseconds
 * @param {string} [props.className] - Additional classes
 * @param {React.Ref<HTMLInputElement>} [props.inputRef] - Optional inner input ref
 * @returns {React.JSX.Element}
 */
export const SearchInput = forwardRef(function SearchInput(
  {
    value = '',
    onChange,
    onClear,
    placeholder = 'Maghanap...',
    showKbdHint = true,
    debounceMs = 300,
    className,
    inputRef,
    ...props
  },
  ref,
) {
  const [localValue, setLocalValue] = useState(value)
  const [debouncedValue] = useDebounce(localValue, debounceMs)

  // Sync internal state with external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Fire debounced onChange when user stops typing
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange?.(debouncedValue)
    }
  }, [debouncedValue, onChange, value])

  const handleClear = () => {
    setLocalValue('')
    onChange?.('')
    onClear?.()
  }

  return (
    <InputGroup
      className={cn('h-9 w-full sm:w-[260px] md:w-[320px]', className)}
    >
      <InputGroupAddon align="inline-start">
        <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
      </InputGroupAddon>

      <InputGroupInput
        ref={inputRef || ref}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="text-xs"
        {...props}
      />

      {localValue ? (
        <InputGroupAddon align="inline-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-5 w-5 p-0 hover:bg-transparent"
            onClick={handleClear}
            aria-label="Linisin ang paghahanap"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </InputGroupAddon>
      ) : showKbdHint ? (
        <InputGroupAddon align="inline-end" className="hidden sm:flex">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
})

export default SearchInput
