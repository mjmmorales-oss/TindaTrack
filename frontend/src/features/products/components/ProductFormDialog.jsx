import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormInput } from '@/components/forms/FormInput'
import { FormSelect } from '@/components/forms/FormSelect'
import { FormSwitch } from '@/components/forms/FormSwitch'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { productSchema, PRODUCT_UNITS } from '@/features/products/schemas'
import { useCreateProduct, useUpdateProduct } from '@/features/products/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Product Create & Edit modal form using React Hook Form + Zod.
 *
 * @param {object} props
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {object|null} [props.product] - Product to edit (null for create)
 * @param {Array<object>} [props.categories=[]] - Category options
 * @param {() => void} [props.onSuccess] - Success callback
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product = null,
  categories = [],
  onSuccess,
}) {
  const isEdit = !!product && !product.__isDuplicate
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const isPending = createMutation.isPending || updateMutation.isPending

  const categoryOptions = (categories || []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  const defaultValues = {
    name: product?.name || '',
    category_id: product?.category_id ? String(product.category_id) : '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    unit: product?.unit || 'pc',
    price: product?.price ?? 0,
    cost_price: product?.cost_price ?? 0,
    stock_quantity: product?.stock_quantity ?? 0,
    reorder_level: product?.reorder_level ?? 10,
    is_active: product?.is_active ?? true,
    description: product?.description || '',
  }

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name || '',
        category_id: product?.category_id ? String(product.category_id) : '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        unit: product?.unit || 'pc',
        price: product?.price ?? 0,
        cost_price: product?.cost_price ?? 0,
        stock_quantity: product?.stock_quantity ?? 0,
        reorder_level: product?.reorder_level ?? 10,
        is_active: product?.is_active ?? true,
        description: product?.description || '',
      })
    }
  }, [open, product, reset])

  const watchedPrice = Number(watch('price') || 0)
  const watchedCost = Number(watch('cost_price') || 0)
  const showCostWarning = canViewCost && watchedCost > 0 && watchedCost > watchedPrice

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        category_id: Number(values.category_id),
        price: Number(values.price),
        cost_price: Number(values.cost_price || 0),
        stock_quantity: Number(values.stock_quantity || 0),
        reorder_level: Number(values.reorder_level || 10),
      }

      if (isEdit) {
        // Do not update stock_quantity directly in edit
        delete payload.stock_quantity
        await updateMutation.mutateAsync({ id: product.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      // Map Laravel 422 validation errors to form fields
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, msgs]) => {
          setError(field, {
            type: 'server',
            message: Array.isArray(msgs) ? msgs[0] : msgs,
          })
        })
      }
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEdit
          ? `I-edit ang Produkto: ${product.name}`
          : product?.__isDuplicate
            ? 'Kopyahin ang Produkto (Duplicate)'
            : 'Magdagdag ng Bagong Produkto'
      }
      description={
        isEdit
          ? 'I-update ang presyo, detalye, at impormasyon ng paninda.'
          : 'Punan ang impormasyon ng panindang ibebenta sa tindahan.'
      }
      className="sm:max-w-xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Kanselahin
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'I-save ang Pagbabago' : 'Idagdag ang Produkto'}
          </Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name (Full Width) */}
        <FormInput
          name="name"
          control={control}
          label="Pangalan ng Produkto"
          placeholder="hal. Lucky Me! Pancit Canton Kalamansi"
          className="text-base md:text-sm"
          autoFocus
        />

        {/* Category & Unit */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormSelect
            name="category_id"
            control={control}
            label="Kategorya"
            options={categoryOptions}
            placeholder="Pumili ng kategorya..."
          />
          <FormSelect
            name="unit"
            control={control}
            label="Sukat / Unit"
            options={PRODUCT_UNITS}
            placeholder="Pumili ng unit..."
          />
        </div>

        {/* SKU & Barcode */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            name="sku"
            control={control}
            label="SKU (Stock Keeping Unit)"
            placeholder="hal. TT-NOO-001"
            description="Kusang bubuuin kung hahayaang bakante."
          />
          <FormInput
            name="barcode"
            control={control}
            label="Barcode (Opsyonal)"
            placeholder="8-13 digits"
            inputMode="numeric"
          />
        </div>

        {/* Pricing: Selling Price & Cost Price */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="price"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="product-price">Presyo ng Benta (₱)</FieldLabel>
                <MoneyInput
                  id="product-price"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="0.00"
                />
                {error && <FieldError>{error.message}</FieldError>}
              </Field>
            )}
          />

          {canViewCost && (
            <Controller
              name="cost_price"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="product-cost">Puhunan / Cost (₱)</FieldLabel>
                  <MoneyInput
                    id="product-cost"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="0.00"
                  />
                  {error && <FieldError>{error.message}</FieldError>}
                </Field>
              )}
            />
          )}
        </div>

        {/* Cost > Price Warning */}
        {showCostWarning && (
          <Alert variant="warning" className="border-warning bg-warning/10 py-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-warning-foreground font-medium">
              Babala: Mas mataas ang puhunan (₱{watchedCost.toFixed(2)}) kaysa sa presyo ng benta (₱{watchedPrice.toFixed(2)}). Malulugi ang tindahan sa bawat benta nito.
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Quantity & Reorder Level */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            name="stock_quantity"
            control={control}
            label="Panimulang Stock (Quantity)"
            type="number"
            inputMode="numeric"
            disabled={isEdit}
            description={isEdit ? 'Baguhin gamit ang "Adjust Stock".' : undefined}
          />
          <FormInput
            name="reorder_level"
            control={control}
            label="Reorder Level (Alert Limit)"
            type="number"
            inputMode="numeric"
            description="Magpapakita ng babala kapag umabot dito ang stock."
          />
        </div>

        {/* Active Status */}
        <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
          <FormSwitch
            name="is_active"
            control={control}
            label="Aktibong Produkto"
            description="Maaaring ibenta sa POS at hanapin sa tindahan."
          />
        </div>

        {/* Description */}
        <FormTextarea
          name="description"
          control={control}
          label="Paglalarawan / Tala (Opsyonal)"
          placeholder="Mga karagdagang detalye tungkol sa paninda..."
          rows={2}
        />
      </form>
    </ResponsiveDialog>
  )
}

export default ProductFormDialog
