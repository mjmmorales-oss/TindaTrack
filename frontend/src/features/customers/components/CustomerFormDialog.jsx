import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserPlus, UserCheck } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/forms/FormInput'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { PhoneInput } from '@/components/forms/PhoneInput'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { customerSchema } from '@/features/customers/schemas'
import {
  useCreateCustomer,
  useUpdateCustomer,
} from '@/features/customers/hooks/useCustomers'

/**
 * Customer create and edit modal using ResponsiveDialog, RHF, and Zod.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object|null} [props.customer]
 * @param {() => void} [props.onSuccess]
 */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer = null,
  onSuccess,
}) {
  const isEdit = !!customer?.id
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const isPending = createMutation.isPending || updateMutation.isPending

  const defaultValues = {
    name: customer?.name || '',
    nickname: customer?.nickname || '',
    contact_number: customer?.contact_number || '',
    address: customer?.address || '',
    credit_limit: customer?.credit_limit ?? 1000,
    notes: customer?.notes || '',
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name || '',
        nickname: customer?.nickname || '',
        contact_number: customer?.contact_number || '',
        address: customer?.address || '',
        credit_limit: customer?.credit_limit ?? 1000,
        notes: customer?.notes || '',
      })
    }
  }, [open, customer, reset])

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: customer.id,
          data: values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, msgs]) => {
          setError(field, { message: Array.isArray(msgs) ? msgs[0] : msgs })
        })
      }
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'I-edit ang Suki (Edit Customer)' : 'Magdagdag ng Bagong Suki (New Suki)'}
      description={
        isEdit
          ? `Baguhin ang impormasyon at credit limit para kay ${customer?.name || 'suki'}.`
          : 'Magrehistro ng regular na bumibili para sa pagpapautang at loyalty tracking.'
      }
      className="sm:max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name and Nickname */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Buong Pangalan (Full Name)"
            placeholder="Hal. Rosario Mercado"
            required
            error={errors.name?.message}
            {...register('name')}
          />
          <FormInput
            label="Palayaw / Bansag (Nickname)"
            placeholder="Hal. Aling Rosing"
            error={errors.nickname?.message}
            {...register('nickname')}
          />
        </div>

        {/* Contact and Credit Limit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field error={errors.contact_number?.message}>
            <FieldLabel htmlFor="customer-contact">Telepono (PH Mobile)</FieldLabel>
            <Controller
              name="contact_number"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="customer-contact"
                  placeholder="0917-123-4567"
                  value={field.value}
                  onChange={field.onChange}
                  hasError={!!errors.contact_number}
                />
              )}
            />
            {errors.contact_number && (
              <FieldError>{errors.contact_number.message}</FieldError>
            )}
          </Field>

          <Field error={errors.credit_limit?.message}>
            <FieldLabel htmlFor="customer-credit-limit">
              Credit Limit (Hangganan ng Utang)
            </FieldLabel>
            <Controller
              name="credit_limit"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  id="customer-credit-limit"
                  placeholder="1,000.00"
                  value={field.value}
                  onChange={field.onChange}
                  hasError={!!errors.credit_limit}
                />
              )}
            />
            {errors.credit_limit && (
              <FieldError>{errors.credit_limit.message}</FieldError>
            )}
          </Field>
        </div>

        {/* Address */}
        <FormInput
          label="Tirahan / Purok (Address)"
          placeholder="Purok 1, Brgy. San Isidro"
          error={errors.address?.message}
          {...register('address')}
        />

        {/* Notes */}
        <FormTextarea
          label="Karagdagang Tala (Notes)"
          placeholder="Hal. Nanay ni Pedro; suki sa bigas at palaman..."
          rows={3}
          error={errors.notes?.message}
          {...register('notes')}
        />

        {/* Sticky-style Dialog Footer */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Kanselahin (Cancel)
          </Button>
          <Button
            type="submit"
            disabled={isPending || (!isDirty && isEdit)}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sinisave...
              </>
            ) : isEdit ? (
              <>
                <UserCheck className="h-4 w-4" />
                I-update ang Suki
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                I-save ang Suki
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default CustomerFormDialog
