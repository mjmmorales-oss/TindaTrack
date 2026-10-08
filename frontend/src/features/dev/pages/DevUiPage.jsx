import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
  Eye,
  FolderSearch,
  Info,
  Layers,
  LayoutGrid,
  ListOrdered,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Table as TableIcon,
  Trash2,
  Users,
  Wifi,
  WifiOff,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Kbd } from '@/components/ui/kbd'
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

// Common Component Kit
import { StatCard } from '@/components/common/StatCard'
import { ChartCard } from '@/components/common/ChartCard'
import { TrendBadge } from '@/components/common/TrendBadge'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StockLevelBar } from '@/components/common/StockLevelBar'
import { UserAvatar } from '@/components/common/UserAvatar'
import { ProductThumb } from '@/components/common/ProductThumb'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/TableSkeleton'
import { CardGridSkeleton } from '@/components/common/CardGridSkeleton'
import { KeyValueList } from '@/components/common/KeyValueList'
import { Timeline } from '@/components/common/Timeline'
import { SectionCard } from '@/components/common/SectionCard'

// Data Table Kit
import { DataTable } from '@/components/data-table/DataTable'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { DataTableRowActions } from '@/components/data-table/DataTableRowActions'

// Forms Kit
import { FormInput } from '@/components/forms/FormInput'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { FormSelect } from '@/components/forms/FormSelect'
import { FormSwitch } from '@/components/forms/FormSwitch'
import { FormCheckbox } from '@/components/forms/FormCheckbox'
import { FormRadioGroup } from '@/components/forms/FormRadioGroup'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { QuantityStepper } from '@/components/forms/QuantityStepper'
import { SearchInput } from '@/components/forms/SearchInput'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { PhoneInput } from '@/components/forms/PhoneInput'
import { CustomerCombobox } from '@/components/forms/CustomerCombobox'

// Overlays Kit
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { useConfirm } from '@/components/overlays/useConfirm'

// System Kit
import { OfflineBanner } from '@/components/system/OfflineBanner'
import { FullPageLoader } from '@/components/system/FullPageLoader'

const sampleChartData = [
  { day: 'Mon', sales: 4200, utang: 650, cash: 3550 },
  { day: 'Tue', sales: 3800, utang: 400, cash: 3400 },
  { day: 'Wed', sales: 5100, utang: 800, cash: 4300 },
  { day: 'Thu', sales: 4600, utang: 550, cash: 4050 },
  { day: 'Fri', sales: 6900, utang: 1200, cash: 5700 },
  { day: 'Sat', sales: 8400, utang: 1400, cash: 7000 },
  { day: 'Sun', sales: 7800, utang: 950, cash: 6850 },
]

const sampleTimelineItems = [
  {
    id: 1,
    title: 'Benta sa Utang (Utang Sale)',
    meta: 'Oct 7, 2026 · 10:15 AM · Tindahan ni Aling Nena',
    amount: 145.0,
    amountTone: 'utang',
    balance: 495.0,
    type: 'sale',
  },
  {
    id: 2,
    title: 'Bahagyang Pagbabayad (Partial Payment)',
    meta: 'Oct 6, 2026 · 4:30 PM · Resibo TT-PAY-0082',
    amount: -200.0,
    amountTone: 'success',
    balance: 350.0,
    type: 'payment',
  },
  {
    id: 3,
    title: 'Benta sa Utang (Utang Sale)',
    meta: 'Oct 5, 2026 · 8:12 AM · 3 items (Canton, Coke, Sardines)',
    amount: 250.0,
    amountTone: 'utang',
    balance: 550.0,
    type: 'sale',
  },
]

const sampleCustomers = [
  {
    id: 'c-1',
    name: 'Aling Rosing Dela Cruz',
    nickname: 'Nanay ni Pedro',
    contact: '0917-123-4567',
    credit_balance: 495.0,
    credit_limit: 1500.0,
  },
  {
    id: 'c-2',
    name: 'Mang Kanor Morales',
    nickname: 'Tricycle Driver',
    contact: '0928-888-9999',
    credit_balance: 120.0,
    credit_limit: 500.0,
  },
  {
    id: 'c-3',
    name: 'Tessie Santos',
    nickname: 'Guro sa Elementary',
    contact: '0939-555-1234',
    credit_balance: 0.0,
    credit_limit: 2000.0,
  },
  {
    id: 'c-4',
    name: 'Kapitan Jun Ramos',
    nickname: 'Barangay Captain',
    contact: '0918-222-3333',
    credit_balance: 850.5,
    credit_limit: 3000.0,
  },
]

const sampleProducts = [
  {
    id: 'p-1',
    sku: 'TT-NOO-001',
    name: 'Lucky Me! Pancit Canton Kalamansi',
    category: 'Noodles',
    categoryColor: 'bg-warning/15 text-warning',
    categoryIcon: 'Utensils',
    price: 18.0,
    cost: 14.5,
    stock: 45,
    reorderLevel: 20,
    status: 'active',
  },
  {
    id: 'p-2',
    sku: 'TT-DRI-002',
    name: 'Coca-Cola Mismo 290ml',
    category: 'Drinks',
    categoryColor: 'bg-destructive/15 text-destructive',
    categoryIcon: 'Coffee',
    price: 25.0,
    cost: 21.0,
    stock: 5,
    reorderLevel: 12,
    status: 'active',
  },
  {
    id: 'p-3',
    sku: 'TT-SNA-003',
    name: 'Piattos Cheese 40g',
    category: 'Snacks',
    categoryColor: 'bg-utang/15 text-utang',
    categoryIcon: 'Cookie',
    price: 22.0,
    cost: 17.5,
    stock: 0,
    reorderLevel: 15,
    status: 'active',
  },
  {
    id: 'p-4',
    sku: 'TT-CAN-004',
    name: 'Ligo Sardines in Tomato Sauce 155g',
    category: 'Canned Goods',
    categoryColor: 'bg-info/15 text-info',
    categoryIcon: 'Fish',
    price: 28.0,
    cost: 23.0,
    stock: 18,
    reorderLevel: 10,
    status: 'active',
  },
  {
    id: 'p-5',
    sku: 'TT-DAI-005',
    name: 'Bear Brand Fortified Milk 33g',
    category: 'Dairy',
    categoryColor: 'bg-primary/15 text-primary',
    categoryIcon: 'Milk',
    price: 15.0,
    cost: 12.0,
    stock: 32,
    reorderLevel: 15,
    status: 'inactive',
  },
]

export function DevUiPage() {
  useDocumentTitle('UI Showcase (Dev)')

  // Interactive Form State (React Hook Form)
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      productName: 'Chippy Barbecue 110g',
      productDescription: 'Crispy corn snack, popular with students.',
      category: 'snacks',
      isActive: true,
      allowCredit: false,
      userRole: 'cashier',
    },
  })

  // Standalone Component States
  const [moneyVal, setMoneyVal] = useState('150.00')
  const [stepperVal, setStepperVal] = useState(3)
  const [searchVal, setSearchVal] = useState('')
  const [phoneVal, setPhoneVal] = useState('09171234567')
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date(),
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState('c-1')

  // Modals & Overlays States
  const [isResponsiveDialogOpen, setIsResponsiveDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isDestructiveConfirmOpen, setIsDestructiveConfirmOpen] =
    useState(false)
  const [showFullLoader, setShowFullLoader] = useState(false)
  const [showOfflineBannerPreview, setShowOfflineBannerPreview] =
    useState(false)

  // Imperative Confirm Hook
  const { confirm, ConfirmDialog: ImperativeConfirmDialog } = useConfirm()

  // Table parameters for demonstration
  const [tableParams, setTableParams] = useState({
    page: 1,
    per_page: 10,
    sort: 'name',
    q: '',
  })

  // Table Columns Definition
  const tableColumns = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="SKU" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs font-semibold">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Produkto (Product)" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ProductThumb
              name={row.original.name}
              category={row.original.category}
              size="sm"
            />
            <div className="flex flex-col">
              <span className="text-foreground text-sm leading-snug font-medium">
                {row.original.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {row.original.category}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Presyo (Price)" />
        ),
        cell: ({ row }) => <Money amount={row.original.price} size="sm" />,
      },
      {
        accessorKey: 'stock',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Stock Level" />
        ),
        cell: ({ row }) => {
          const { stock, reorderLevel } = row.original
          let variant = 'in'
          if (stock <= 0) variant = 'out'
          else if (stock <= reorderLevel) variant = 'low'

          return (
            <div className="w-36 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <StatusBadge type="stock" variant={variant} />
                <span className="text-foreground font-mono font-semibold tabular-nums">
                  {stock} pcs
                </span>
              </div>
              <StockLevelBar
                current={stock}
                max={reorderLevel * 2}
                reorderLevel={reorderLevel}
              />
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Katayuan (Status)',
        cell: ({ row }) => (
          <StatusBadge
            type="active"
            variant={row.original.status === 'active' ? 'active' : 'inactive'}
          />
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                label: 'Tingnan (View details)',
                icon: Eye,
                onClick: () => notify.info(`Viewing ${row.original.name}`),
              },
              {
                label: 'I-edit (Edit product)',
                icon: Edit,
                onClick: () => notify.info(`Editing ${row.original.name}`),
              },
              {
                label: 'I-delete',
                icon: Trash2,
                destructive: true,
                onClick: () =>
                  notify.error(`Delete requested for ${row.original.name}`),
              },
            ]}
          />
        ),
      },
    ],
    [],
  )

  const handleTestImperativeConfirm = async () => {
    const confirmed = await confirm({
      title: 'I-void ang Resibo TT-20261007-0037?',
      description:
        'Ibabalik ang mga produkto sa imbentaryo at ibabawas ang utang kung nailista.',
      tone: 'destructive',
      confirmText: 'Oo, I-void ang Benta',
      cancelText: 'Huwag muna',
      requireReason: true,
      reasonLabel: 'Dahilan ng Pag-void (Required)',
      reasonPlaceholder: 'Halimbawa: Mali ang na-punch na item...',
      minReasonLength: 5,
    })

    if (confirmed) {
      notify.success(
        'Matagumpay na na-void!',
        typeof confirmed === 'string' ? `Dahilan: ${confirmed}` : undefined,
      )
    } else {
      notify.info('Kinansela ang pag-void.')
    }
  }

  const handleTestFullLoader = () => {
    setShowFullLoader(true)
    setTimeout(() => {
      setShowFullLoader(false)
      notify.success('Tapos nang mag-load!')
    }, 2000)
  }

  return (
    <PageContainer className="space-y-10 pb-20">
      {/* Offline Banner Real-time or Simulated Preview */}
      <OfflineBanner />
      {showOfflineBannerPreview && (
        <div
          role="alert"
          className="bg-destructive text-destructive-foreground flex items-center justify-between rounded-lg px-4 py-2.5 text-xs font-medium shadow-sm sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              Preview: Nawalan ng koneksyon sa internet. Nakabukas ang offline
              cache.
            </span>
          </div>
          <Button
            size="xs"
            variant="secondary"
            onClick={() => setShowOfflineBannerPreview(false)}
          >
            Isara
          </Button>
        </div>
      )}

      {/* Full Page Loader Preview Overlay */}
      {showFullLoader && (
        <FullPageLoader label="Ipinapakita ang demo loader (2 segundo)..." />
      )}

      {/* Imperative Confirm Dialog Component Host */}
      <ImperativeConfirmDialog />

      {/* Page Header */}
      <PageHeader
        title="TindaTrack Reusable Component Kit"
        description="Kumpletong QA showcase ng Common, Data Table, Forms, Overlays, at System components."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setShowOfflineBannerPreview(!showOfflineBannerPreview)
            }
            className="gap-1.5"
          >
            <Wifi className="h-4 w-4" />
            Toggle Offline Banner
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestFullLoader}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Test FullPageLoader
          </Button>
          <ModeToggle />
        </div>
      </PageHeader>

      {/* =========================================================================
          SECTION 1: COMMON COMPONENT KIT
          ========================================================================= */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <LayoutGrid className="text-primary h-5 w-5" />
            1. Common Component Kit (`src/components/common/`)
          </h2>
          <p className="text-muted-foreground text-sm">
            Display primitives: StatCard, ChartCard, TrendBadge, Money,
            StatusBadge, StockLevelBar, UserAvatar, ProductThumb, Timelines, at
            Skeletons.
          </p>
        </div>

        {/* 1A. KPI Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Benta Ngayong Araw (Today's Sales)"
            value={3482.5}
            format="currency"
            delta={8.4}
            deltaPeriod="vs. kahapon"
            tone="success"
            icon={DollarSign}
            tooltip="Kabuuang nalikom na benta ngayong araw"
          />
          <StatCard
            label="Mga Transaksyon"
            value={37}
            format="number"
            delta={12.0}
            deltaPeriod="vs. kahapon"
            tone="default"
            icon={ShoppingCart}
          />
          <StatCard
            label="Kabuuang Utang (Debtors)"
            value={5120.0}
            format="currency"
            delta={-3.5}
            deltaPeriod="vs. nakaraang linggo"
            tone="warning"
            icon={CreditCard}
          />
          <StatCard
            label="Ubos na Stock (Out of Stock)"
            value={3}
            format="number"
            tone="destructive"
            icon={Package}
          />
        </div>

        {/* 1B. Money Tokens & Sizes */}
        <SectionCard
          title="Money Formatter & Tones"
          description="Palaging tabular-nums na may tamang ₱ currency symbol at semantic tones."
        >
          <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-3 md:grid-cols-6">
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                Default (base)
              </span>
              <Money amount={1240.5} size="base" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                Success
              </span>
              <Money amount={850.0} tone="success" size="lg" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                Utang (Amber)
              </span>
              <Money amount={320.0} tone="utang" size="lg" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                Destructive
              </span>
              <Money amount={45.0} tone="destructive" size="lg" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">Muted</span>
              <Money amount={0.0} tone="muted" size="sm" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs">
                2XL KPI
              </span>
              <Money amount={9540.75} tone="highlight" size="2xl" />
            </div>
          </div>
        </SectionCard>

        {/* 1C. StatusBadges & StockLevelBars */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard
            title="Config-driven StatusBadge"
            description="Laging may Icon + Text (hindi kulay lang) para sa accessibility."
          >
            <div className="space-y-4">
              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                  Stock Status
                </span>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge type="stock" variant="in" />
                  <StatusBadge type="stock" variant="low" />
                  <StatusBadge type="stock" variant="out" />
                </div>
              </div>

              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                  Benta & Bayad (Sales & Payment)
                </span>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge type="sale" variant="completed" />
                  <StatusBadge type="sale" variant="voided" />
                  <StatusBadge type="payment" variant="cash" />
                  <StatusBadge type="payment" variant="utang" />
                </div>
              </div>

              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                  Role & Account
                </span>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge type="role" variant="owner" />
                  <StatusBadge type="role" variant="cashier" />
                  <StatusBadge type="active" variant="active" />
                  <StatusBadge type="active" variant="inactive" />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="StockLevelBar & ProductThumb"
            description="Progress bar na nagpapalit ng kulay at category color product tiles."
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">
                    Pancit Canton (Normal Stock)
                  </span>
                  <span className="text-muted-foreground font-mono">
                    45 / 50 pcs
                  </span>
                </div>
                <StockLevelBar current={45} max={50} reorderLevel={15} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-warning font-medium">
                    Coke Mismo (Low Stock warning)
                  </span>
                  <span className="text-warning font-mono font-semibold">
                    5 / 30 pcs
                  </span>
                </div>
                <StockLevelBar current={5} max={30} reorderLevel={12} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-destructive font-medium">
                    Piattos Cheese (Out of stock)
                  </span>
                  <span className="text-destructive font-mono font-semibold">
                    0 / 25 pcs
                  </span>
                </div>
                <StockLevelBar current={0} max={25} reorderLevel={10} />
              </div>

              <div className="border-t pt-2">
                <span className="text-muted-foreground mb-2 block text-xs font-semibold">
                  Product Thumbnails (Colored tiles + category icons + initials)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <ProductThumb
                    name="Lucky Me! Pancit Canton"
                    category="Noodles"
                    size="sm"
                  />
                  <ProductThumb
                    name="Coca-Cola Mismo"
                    category="Drinks"
                    size="md"
                  />
                  <ProductThumb
                    name="Piattos Cheese"
                    category="Snacks"
                    size="lg"
                  />
                  <ProductThumb
                    name="Ligo Sardines"
                    category="Canned Goods"
                    size="md"
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* 1D. Timeline, KeyValueList & ChartCard */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionCard
            title="Utang Ledger Timeline"
            description="Vertical timeline para sa listahan ng utang at bayad."
            className="lg:col-span-1"
          >
            <Timeline items={sampleTimelineItems} />
          </SectionCard>

          <SectionCard
            title="KeyValueList (Resibo / Impormasyon)"
            description="Label-value list na may integrated copy-to-clipboard."
            className="lg:col-span-1"
          >
            <KeyValueList
              items={[
                { label: 'Store Name', value: 'Tindahan ni Aling Nena' },
                {
                  label: 'Resibo No.',
                  value: 'TT-20261007-0037',
                  copyable: true,
                },
                { label: 'Kahera (Cashier)', value: 'Juan Dela Cruz' },
                {
                  label: 'Paraan ng Bayad',
                  value: <StatusBadge type="payment" variant="cash" />,
                },
                {
                  label: 'Kabuuang Halaga',
                  value: <Money amount={145.0} tone="highlight" size="lg" />,
                },
              ]}
            />
          </SectionCard>

          <ChartCard
            title="ChartCard Container"
            description="Lingguhang trend ng Benta vs. Utang"
            className="lg:col-span-1"
            actions={
              <Badge variant="outline" className="text-xs">
                7 Days
              </Badge>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sampleChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Bar
                  dataKey="cash"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="utang"
                  fill="var(--color-utang)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 1E. EmptyState, ErrorState, Skeletons */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard title="EmptyState & ErrorState">
            <div className="space-y-6">
              <EmptyState
                icon={Package}
                title="Walang nahanap na produkto"
                description="Subukang magpalit ng filter o magdagdag ng bagong paninda sa tindahan."
                action={
                  <Button
                    size="sm"
                    onClick={() => notify.info('Add product clicked')}
                  >
                    Magdagdag ng Produkto
                  </Button>
                }
              />
              <ErrorState
                title="Hindi ma-load ang datos"
                description="Nagkaroon ng problema sa koneksyon sa lokal na database."
                onRetry={() => notify.info('Retrying connection...')}
              />
            </div>
          </SectionCard>

          <SectionCard title="Table & CardGrid Skeletons">
            <div className="space-y-6">
              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
                  TableSkeleton (3 rows, 4 columns)
                </span>
                <TableSkeleton rows={3} columns={4} />
              </div>
              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
                  CardGridSkeleton (2 cards)
                </span>
                <CardGridSkeleton
                  count={2}
                  columns="grid-cols-1 sm:grid-cols-2"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: DATA TABLE KIT
          ========================================================================= */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <TableIcon className="text-primary h-5 w-5" />
            2. Data Table Kit (`src/components/data-table/`)
          </h2>
          <p className="text-muted-foreground text-sm">
            Server-mode TanStack Table na may sorting, filtering, pagination,
            URL synchronization, at mobile card renderer sa ilalim ng `md`.
          </p>
        </div>

        <SectionCard
          title="Interactive Products DataTable"
          description="I-resize ang screen sa mobile (&lt; 768px) para makita ang card renderer mode."
        >
          <DataTable
            columns={tableColumns}
            data={sampleProducts}
            meta={{
              current_page: 1,
              last_page: 3,
              per_page: 10,
              total: 24,
              from: 1,
              to: 5,
            }}
            params={tableParams}
            onParamsChange={setTableParams}
            enableRowSelection={true}
            renderMobileCard={(product) => (
              <Card key={product.id} className="p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      name={product.name}
                      category={product.category}
                      size="md"
                    />
                    <div>
                      <h4 className="text-foreground text-sm font-bold">
                        {product.name}
                      </h4>
                      <p className="text-muted-foreground font-mono text-xs">
                        {product.sku} · {product.category}
                      </p>
                    </div>
                  </div>
                  <Money amount={product.price} size="sm" />
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <StatusBadge
                    type="stock"
                    variant={
                      product.stock <= 0
                        ? 'out'
                        : product.stock <= product.reorderLevel
                          ? 'low'
                          : 'in'
                    }
                  />
                  <span className="font-mono text-xs font-medium">
                    {product.stock} pcs left
                  </span>
                </div>
              </Card>
            )}
          />
        </SectionCard>
      </div>

      {/* =========================================================================
          SECTION 3: FORMS & SPECIALIZED INPUTS KIT
          ========================================================================= */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <Edit className="text-primary h-5 w-5" />
            3. Forms & Inputs Kit (`src/components/forms/`)
          </h2>
          <p className="text-muted-foreground text-sm">
            React Hook Form wrappers (FormInput, FormSelect, FormSwitch,
            FormCheckbox, FormRadioGroup) at mga specialized sari-sari store
            inputs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 3A. RHF Integrated Form */}
          <SectionCard
            title="React Hook Form Integration"
            description="FormInput, FormTextarea, FormSelect, FormSwitch, FormCheckbox, FormRadioGroup."
          >
            <form
              onSubmit={handleSubmit((data) =>
                notify.success(
                  'Form saved successfully!',
                  JSON.stringify(data),
                ),
              )}
              className="space-y-4"
            >
              <FormInput
                name="productName"
                control={control}
                label="Pangalan ng Produkto"
                placeholder="Hal. Lucky Me! Pancit Canton"
                description="Ipakikita sa POS grid at resibo"
              />

              <FormTextarea
                name="productDescription"
                control={control}
                label="Deskripsyon / Detalye"
                placeholder="Maikling paliwanag..."
              />

              <FormSelect
                name="category"
                control={control}
                label="Kategorya (Category)"
                placeholder="Pumili ng kategorya"
                options={[
                  { value: 'noodles', label: 'Noodles & Pastas' },
                  { value: 'drinks', label: 'Beverages & Softdrinks' },
                  { value: 'snacks', label: 'Chichirya & Snacks' },
                  { value: 'canned', label: 'Canned Goods & Sardines' },
                ]}
              />

              <div className="space-y-3 border-t pt-2">
                <FormSwitch
                  name="isActive"
                  control={control}
                  label="Aktibo sa Tindahan (Active Status)"
                  description="Maaaring ibenta sa POS kapag naka-on"
                />

                <FormCheckbox
                  name="allowCredit"
                  control={control}
                  label="Puwede Utangin (Eligible for Utang)"
                  description="Payagan ang suki na ilista sa utang ang produktong ito"
                />

                <FormRadioGroup
                  name="userRole"
                  control={control}
                  label="Tungkulin (Assigned Staff Role)"
                  orientation="horizontal"
                  options={[
                    {
                      value: 'cashier',
                      label: 'Cashier (Kahera)',
                      description: 'Access sa POS at Utang collection',
                    },
                    {
                      value: 'owner',
                      label: 'Store Owner',
                      description: 'Buong access sa inventory at reports',
                    },
                  ]}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="submit">I-save ang Form</Button>
                <Button type="button" variant="outline" onClick={() => reset()}>
                  I-reset
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* 3B. Standalone Specialized Store Controls */}
          <SectionCard
            title="Specialized Store Inputs"
            description="MoneyInput, QuantityStepper, PhoneInput, CustomerCombobox, DateRangePicker, PasswordInput, SearchInput."
          >
            <div className="space-y-5">
              {/* MoneyInput */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  MoneyInput (₱ Addon, Decimal Guard, Never Negative)
                </label>
                <MoneyInput
                  value={moneyVal}
                  onChange={(e) => setMoneyVal(e.target.value)}
                  placeholder="0.00"
                />
                <span className="text-muted-foreground block text-xs">
                  Current raw state:{' '}
                  <code className="font-mono">{moneyVal}</code>
                </span>
              </div>

              {/* QuantityStepper */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  QuantityStepper (≥ 44px Buttons, Long-press Rapid Repeat,
                  Min/Max)
                </label>
                <div className="flex items-center gap-4">
                  <QuantityStepper
                    value={stepperVal}
                    onChange={setStepperVal}
                    min={1}
                    max={15}
                    stockHint={
                      stepperVal >= 12 ? 'Limitado na ang stock!' : undefined
                    }
                  />
                  <div className="text-muted-foreground text-xs">
                    Quantity:{' '}
                    <b className="text-foreground font-mono text-sm">
                      {stepperVal}
                    </b>{' '}
                    pcs
                  </div>
                </div>
              </div>

              {/* PhoneInput */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  PhoneInput (Philippine Mask: 09XX-XXX-XXXX)
                </label>
                <PhoneInput
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                />
              </div>

              {/* CustomerCombobox */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  CustomerCombobox (Searchable Suki Picker + Balance Badge)
                </label>
                <CustomerCombobox
                  value={selectedCustomerId}
                  onChange={(id) => setSelectedCustomerId(id)}
                  customers={sampleCustomers}
                  onAddNew={() =>
                    notify.info('Add new customer modal triggered')
                  }
                />
              </div>

              {/* DateRangePicker */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  DateRangePicker (Popover + Calendar + PH Presets)
                </label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>

              {/* SearchInput with Debounce */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  SearchInput (300ms Debounce, Clear Button, ⌘K Hint)
                </label>
                <SearchInput
                  value={searchVal}
                  onChange={setSearchVal}
                  placeholder="Maghanap ng paninda o SKU..."
                />
              </div>

              {/* PasswordInput with Strength Meter */}
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-semibold">
                  PasswordInput (Show/Hide Toggle + Dynamic Strength Meter)
                </label>
                <PasswordInput
                  showStrength={true}
                  placeholder="Subukang mag-type ng password..."
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: OVERLAYS & MODALS KIT
          ========================================================================= */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <Layers className="text-primary h-5 w-5" />
            4. Overlays & Dialogs Kit (`src/components/overlays/`)
          </h2>
          <p className="text-muted-foreground text-sm">
            ResponsiveDialog (Dialog sa Desktop, Drawer sa Mobile),
            ConfirmDialog na may destructive tone at required reason, at
            useConfirm hook.
          </p>
        </div>

        <SectionCard
          title="Modal & Confirmation Actions"
          description="I-click ang mga button para ma-QA ang mga iba't ibang modal behaviors."
        >
          <div className="flex flex-wrap items-center gap-4">
            {/* 4A. ResponsiveDialog Trigger */}
            <Button
              variant="outline"
              onClick={() => setIsResponsiveDialogOpen(true)}
              className="gap-2"
            >
              <Store className="h-4 w-4" />
              Buksan ang ResponsiveDialog
            </Button>

            {/* 4B. Standard ConfirmDialog */}
            <Button
              variant="secondary"
              onClick={() => setIsConfirmDialogOpen(true)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Standard ConfirmDialog
            </Button>

            {/* 4C. Destructive Confirm with Reason */}
            <Button
              variant="destructive"
              onClick={() => setIsDestructiveConfirmOpen(true)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Destructive Confirm (With Reason)
            </Button>

            {/* 4D. Imperative useConfirm() Hook Trigger */}
            <Button
              variant="default"
              onClick={handleTestImperativeConfirm}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Test Imperative useConfirm()
            </Button>
          </div>
        </SectionCard>

        {/* ResponsiveDialog instance */}
        <ResponsiveDialog
          open={isResponsiveDialogOpen}
          onOpenChange={setIsResponsiveDialogOpen}
          title="Responsive Form / Details"
          description="Sa desktop (md+), ito ay Dialog; sa mobile (< md), ito ay ilalim na Drawer."
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsResponsiveDialogOpen(false)}
              >
                Isara (Close)
              </Button>
              <Button
                onClick={() => {
                  setIsResponsiveDialogOpen(false)
                  notify.success('Nai-save ang aksyon!')
                }}
              >
                I-save
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ang modal na ito ay awtomatikong sumusunod sa screen size ng user
              upang maging madali ang pag-encode kahit hawak lang ang smartphone
              nang isang kamay.
            </p>
            <div className="bg-muted/20 rounded-lg border p-3">
              <span className="text-foreground mb-1 block text-xs font-semibold">
                Sampol na Input sa loob ng Dialog:
              </span>
              <Input placeholder="Pangalan ng kustomer o produkto..." />
            </div>
          </div>
        </ResponsiveDialog>

        {/* Standard ConfirmDialog instance */}
        <ConfirmDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          title="I-save ang mga pagbabago?"
          description="Nais mo bang i-update ang mga presyo at reorder levels ng mga produkto?"
          confirmText="Oo, I-save"
          cancelText="Bumalik"
          tone="default"
          onConfirm={() => {
            notify.success('Nai-save ang mga pagbabago!')
          }}
        />

        {/* Destructive ConfirmDialog with Reason instance */}
        <ConfirmDialog
          open={isDestructiveConfirmOpen}
          onOpenChange={setIsDestructiveConfirmOpen}
          title="I-delete ang Produkto?"
          description="Hindi na ito makikita sa POS. Ang mga nakaraang benta ay mananatili pa rin sa ulat."
          confirmText="I-delete ang Produkto"
          cancelText="Kanselahin"
          tone="destructive"
          requireReason={true}
          reasonLabel="Dahilan ng Pagbura (Bakit buburahin?)"
          reasonPlaceholder="Hal. Discontinued na ng supplier, expired..."
          minReasonLength={4}
          onConfirm={(reason) => {
            notify.error('Nabura ang produkto!', `Dahilan: ${reason}`)
          }}
        />
      </div>

      {/* =========================================================================
          SECTION 5: SYSTEM COMPONENTS & NOTIFICATIONS
          ========================================================================= */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <Bell className="text-primary h-5 w-5" />
            5. System Components & Toast Helper (`src/lib/notify.js`)
          </h2>
          <p className="text-muted-foreground text-sm">
            OfflineBanner, FullPageLoader, Sonner notification toasts sa
            pamamagitan ng `@/lib/notify`.
          </p>
        </div>

        <SectionCard
          title="Toast Notifications Test"
          description="I-trigger ang mga semantic notification types mula sa lib/notify.js."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                notify.success(
                  'Matagumpay na naitala ang benta!',
                  'Resibo TT-20261007-0037 · ₱145.00',
                )
              }
            >
              Success Toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.error(
                  'Hindi sapat ang stock!',
                  '3 piraso na lamang ang natitira.',
                )
              }
            >
              Error Toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.info(
                  'Bagong update sa system',
                  'Bersyon 2.0 ay handa nang gamitin.',
                )
              }
            >
              Info Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const promise = new Promise((resolve) =>
                  setTimeout(() => resolve({ id: 101 }), 1500),
                )
                notify.promise(promise, {
                  loading: 'Nag-iimpok ng datos...',
                  success: 'Matagumpay na na-sync sa server!',
                  error: 'Nabigong i-sync ang transaksyon.',
                })
              }}
            >
              Promise Toast
            </Button>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  )
}

export default DevUiPage
