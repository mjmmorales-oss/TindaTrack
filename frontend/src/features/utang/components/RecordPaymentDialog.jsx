import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HandCoins, Loader2, Calendar } from 'lucide-react'

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
  const recordPaymentMutation = useRecordPayment()
  const isPending = recordPaymentMutation.isPending

  const currentBalance = customer?.credit_balance ?? 0

  const getTodayDateString = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const {
    register,
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
        amount: customer.credit_balance,
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
        message: `Hindi maaaring lumampas sa kasalukuyang utang na ₱${currentBalance.toFixed(2)}.`,
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
          notes: values.notes?.trim() || 'Bayad sa tindahan',
        },
      })

      notify.success(`Payment of ₱${paymentAmount.toFixed(2)} recorded for ${customer.name}`)
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

  const remainingBalancePreview = Math.max(
    0,
    currentBalance - (Number(watchedAmount) || 0),
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Kolektahin ang Bayad (Record Payment)"
      description={`Itala ang pagbabayad ng utang para kay ${customer?.nickname ? `${customer.name} (${customer.nickname})` : customer?.name || 'suki'}.`}
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Balance Preview Strip */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <span className="text-xs text-muted-foreground block">
              Kasalukuyang Utang:
            </span>
            <Money amount={currentBalance} size="base" tone="utang" className="font-bold" />
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">
              Matitirang Balanse:
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
            Mabilisang Halaga (Quick Select)
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
              Full (Lahat)
            </Button>
          </div>
        </div>

        {/* Amount Input */}
        <Field error={errors.amount?.message}>
          <FieldLabel htmlFor="payment-amount">Halaga ng Ibinayad (Amount) *</FieldLabel>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="payment-amount"
                placeholder="0.00"
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
          label="Petsa ng Pagbabayad (Payment Date)"
          type="date"
          error={errors.payment_date?.message}
          {...register('payment_date')}
        />

        {/* Payment Note */}
        <FormTextarea
          label="Tala sa Resibo (Note / Reference)"
          placeholder="Hal. Binigay ng anak, paunang bayad sa bigas..."
          rows={2}
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
            disabled={isPending || Number(watchedAmount) <= 0}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Itinatala...
              </>
            ) : (
              <>
                <HandCoins className="h-4 w-4" />
                Itala ang Bayad
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default RecordPaymentDialog
