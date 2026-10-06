import { Controller } from 'react-hook-form'
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/**
 * @typedef {object} RadioOption
 * @property {string} value - Radio option value
 * @property {string} label - Radio option display label
 * @property {string} [description] - Optional subtext for the option
 * @property {boolean} [disabled] - Whether this specific option is disabled
 */

/**
 * React Hook Form wrapped RadioGroup component with options, legends, and validation error states.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Form field name
 * @param {import('react-hook-form').Control<any>} props.control - React Hook Form control
 * @param {RadioOption[]} props.options - List of selectable radio options
 * @param {string} [props.label] - Group legend or label
 * @param {string} [props.description] - Group-level helper description
 * @param {boolean} [props.disabled=false] - Whether the whole group is disabled
 * @param {'vertical'|'horizontal'} [props.orientation='vertical'] - Radio group layout orientation
 * @param {string} [props.className] - Container class name
 * @param {string} [props.groupClassName] - RadioGroup inner container class name
 * @returns {React.JSX.Element}
 */
export function FormRadioGroup({
  name,
  control,
  options = [],
  label,
  description,
  disabled = false,
  orientation = 'vertical',
  className,
  groupClassName,
  ...props
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const hasError = !!error

        return (
          <FieldSet data-invalid={hasError} className={cn('gap-3', className)}>
            {label && <FieldLegend>{label}</FieldLegend>}
            <RadioGroup
              id={name}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={
                hasError
                  ? `${name}-error`
                  : description
                    ? `${name}-desc`
                    : undefined
              }
              className={cn(
                orientation === 'horizontal'
                  ? 'flex flex-wrap gap-4'
                  : 'grid gap-2.5',
                groupClassName,
              )}
              {...props}
            >
              {options.map((opt) => {
                const optId = `${name}-${opt.value}`
                const isItemDisabled = disabled || opt.disabled

                return (
                  <Field
                    key={opt.value}
                    orientation="horizontal"
                    className="cursor-pointer items-start gap-2.5 py-0.5"
                  >
                    <RadioGroupItem
                      id={optId}
                      value={opt.value}
                      disabled={isItemDisabled}
                      className="mt-0.5"
                    />
                    <FieldContent>
                      <FieldLabel
                        htmlFor={optId}
                        className={cn(
                          'cursor-pointer text-sm leading-tight font-normal',
                          isItemDisabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        {opt.label}
                      </FieldLabel>
                      {opt.description && (
                        <FieldDescription className="text-xs">
                          {opt.description}
                        </FieldDescription>
                      )}
                    </FieldContent>
                  </Field>
                )
              })}
            </RadioGroup>
            {description && !hasError && (
              <FieldDescription id={`${name}-desc`}>
                {description}
              </FieldDescription>
            )}
            {hasError && <FieldError id={`${name}-error`} errors={[error]} />}
          </FieldSet>
        )
      }}
    />
  )
}

export default FormRadioGroup
