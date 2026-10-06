import { Controller } from 'react-hook-form'
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * React Hook Form wrapped Switch field with horizontal alignment, label, description, and error integration.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {string} [props.label] - Switch label text
 * @param {string} [props.description] - Helper text below the label
 * @param {boolean} [props.disabled=false] - Whether the switch is disabled
 * @param {string} [props.className] - Container class name
 * @returns {React.JSX.Element}
 */
export function FormSwitch({
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
            className={cn('items-center justify-between py-1', className)}
          >
            <FieldContent className="cursor-pointer">
              {label && (
                <FieldLabel
                  htmlFor={name}
                  className="cursor-pointer text-sm font-medium"
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
            <Switch
              id={name}
              checked={!!field.value}
              onCheckedChange={field.onChange}
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
          </Field>
        )
      }}
    />
  )
}

export default FormSwitch
