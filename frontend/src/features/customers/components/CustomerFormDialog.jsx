import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['customers', 'common'])
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
      title={isEdit ? t('customers:editModalTitle') : t('customers:createModalTitle')}
      description={
        isEdit
          ? t('customers:editModalDesc', { name: customer?.name || 'suki' })
          : t('customers:createModalDesc')
      }
      className="sm:max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name and Nickname */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            name="name"
            control={control}
            label={t('customers:fullNameLabel')}
            placeholder={t('customers:fullNamePlaceholder')}
            required
            error={errors.name?.message}
          />
          <FormInput
            name="nickname"
            control={control}
            label={t('customers:nicknameLabel')}
            placeholder={t('customers:nicknamePlaceholder')}
            error={errors.nickname?.message}
          />
        </div>

        {/* Contact and Credit Limit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field error={errors.contact_number?.message}>
            <FieldLabel htmlFor="customer-contact">{t('customers:contactLabel')}</FieldLabel>
            <Controller
              name="contact_number"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="customer-contact"
                  placeholder={t('customers:phonePlaceholder')}
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
              {t('customers:creditLimitLabel')}
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
          name="address"
          control={control}
          label={t('customers:addressLabel')}
          placeholder={t('customers:addressPlaceholder')}
          error={errors.address?.message}
        />

        {/* Notes */}
        <FormTextarea
          name="notes"
          control={control}
          label={t('customers:notesLabel')}
          placeholder={t('customers:notesPlaceholder')}
          rows={3}
          error={errors.notes?.message}
        />

        {/* Sticky-style Dialog Footer */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('customers:cancelModal')}
          </Button>
          <Button
            type="submit"
            disabled={isPending || (!isDirty && isEdit)}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('customers:savingCustomer')}
              </>
            ) : isEdit ? (
              <>
                <UserCheck className="h-4 w-4" />
                {t('customers:updateCustomer')}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                {t('customers:saveCustomer')}
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default CustomerFormDialog
