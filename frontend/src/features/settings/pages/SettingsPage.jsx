import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  Store,
  Receipt,
  Boxes,
  Database,
  Save,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/forms/FormInput'
import { PhoneInput } from '@/components/forms/PhoneInput'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { PwaInstallCard } from '@/components/common/PwaInstallPrompt'
import { ReceiptView } from '@/features/pos/components/ReceiptView'
import { AiSettingsCard } from '@/features/settings/components/AiSettingsCard'
import {
  useSettings,
  useUpdateSettings,
  useResetDemoData,
  useRestoreDemoImages,
} from '@/features/settings/hooks/useSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { applyServerErrors } from '@/lib/formErrors'
import { getAutoBarcodeLookup, setAutoBarcodeLookup } from '@/lib/barcodeSettings'

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  useDocumentTitle(t('settings:title'))

  const { data: settingsRes, isLoading } = useSettings()
  const settings = settingsRes?.data
  const updateMutation = useUpdateSettings()
  const resetMutation = useResetDemoData()
  const restoreImagesMutation = useRestoreDemoImages()

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [autoLookup, setAutoLookup] = useState(() => getAutoBarcodeLookup())

  // React Hook Form for settings
  const {
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { isDirty, errors },
  } = useForm({
    defaultValues: {
      store_name: '',
      owner_name: '',
      address: '',
      contact_number: '',
      receipt_header: '',
      receipt_footer: '',
      show_cashier_name: true,
      default_reorder_level: 10,
      low_stock_threshold_percent: 20,
    },
  })

  // Watch values for real-time live ReceiptView preview
  const watchedValues = watch()

  useEffect(() => {
    if (settings) {
      reset({
        store_name: settings.store_name || '',
        owner_name: settings.owner_name || '',
        address: settings.address || '',
        contact_number: settings.contact_number || '',
        receipt_header: settings.receipt_header || '',
        receipt_footer: settings.receipt_footer || 'Thank you! Please come again!',
        show_cashier_name: settings.show_cashier_name ?? true,
        default_reorder_level: settings.default_reorder_level || 10,
        low_stock_threshold_percent: settings.low_stock_threshold_percent ?? 20,
      })
    }
  }, [settings, reset])

  const onSubmit = async (data) => {
    try {
      await updateMutation.mutateAsync(data)
    } catch (err) {
      // 422s show next to the field (the hook already toasted the summary)
      applyServerErrors(err, setError, {
        visibleFields: Object.keys(data),
        fieldMap: { phone: 'contact_number' },
      })
    }
  }

  const handleConfirmReset = async () => {
    await resetMutation.mutateAsync()
    setResetDialogOpen(false)
  }

  // Sample sale for ReceiptView live preview
  const sampleSale = {
    sale_no: 'TT-HALIMBAWA-001',
    created_at: new Date().toISOString(),
    payment_type: 'cash',
    total_amount: 145.0,
    amount_paid: 200.0,
    change_amount: 55.0,
    items: [
      { product_name: 'Coke Mismo 290ml', quantity: 2, unit_price: 25.0, subtotal: 50.0 },
      { product_name: 'Lucky Me Pancit Canton', quantity: 3, unit_price: 18.0, subtotal: 54.0 },
      { product_name: 'Chippy Barbecue 110g', quantity: 1, unit_price: 41.0, subtotal: 41.0 },
    ],
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('settings:pageTitle')}
        description={t('settings:pageSubtitle')}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-10 w-full sm:w-auto inline-flex sm:min-w-[340px]">
            <TabsTrigger value="profile" className="flex-1 sm:flex-none gap-2">
              <Store className="h-4 w-4" />
              {t('settings:profileTab')}
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex-1 sm:flex-none gap-2">
              <Receipt className="h-4 w-4" />
              {t('settings:receiptTab')}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 sm:flex-none gap-2">
              <Boxes className="h-4 w-4" />
              {t('settings:inventoryTab')}
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 sm:flex-none gap-2">
              <Sparkles className="h-4 w-4" />
              {t('settings:aiTab')}
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-1 sm:flex-none gap-2">
              <Database className="h-4 w-4" />
              {t('settings:resetDataTab')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Store Profile */}
        <TabsContent value="profile">
          <Card className="border-border">
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {t('settings:profileCardTitle')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('settings:profileCardDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    name="store_name"
                    control={control}
                    label={t('settings:storeNameLabel')}
                    placeholder={t('settings:storeNamePlaceholder')}
                    required
                    error={errors.store_name?.message}
                  />
                  <FormInput
                    name="owner_name"
                    control={control}
                    label={t('settings:ownerNameLabel')}
                    placeholder={t('settings:ownerNamePlaceholder')}
                    error={errors.owner_name?.message}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-contact">{t('settings:contactNumberLabel')}</Label>
                    <Controller
                      name="contact_number"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          id="store-contact"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('settings:contactNumberPlaceholder')}
                        />
                      )}
                    />
                  </div>
                  <FormInput
                    name="address"
                    control={control}
                    label={t('settings:addressLabel')}
                    placeholder={t('settings:addressPlaceholder')}
                    error={errors.address?.message}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/70 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !isDirty}
                  className="gap-2 w-full sm:w-auto"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t('settings:saveProfileButton')}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <PwaInstallCard className="mt-6" />
          <LanguageSwitcher variant="card" className="mt-6" />
        </TabsContent>

        {/* TAB 2: Receipt Settings with Live Preview */}
        <TabsContent value="receipt">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Form */}
            <div className="lg:col-span-7">
              <Card className="border-border">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {t('settings:receiptCardTitle')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('settings:receiptCardDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormInput
                      name="store_name"
                      control={control}
                      label={t('settings:receiptHeaderLabel')}
                      placeholder={t('settings:receiptHeaderPlaceholder')}
                      error={errors.store_name?.message}
                    />

                    <FormInput
                      name="receipt_footer"
                      control={control}
                      label={t('settings:receiptFooterLabel')}
                      placeholder={t('settings:receiptFooterPlaceholder')}
                      error={errors.receipt_footer?.message}
                    />

                    <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          {t('settings:showCashierLabel')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings:showCashierDesc')}
                        </p>
                      </div>
                      <Controller
                        name="show_cashier_name"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label={t('settings:showCashierLabel')}
                          />
                        )}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end border-t border-border/70 pt-4">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || !isDirty}
                      className="gap-2 w-full sm:w-auto"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t('settings:saveReceiptButton')}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Right: Live Receipt Preview (Side by side on lg, below on phones) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full text-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('settings:receiptPreviewLive')}
                </span>
              </div>
              <div className="w-full max-w-sm rounded-xl border border-dashed border-border bg-card p-4 font-mono text-xs shadow-xs">
                <ReceiptView
                  sale={sampleSale}
                  settings={{
                    store_name: watchedValues.store_name || 'Tindahan ni Aling Nena',
                    address: watchedValues.address || 'Purok 3, Brgy. San Isidro',
                    contact_number: watchedValues.contact_number || '0917-123-4567',
                    receipt_footer: watchedValues.receipt_footer || 'Thank you! Please come again!',
                  }}
                  cashier={{
                    name: watchedValues.show_cashier_name ? 'Juan (Kahera)' : 'Cashier',
                  }}
                  onNewSale={() => {}}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Inventory Defaults */}
        <TabsContent value="inventory">
          <Card className="border-border">
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {t('settings:inventoryCardTitle')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('settings:inventoryCardDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormInput
                    name="default_reorder_level"
                    control={control}
                    label={t('settings:reorderLevelUnits')}
                    type="number"
                    min="1"
                    placeholder="10"
                    error={errors.default_reorder_level?.message}
                  />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label>{t('settings:lowStockPercentLabel')}: {watchedValues.low_stock_threshold_percent}%</Label>
                      <span className="text-muted-foreground">{t('settings:ofReorderLevel')}</span>
                    </div>
                    <Controller
                      name="low_stock_threshold_percent"
                      control={control}
                      render={({ field }) => (
                        <Slider
                          min={10}
                          max={50}
                          step={5}
                          value={[field.value || 20]}
                          onValueChange={(val) => field.onChange(val[0])}
                          className="py-2"
                        />
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t('settings:runningLowDesc', { percent: watchedValues.low_stock_threshold_percent })}
                    </p>
                  </div>

                  {/* Auto Online Barcode Lookup Toggle */}
                  <div className="md:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-lookup-switch" className="text-sm font-semibold cursor-pointer">
                          {t('settings:autoBarcodeLookup')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings:autoBarcodeLookupDesc')}
                        </p>
                      </div>
                      <Switch
                        id="auto-lookup-switch"
                        checked={autoLookup}
                        onCheckedChange={(checked) => {
                          setAutoLookup(checked)
                          setAutoBarcodeLookup(checked)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/70 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !isDirty}
                  className="gap-2 w-full sm:w-auto"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t('settings:saveInventoryButton')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 4: AI & Visual Search */}
        <TabsContent value="ai" className="space-y-6">
          <AiSettingsCard />
        </TabsContent>

        {/* TAB 5: Data Management & Demo Data */}
        <TabsContent value="data" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                {t('settings:restoreDemoImagesCardTitle')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('settings:restoreDemoImagesCardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('settings:restoreDemoImagesBody')}
              </p>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/70 pt-4">
              <Button
                variant="outline"
                onClick={() => setRestoreDialogOpen(true)}
                className="gap-2 w-full sm:w-auto"
                disabled={restoreImagesMutation.isPending}
              >
                {restoreImagesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                {t('settings:restoreDemoImagesButton')}
              </Button>
            </CardFooter>
          </Card>

          {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {t('settings:dataCardTitle')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('settings:dataCardDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive space-y-1.5">
                  <p className="font-semibold text-sm">{t('settings:resetWarningTitle')}</p>
                  <p>
                    {t('settings:resetWarningBody')}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/70 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => setResetDialogOpen(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('settings:resetDataButton')}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Restore Demo Images Dialog */}
      <ConfirmDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title={t('settings:confirmRestoreDemoImagesTitle')}
        description={t('settings:confirmRestoreDemoImagesDesc')}
        confirmText={t('settings:confirmRestoreDemoImagesButton')}
        cancelText={t('settings:cancelRestoreDemoImagesButton')}
        tone="default"
        onConfirm={() => {
          restoreImagesMutation.mutate(undefined, {
            onSettled: () => setRestoreDialogOpen(false),
          })
        }}
        isLoading={restoreImagesMutation.isPending}
      />

      {/* Confirm Reset Dialog */}
      {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
        <ConfirmDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          title={t('settings:confirmResetTitle')}
          description={t('settings:confirmResetDesc')}
          confirmText={t('settings:confirmResetButton')}
          cancelText={t('settings:cancelResetButton')}
          tone="destructive"
          onConfirm={handleConfirmReset}
          isLoading={resetMutation.isPending}
        />
      )}
    </PageContainer>
  )
}

export default SettingsPage
