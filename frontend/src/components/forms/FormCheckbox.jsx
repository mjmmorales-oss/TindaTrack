import { Controller } from 'react-hook-form'
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/**
 * React Hook Form wrapped Checkbox field with accessible label, description, and error integration.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {string} [props.label] - Checkbox label text
 * @param {string} [props.description] - Helper text below the label
 * @param {boolean} [props.disabled=false] - Whether the checkbox is disabled
 * @param {string} [props.className] - Container class name
 * @returns {React.JSX.Element}
 */
export function FormCheckbox({
  name,
  control,
  label,
  description,
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
          <Field
            orientation="horizontal"
            data-invalid={hasError}
            className={cn('items-start gap-3 py-1', className)}
          >
            <Checkbox
              id={name}
              checked={!!field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={
                hasError
                  ? `${name}-error`
                  : description
                    ? `${name}-desc`
                    : undefined
              }
              className="mt-0.5"
              {...props}
            />
            <FieldContent className="cursor-pointer">
              {label && (
                <FieldLabel
                  htmlFor={name}
                  className="cursor-pointer text-sm leading-none font-medium"
                >
                  {label}
                </FieldLabel>
              )}
              {description && !hasError && (
                <FieldDescription id={`${name}-desc`}>
                  {description}
                </FieldDescription>
              )}
              {hasError && <FieldError id={`${name}-error`} errors={[error]} />}
            </FieldContent>
          </Field>
        )
      }}
    />
  )
}

export default FormCheckbox
