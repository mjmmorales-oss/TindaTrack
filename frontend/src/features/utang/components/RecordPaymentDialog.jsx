import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { HandCoins, Loader2 } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { FormInput } from '@/components/forms/FormInput'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Money } from '@/components/common/Money'
import { recordPaymentSchema } from '@/features/utang/schemas'
import { useRecordPayment } from '@/features/utang/hooks/useUtang'
import { notify } from '@/lib/notify'
import { applyServerErrors } from '@/lib/formErrors'

/**
 * Shared Record Payment Dialog for collecting customer utang payments.
 *
 * @param {object} props
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {object|null} props.customer - Customer paying utang
 * @param {() => void} [props.onSuccess] - Success callback
 */
export function RecordPaymentDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}) {
  const { t } = useTranslation(['utang', 'common'])
  const recordPaymentMutation = useRecordPayment()
  const isPending = recordPaymentMutation.isPending

  const currentBalance = Number(customer?.credit_balance ?? 0)

  const getTodayDateString = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: currentBalance,
      payment_date: getTodayDateString(),
      notes: '',
    },
  })

  const watchedAmount = watch('amount')

  useEffect(() => {
    if (open && customer) {
      reset({
        amount: Number(customer.credit_balance || 0),
        payment_date: getTodayDateString(),
        notes: '',
      })
    }
  }, [open, customer, reset])

  const handleQuickAmount = (val) => {
    const target = Math.min(val, currentBalance)
    setValue('amount', target, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = async (values) => {
    if (!customer?.id) return

    const paymentAmount = Number(values.amount || 0)
    if (paymentAmount > currentBalance) {
      setError('amount', {
        message: t('utang:exceedsBalanceError', { amount: currentBalance.toFixed(2) }),
      })
      return
    }

    try {
      await recordPaymentMutation.mutateAsync({
        customerId: customer.id,
        data: {
          amount: paymentAmount,
          payment_date: values.payment_date
            ? new Date(values.payment_date).toISOString()
            : new Date().toISOString(),
          notes: values.notes?.trim() || t('utang:defaultNotes'),
        },
      })

      notify.success(
        t('utang:paymentRecordedSuccess', {
          amount: paymentAmount.toFixed(2),
          name: customer.name,
        }),
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      applyServerErrors(err, setError, {
        visibleFields: ['amount', 'payment_date', 'notes'],
      })
    }
  }

  const remainingBalancePreview = Math.max(
    0,
    currentBalance - (Number(watchedAmount) || 0),
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('utang:dialogTitle')}
      description={t('utang:dialogDesc', {
        name: customer?.nickname ? `${customer.name} (${customer.nickname})` : customer?.name || 'suki',
      })}
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Balance Preview Strip */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <span className="text-xs text-muted-foreground block">
              {t('utang:currentBalanceLabel')}
            </span>
            <Money amount={currentBalance} size="base" tone="utang" className="font-bold" />
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">
              {t('utang:remainingBalanceLabel')}
            </span>
            <Money
              amount={remainingBalancePreview}
              size="base"
              tone={remainingBalancePreview === 0 ? 'success' : 'muted'}
              className="font-bold"
            />
          </div>
        </div>

        {/* Quick Amount Buttons (44px tap target, grid-cols-3) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">
            {t('utang:quickSelectLabel')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 font-semibold text-sm"
              disabled={currentBalance < 50}
              onClick={() => handleQuickAmount(50)}
            >
              ₱50
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 font-semibold text-sm"
              disabled={currentBalance < 100}
              onClick={() => handleQuickAmount(100)}
            >
              ₱100
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-11 font-semibold text-sm border border-border/80"
              onClick={() => handleQuickAmount(currentBalance)}
            >
              {t('utang:quickFull')}
            </Button>
          </div>
        </div>

        {/* Amount Input */}
        <Field error={errors.amount?.message}>
          <FieldLabel htmlFor="payment-amount">{t('utang:amountLabel')}</FieldLabel>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="payment-amount"
                placeholder={t('utang:amountPlaceholder')}
                value={field.value}
                onChange={field.onChange}
                hasError={!!errors.amount}
              />
            )}
          />
          {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
        </Field>

        {/* Payment Date */}
        <FormInput
          name="payment_date"
          control={control}
          label={t('utang:paymentDateLabel')}
          type="date"
          error={errors.payment_date?.message}
        />

        {/* Payment Note */}
        <FormTextarea
          name="notes"
          control={control}
          label={t('utang:paymentNotesLabel')}
          placeholder={t('utang:notesPlaceholder')}
          rows={2}
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
            {t('utang:cancelButton')}
          </Button>
          <Button
            type="submit"
            disabled={isPending || Number(watchedAmount) <= 0}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('utang:recordingPayment')}
              </>
            ) : (
              <>
                <HandCoins className="h-4 w-4" />
                {t('utang:submitButton')}
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default RecordPaymentDialog
