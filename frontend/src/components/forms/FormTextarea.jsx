import { Controller } from 'react-hook-form'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

/**
 * React Hook Form wrapped Textarea field with label, description, and error integration.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {string} [props.label] - Field label
 * @param {string} [props.description] - Helper text below textarea
 * @param {string} [props.placeholder] - Placeholder text
 * @param {number} [props.rows=3] - Number of textarea rows
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function FormTextarea({
  name,
  control,
  label,
  description,
  placeholder,
  rows = 3,
  disabled = false,
  className,
  error: explicitError,
  ...props
}) {
  // Defensive guard: if control is not provided, render as standard Field + Textarea
  // without mounting Controller (which throws if outside FormProvider).
  // Supports both control={control} and {...register('name')} patterns.
  if (!control) {
    const hasError = !!explicitError
    return (
      <Field data-invalid={hasError} className={className}>
        {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
        <Textarea
          id={name}
          name={name}
          rows={rows}
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
          {...props}
        />
        {description && !hasError && (
          <FieldDescription id={`${name}-desc`}>
            {description}
          </FieldDescription>
        )}
        {hasError && (
          <FieldError
            id={`${name}-error`}
            errors={Array.isArray(explicitError) ? explicitError : [explicitError]}
          />
        )}
      </Field>
    )
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const hasError = !!(explicitError || error)
        const errorMsg = explicitError || error?.message

        return (
          <Field data-invalid={hasError} className={className}>
            {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
            <Textarea
              id={name}
              rows={rows}
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
            {hasError && errorMsg && (
              <FieldError
                id={`${name}-error`}
                errors={Array.isArray(errorMsg) ? errorMsg : [errorMsg]}
              />
            )}
          </Field>
        )
      }}
    />
  )
}

export default FormTextarea
