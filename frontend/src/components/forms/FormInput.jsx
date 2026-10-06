import { Controller } from 'react-hook-form'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * React Hook Form wrapped Input field with label, description, and error integration.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {string} [props.label] - Field label
 * @param {string} [props.description] - Helper text below the input
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.type='text'] - HTML input type
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function FormInput({
  name,
  control,
  label,
  description,
  placeholder,
  type = 'text',
  disabled = false,
  className,
  ...props
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
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={
                hasError
                  ? `${name}-error`
                  : description
                    ? `${name}-desc`
                    : undefined
              }
              {...field}
              value={field.value ?? ''}
              {...props}
            />
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

export default FormInput
