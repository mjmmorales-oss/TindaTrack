import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Store,
  Receipt,
  Boxes,
  Database,
  Save,
  RotateCcw,
  AlertTriangle,
  Loader2,
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
import { ReceiptView } from '@/features/pos/components/ReceiptView'
import {
  useSettings,
  useUpdateSettings,
  useResetDemoData,
} from '@/features/settings/hooks/useSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SettingsPage() {
  useDocumentTitle('Mga Setting ng Tindahan (Settings)')

  const { data: settingsRes, isLoading } = useSettings()
  const settings = settingsRes?.data
  const updateMutation = useUpdateSettings()
  const resetMutation = useResetDemoData()

  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // React Hook Form for settings
  const {
    handleSubmit,
    control,
    watch,
    reset,
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
        receipt_footer: settings.receipt_footer || 'Salamat po! Balik po kayo muli!',
        show_cashier_name: settings.show_cashier_name ?? true,
        default_reorder_level: settings.default_reorder_level || 10,
        low_stock_threshold_percent: settings.low_stock_threshold_percent || 20,
      })
    }
  }, [settings, reset])

  const onSubmit = async (data) => {
    await updateMutation.mutateAsync(data)
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
        title="Mga Setting ng Tindahan"
        description="I-customize ang impormasyon ng tindahan, disenyo ng resibo, at default ng imbentaryo"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-10 w-full sm:w-auto inline-flex min-w-[340px]">
            <TabsTrigger value="profile" className="flex-1 sm:flex-none gap-2">
              <Store className="h-4 w-4" />
              Impormasyon ng Tindahan
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex-1 sm:flex-none gap-2">
              <Receipt className="h-4 w-4" />
              Resibo & Preview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 sm:flex-none gap-2">
              <Boxes className="h-4 w-4" />
              Mga Default sa Stock
            </TabsTrigger>
            {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
              <TabsTrigger value="data" className="flex-1 sm:flex-none gap-2">
                <Database className="h-4 w-4" />
                Datos & Reset
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* TAB 1: Store Profile */}
        <TabsContent value="profile">
          <Card className="border-border">
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Profile ng Sari-Sari Store
                </CardTitle>
                <CardDescription className="text-xs">
                  Pangunahing pangalan at tirahan na lumalabas sa mga ulat at talaan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    name="store_name"
                    control={control}
                    label="Pangalan ng Tindahan (Store Name)"
                    placeholder="Hal. Tindahan ni Aling Nena"
                    required
                    error={errors.store_name?.message}
                  />
                  <FormInput
                    name="owner_name"
                    control={control}
                    label="Pangalan ng May-ari (Owner Name)"
                    placeholder="Hal. Nena Santos"
                    error={errors.owner_name?.message}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-contact">Telepono ng Tindahan</Label>
                    <Controller
                      name="contact_number"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          id="store-contact"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0917-123-4567"
                        />
                      )}
                    />
                  </div>
                  <FormInput
                    name="address"
                    control={control}
                    label="Tirahan / Lokasyon (Address)"
                    placeholder="Purok 3, Brgy. San Isidro"
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
                  I-save ang Profile
                </Button>
              </CardFooter>
            </form>
          </Card>
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
                      Format ng POS Resibo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      I-customize ang mensahe at detalye sa ilalim ng thermal receipt
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormInput
                      name="store_name"
                      control={control}
                      label="Header ng Resibo (Pangalan sa Itaas)"
                      placeholder="Hal. TINDAHAN NI ALING NENA"
                      error={errors.store_name?.message}
                    />

                    <FormInput
                      name="receipt_footer"
                      control={control}
                      label="Mensahe sa Ibaba (Footer Greetings)"
                      placeholder="Hal. Salamat po! Balik po kayo muli!"
                      error={errors.receipt_footer?.message}
                    />

                    <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          Ipakita ang Pangalan ng Kahera
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ilalagay sa resibo kung sino ang nag-punch ng benta
                        </p>
                      </div>
                      <Controller
                        name="show_cashier_name"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Toggle cashier name on receipt"
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
                      I-save ang Format
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Right: Live Receipt Preview (Side by side on lg, below on phones) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full text-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live Preview ng Resibo
                </span>
              </div>
              <div className="w-full max-w-sm rounded-xl border border-dashed border-border bg-card p-4 font-mono text-xs shadow-xs">
                <ReceiptView
                  sale={sampleSale}
                  settings={{
                    store_name: watchedValues.store_name || 'Tindahan ni Aling Nena',
                    address: watchedValues.address || 'Purok 3, Brgy. San Isidro',
                    contact_number: watchedValues.contact_number || '0917-123-4567',
                    receipt_footer: watchedValues.receipt_footer || 'Salamat po! Balik po kayo muli!',
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
                  Mga Default ng Imbentaryo (Inventory Defaults)
                </CardTitle>
                <CardDescription className="text-xs">
                  Pamantayan para sa mga paalala kapag nauubusan ng paninda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormInput
                    name="default_reorder_level"
                    control={control}
                    label="Default Reorder Level (Piraso)"
                    type="number"
                    min="1"
                    placeholder="10"
                    error={errors.default_reorder_level?.message}
                  />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label>Low-Stock Threshold: {watchedValues.low_stock_threshold_percent}%</Label>
                      <span className="text-muted-foreground">ng reorder level</span>
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
                      Kapag umabot sa {watchedValues.low_stock_threshold_percent}% o mas mababa ang stock,
                      mamarkahan ito bilang "Running Low".
                    </p>
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
                  I-save ang Defaults
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 4: Data Management & Reset Demo Data (Mock fallback only) */}
        {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
          <TabsContent value="data">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Pamamahala ng Datos (Reset Demo Data)
                </CardTitle>
                <CardDescription className="text-xs">
                  Ibalik ang buong database sa orihinal na binhi (seed) para sa pagsusulit o demonstrasyon.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive space-y-1.5">
                  <p className="font-semibold text-sm">BABALA SA PAG-RESET:</p>
                  <p>
                    Ang pag-reset ay magbabalik ng lahat ng paninda, mga kustomer, mga naitalang benta sa POS,
                    at kasaysayan ng utang sa orihinal na mock dataset. Lahat ng bagong naidagdag ay mabubura.
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
                  I-reset ang Lahat ng Demo Data
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm Reset Dialog */}
      {import.meta.env.VITE_DATA_SOURCE === 'mock' && (
        <ConfirmDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          title="I-reset ang Lahat ng Datos sa Simula?"
          description="Mawawala ang lahat ng mga bagong produktong idinagdag, nabagong utang, at bagong benta. Sigurado ka bang nais mong ibalik ang default demo seed data?"
          confirmText="Oo, Ibalik sa Simula"
          cancelText="Huwag Ituloy"
          tone="destructive"
          onConfirm={handleConfirmReset}
          isLoading={resetMutation.isPending}
        />
      )}
    </PageContainer>
  )
}

export default SettingsPage
