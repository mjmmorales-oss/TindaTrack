import { Controller } from 'react-hook-form'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * React Hook Form wrapped Select dropdown.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {string} [props.label] - Field label
 * @param {string} [props.description] - Helper text below select
 * @param {Array<{ value: string, label: string }>} [props.options=[]] - Select options list
 * @param {string} [props.placeholder='Pumili ng isa...'] - Placeholder text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function FormSelect({
  name,
  control,
  label,
  description,
  options = [],
  placeholder = 'Pumili ng isa...',
  disabled = false,
  className,
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const hasError = !!error

        return (
          <Field data-invalid={hasError} className={className}>
            {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
            <Select
              disabled={disabled}
              value={field.value ?? ''}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id={name}
                aria-invalid={hasError}
                className="w-full"
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && !hasError && (
              <FieldDescription id={`${name}-desc`}>
                {description}
              </FieldDescription>
            )}
            {hasError && <FieldError id={`${name}-error`} errors={[error]} />}
          </Field>
        )
      }}
    />
  )
}

export default FormSelect
