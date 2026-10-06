import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit,
  FolderSearch,
  Info,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

import { PageHeader } from '@/components/layout/PageHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Kbd } from '@/components/common/Kbd'
import { Spinner } from '@/components/ui/spinner'
import { ModeToggle } from '@/components/common/ModeToggle'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { BorderBeam } from '@/components/ui/border-beam'
import { notify } from '@/lib/notify'
import { getAvatarUri, getInitials } from '@/lib/avatar'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  toMoney,
} from '@/lib/format'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const sampleChartData = [
  { day: 'Mon', sales: 4200, utang: 650, cash: 3550 },
  { day: 'Tue', sales: 3800, utang: 400, cash: 3400 },
  { day: 'Wed', sales: 5100, utang: 800, cash: 4300 },
  { day: 'Thu', sales: 4600, utang: 550, cash: 4050 },
  { day: 'Fri', sales: 6900, utang: 1200, cash: 5700 },
  { day: 'Sat', sales: 8400, utang: 1400, cash: 7000 },
  { day: 'Sun', sales: 7800, utang: 950, cash: 6850 },
]

const chartConfig = {
  sales: {
    label: 'Total Benta',
    color: 'var(--color-chart-1)',
  },
  cash: {
    label: 'Cash',
    color: 'var(--color-chart-2)',
  },
  utang: {
    label: 'Utang',
    color: 'var(--color-chart-4)',
  },
}

export function DevUiPage() {
  useDocumentTitle('UI Showcase (Dev)')
  const [sliderVal, setSliderVal] = useState([45])
  const [otpVal, setOtpVal] = useState('1234')
  const [moneyVal, setMoneyVal] = useState('250.00')

  const handleTestPromiseToast = () => {
    const mockAction = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.3
          ? resolve('TT-20261007-0042')
          : reject(new Error('Koneksyon nawala'))
      }, 1500)
    })

    notify.promise(mockAction, {
      loading: 'Itinatala ang benta sa database...',
      success: (data) => `Matagumpay na naitala ang ${data} (₱340.00)`,
      error: (err) => `Pumalya ang transaksyon: ${err.message}`,
    })
  }

  return (
    <PageContainer className="space-y-10 pb-16">
      <PageHeader
        title="Design System & UI Kit"
        description="Comprehensive visual verification of TindaTrack tokens, Radix UI components, form inputs, typography, and theme switching."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground mr-1 hidden text-xs sm:inline">
              Theme:
            </span>
            <ModeToggle />
          </div>
        }
      />

      {/* 1. BUTTONS & ACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>1. Buttons & Variants</span>
            <Badge variant="outline">Radix + Tailwind</Badge>
          </CardTitle>
          <CardDescription>
            All standard button variants, touch targets (≥ 44px on mobile),
            icons, and loading spinners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">
              <Plus className="mr-1.5 h-4 w-4" /> Primary (Tinda Green)
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">
              <Trash2 className="mr-1.5 h-4 w-4" /> Destructive
            </Button>
            <Button variant="outline">
              <Edit className="mr-1.5 h-4 w-4" /> Outline
            </Button>
            <Button variant="ghost">Ghost Action</Button>
            <Button variant="link">Link Button</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm">Small (sm)</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large (lg)</Button>
            <Button size="icon" variant="outline" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button disabled>
              <Spinner className="mr-2" /> Saving Sale...
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. SEMANTIC BADGES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            2. Badges & Semantic Status Tokens
          </CardTitle>
          <CardDescription>
            TindaTrack semantic color tokens (AA-contrast verified). Color is
            never the only signal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary text-primary-foreground">
              Primary Active
            </Badge>
            <Badge className="bg-highlight text-highlight-foreground font-semibold">
              Mango Accent
            </Badge>
            <Badge className="bg-success text-success-foreground flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> In Stock · 42 pcs
            </Badge>
            <Badge className="bg-warning text-warning-foreground flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock · 3 left
            </Badge>
            <Badge className="bg-utang text-utang-foreground flex items-center gap-1 font-medium">
              <CreditCard className="h-3.5 w-3.5" /> Utang · ₱1,450.00
            </Badge>
            <Badge className="bg-info text-info-foreground flex items-center gap-1 font-medium">
              <Info className="h-3.5 w-3.5" /> Suki Customer
            </Badge>
            <Badge className="bg-destructive text-destructive-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Voided Sale
            </Badge>
            <Badge variant="outline">Neutral Outline</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 3. FORM CONTROLS & FIELD STATES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            3. Form Fields & Validation States
          </CardTitle>
          <CardDescription>
            Field, FieldLabel, FieldDescription, FieldError with inputs,
            textareas, selects, and toggles.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Text Input with Error */}
          <Field data-invalid="true">
            <FieldLabel htmlFor="field-product">
              Pangalan ng Produkto
            </FieldLabel>
            <Input
              id="field-product"
              defaultValue=""
              placeholder="e.g. Lucky Me Pancit Canton"
              aria-invalid="true"
            />
            <FieldError
              errors={[
                { message: 'Kailangan ilagay ang pangalan ng produkto.' },
              ]}
            />
          </Field>

          {/* Select dropdown */}
          <Field>
            <FieldLabel htmlFor="field-category">Kategorya</FieldLabel>
            <Select defaultValue="instant-noodles">
              <SelectTrigger id="field-category">
                <SelectValue placeholder="Pumili ng kategorya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant-noodles">
                  Instant Noodles & Soups
                </SelectItem>
                <SelectItem value="canned-goods">Canned Goods</SelectItem>
                <SelectItem value="beverages">
                  Beverages & Softdrinks
                </SelectItem>
                <SelectItem value="snacks">Snacks & Biscuits</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Grupo ng paninda para sa POS filters.
            </FieldDescription>
          </Field>

          {/* Textarea */}
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="field-notes">
              Dahilan ng Pag-void (Void Reason)
            </FieldLabel>
            <Textarea
              id="field-notes"
              rows={2}
              placeholder="Halimbawa: Mali ang na-punch na dami ng parokyano..."
            />
            <FieldDescription>
              Kinakailangan kapag nagba-bawi ng naitalang resibo.
            </FieldDescription>
          </Field>

          {/* Checkbox and Switch */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" defaultChecked />
              <label
                htmlFor="terms"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Aktibong Paninda (Active for POS sales)
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Payagan ang Utang</div>
                <div className="text-muted-foreground text-xs">
                  Pahintulutan ang parokyano na mag-utang
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          {/* Radio Group and Slider */}
          <div className="space-y-4">
            <Field>
              <FieldLabel>Paraan ng Pagbabayad</FieldLabel>
              <RadioGroup defaultValue="cash" className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="r-cash" />
                  <label htmlFor="r-cash" className="text-sm">
                    Cash (Bayad Agad)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="utang" id="r-utang" />
                  <label htmlFor="r-utang" className="text-sm">
                    Utang (Suki Credit)
                  </label>
                </div>
              </RadioGroup>
            </Field>

            <Field>
              <div className="flex justify-between text-sm">
                <FieldLabel>Low Stock Alert Level</FieldLabel>
                <span className="font-mono text-xs">{sliderVal[0]} pcs</span>
              </div>
              <Slider
                value={sliderVal}
                onValueChange={setSliderVal}
                max={100}
                step={5}
                className="py-2"
              />
            </Field>
          </div>

          {/* Input OTP */}
          <Field className="md:col-span-2">
            <FieldLabel>Cashier PIN Code (Input OTP)</FieldLabel>
            <InputOTP maxLength={4} value={otpVal} onChange={setOtpVal}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription>
              4-digit PIN para sa mabilisang cashier switch.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {/* 4. INPUT GROUPS & MONEY INPUTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            4. Input Groups & Money Input (₱ Prefix)
          </CardTitle>
          <CardDescription>
            InputGroup with currency prefix, formatted Philippine Peso totals,
            and shortcut key search bar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <Field>
              <FieldLabel>Halaga ng Presyo (Selling Price)</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">₱</InputGroupAddon>
                <InputGroupInput
                  type="number"
                  step="0.25"
                  value={moneyVal}
                  onChange={(e) => setMoneyVal(e.target.value)}
                  placeholder="0.00"
                  className="font-mono text-base tabular-nums"
                />
              </InputGroup>
              <FieldDescription>
                Formatted value:{' '}
                <strong className="text-foreground">
                  {formatCurrency(moneyVal)}
                </strong>
              </FieldDescription>
            </Field>
          </div>

          <div>
            <Field>
              <FieldLabel>Mabilisang Hanap (Quick Search)</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Search className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput placeholder="Maghanap ng produkto, SKU, barcode..." />
                <InputGroupAddon align="inline-end">
                  <Kbd>⌘K</Kbd>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Sinusuportahan ang barcode scanning o typing.
              </FieldDescription>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* 5. OVERLAYS: DIALOG, DRAWER, SHEET */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            5. Overlays: Dialog, Drawer & Sheet
          </CardTitle>
          <CardDescription>
            Responsive overlays: Dialog for desktop modals, Drawer for mobile
            bottom sheets, and Sheet for sidebars.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {/* Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="mr-2 h-4 w-4" /> Open Dialog (Payment)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Kumpirmahin ang Bayad</DialogTitle>
                <DialogDescription>
                  Ilagay ang halaga ng inabot na pera ng parokyano para
                  kalkulahin ang sukli.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                  <span className="text-sm font-medium">Kabuuang Halaga:</span>
                  <span className="text-primary font-mono text-lg font-bold">
                    ₱340.00
                  </span>
                </div>
                <Field>
                  <FieldLabel>Inabot na Pera (Cash Received)</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">₱</InputGroupAddon>
                    <InputGroupInput
                      defaultValue="500.00"
                      className="font-mono tabular-nums"
                    />
                  </InputGroup>
                </Field>
                <div className="text-success flex items-center justify-between text-sm font-semibold">
                  <span>Sukli (Change):</span>
                  <span className="font-mono text-base">₱160.00</span>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Kanselahin</Button>
                </DialogClose>
                <Button
                  onClick={() =>
                    notify.success(
                      'Bayad natanggap!',
                      'Resibo TT-0012 nailimbag.',
                    )
                  }
                >
                  Kumpletuhin ang Benta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" /> Open Drawer (Mobile
                Cart)
              </Button>
            </DrawerTrigger>
            <DrawerContent className="mx-auto max-w-md">
              <DrawerHeader>
                <DrawerTitle>Cart (3 aytem)</DrawerTitle>
                <DrawerDescription>
                  Listahan ng bibilhing paninda sa tindahan.
                </DrawerDescription>
              </DrawerHeader>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">Lucky Me Kalamansi</p>
                    <p className="text-muted-foreground text-xs">2 × ₱16.00</p>
                  </div>
                  <span className="font-mono font-medium">₱32.00</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">Coke Mismo 290ml</p>
                    <p className="text-muted-foreground text-xs">1 × ₱18.00</p>
                  </div>
                  <span className="font-mono font-medium">₱18.00</span>
                </div>
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total</span>
                  <span className="text-primary font-mono text-lg">₱50.00</span>
                </div>
              </div>
              <DrawerFooter>
                <Button onClick={() => notify.success('Check out kumpleto!')}>
                  Magbayad (Checkout)
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">Isara</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          {/* Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" /> Open Sheet (Paninda
                Details)
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Detalye ng Produkto</SheetTitle>
                <SheetDescription>
                  I-edit ang impormasyon at imbentaryo.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-6">
                <Field>
                  <FieldLabel>SKU / Barcode</FieldLabel>
                  <Input
                    defaultValue="4800016644810"
                    className="font-mono text-xs"
                    readOnly
                  />
                </Field>
                <Field>
                  <FieldLabel>Pangalan</FieldLabel>
                  <Input defaultValue="San Miguel Pale Pilsen 330ml" />
                </Field>
                <Field>
                  <FieldLabel>Kasalukuyang Stock</FieldLabel>
                  <Input defaultValue="24" type="number" />
                </Field>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button
                    onClick={() => notify.info('Nai-save ang mga pagbabago')}
                  >
                    I-save
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>

      {/* 6. TOAST FEEDBACK */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            6. Notifications & Toasts (Sonner)
          </CardTitle>
          <CardDescription>
            Centralized notification helper (@/lib/notify) with success, error,
            info, and async promise states.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="text-success hover:bg-success/10 hover:text-success"
              onClick={() =>
                notify.success('Benta naitala!', '₱185.00 natanggap na bayad.')
              }
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Trigger Success Toast
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                notify.error(
                  'Hindi sapat ang stock!',
                  'Kulang ng 2 piraso para makumpleto.',
                )
              }
            >
              <AlertCircle className="mr-1.5 h-4 w-4" /> Trigger Error Toast
            </Button>
            <Button
              variant="outline"
              className="text-info hover:bg-info/10 hover:text-info"
              onClick={() =>
                notify.info(
                  'Paalala sa Utang',
                  'Si Mang Kanor ay may ₱350.00 na babayaran.',
                )
              }
            >
              <Info className="mr-1.5 h-4 w-4" /> Trigger Info Toast
            </Button>
            <Button variant="default" onClick={handleTestPromiseToast}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Trigger Async Promise
              Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 7. DATA VISUALIZATION / CHARTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            7. Data Visualization (Recharts + OKLCH Tokens)
          </CardTitle>
          <CardDescription>
            Fixed semantic chart tokens: Chart-1 (Primary Green), Chart-2
            (Mango), Chart-4 (Utang Amber).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={sampleChartData}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="cash"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="utang"
                  fill="var(--color-chart-4)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* 8. SKELETONS & EMPTY STATES */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8A. Loading Skeletons</CardTitle>
            <CardDescription>
              Smooth placeholder animations for content loading states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="flex justify-between">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8B. Empty State Kit</CardTitle>
            <CardDescription>
              Empty placeholder with helpful guidance and call-to-action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FolderSearch}
              title="Walang natagpuang transaksyon"
              description="Subukang baguhin ang petsa o filter para makita ang mga naitalang benta."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => notify.info('Filter reset')}
                >
                  I-reset ang Filter
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* 9. AVATARS & IDENTITIES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">9. Offline DiceBear Avatars</CardTitle>
          <CardDescription>
            Fully offline SVG avatars generated from seeds via @dicebear/core
            and @dicebear/collection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
              Staff Avatars (Initials Style)
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              {[
                'Aling Nena',
                'Kiko Cashier',
                'Lorna Morales',
                'Benjie Cruz',
              ].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg border p-2"
                >
                  <Avatar>
                    <AvatarImage
                      src={getAvatarUri(name, 'initials')}
                      alt={name}
                    />
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
              Customer Avatars (Notionists & Thumbs Styles)
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              {['Mang Kanor', 'Tessie Santos', 'Kapitan Jun', 'Ate Bebang'].map(
                (name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <Avatar>
                      <AvatarImage
                        src={getAvatarUri(
                          name,
                          i % 2 === 0 ? 'notionists' : 'thumbs',
                        )}
                        alt={name}
                      />
                      <AvatarFallback>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        Suki #{i + 1}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10. KBD & KEYBOARD SHORTCUTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            10. Keyboard Shortcut Badges (&lt;Kbd&gt;)
          </CardTitle>
          <CardDescription>
            Visual shortcut indicators for high-speed POS interaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span>Mabilisang Hanap:</span>
              <Kbd>⌘K</Kbd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Pumunta sa POS:</span>
              <Kbd>F2</Kbd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Magbayad / Checkout:</span>
              <Kbd>F9</Kbd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Kanselahin / Isara:</span>
              <Kbd>Esc</Kbd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>I-kumpirma:</span>
              <Kbd>Enter</Kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 11. MAGIC UI & MICRO-ANIMATIONS */}
      <Card className="relative overflow-hidden">
        <BorderBeam size={250} duration={12} delay={9} />
        <CardHeader>
          <CardTitle className="text-lg">11. Magic UI & Delights</CardTitle>
          <CardDescription>
            Micro-interactions for delight without bloating bundle size.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="bg-muted/40 rounded-xl border p-4">
              <span className="text-muted-foreground block text-xs">
                Animated Number Ticker (Sales Count)
              </span>
              <div className="text-primary flex items-center font-mono text-2xl font-bold">
                <span>₱</span>
                <NumberTicker value={12450} decimalPlaces={2} />
              </div>
            </div>

            <div className="bg-background rounded-full border px-4 py-1.5">
              <AnimatedShinyText className="inline-flex items-center justify-center text-sm font-medium">
                <span>✨ Built specifically para sa mga sari-sari store</span>
                <ArrowRight className="ml-1.5 size-3" />
              </AnimatedShinyText>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
export default DevUiPage
