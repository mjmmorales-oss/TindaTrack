import { useState, useEffect } from 'react'
import {
  Banknote,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  UserPlus,
} from 'lucide-react'
import NumberFlow from '@number-flow/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { CustomerCombobox } from '@/components/forms/CustomerCombobox'
import { Money } from '@/components/common/Money'
import { ReceiptView } from '@/features/pos/components/ReceiptView'
import { NewCustomerMiniForm } from '@/features/pos/components/NewCustomerMiniForm'
import { useCreateSale } from '@/features/sales/hooks/useSales'
import { notify } from '@/lib/notify'

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000]

/**
 * Payment and checkout dialog for POS with Cash and Utang tabs,
 * quick bills, live change calculation, and post-sale receipt preview.
 *
 * @param {object} props
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {Array<object>} props.cartItems - Items currently in cart
 * @param {number} props.total - Total checkout amount
 * @param {Array<object>} props.customers - Customers list
 * @param {object} [props.settings] - Store settings
 * @param {object} [props.currentUser] - Logged in user
 * @param {() => void} props.onSuccessNewSale - Reset cart and refocus search callback
 */
export function PaymentDialog({
  open,
  onOpenChange,
  cartItems = [],
  total = 0,
  customers = [],
  settings,
  currentUser,
  onSuccessNewSale,
}) {
  const [activeTab, setActiveTab] = useState('cash')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paidNowAmount, setPaidNowAmount] = useState('0.00')
  const [notes, setNotes] = useState('')
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [completedSale, setCompletedSale] = useState(null)

  const createSaleMutation = useCreateSale()
  const isOwner = currentUser?.role === 'owner'

  // Reset internal state when dialog opens
  useEffect(() => {
    if (open) {
      setTenderedAmount(total > 0 ? String(total) : '')
      setSelectedCustomerId('')
      setSelectedCustomer(null)
      setPaidNowAmount('0.00')
      setNotes('')
      setShowNewCustomerForm(false)
      setApiError(null)
      setCompletedSale(null)
    }
  }, [open, total])

  // Calculations for Cash Tab
  const tenderedNum = parseFloat(tenderedAmount) || 0
  const isTenderedSufficient = tenderedNum >= total && total > 0
  const changeAmount = Math.max(0, tenderedNum - total)

  // Calculations for Utang Tab
  const paidNowNum = Math.max(0, parseFloat(paidNowAmount) || 0)
  const debtIncrease = Math.max(0, total - paidNowNum)
  const currentCreditBalance = selectedCustomer?.credit_balance ?? 0
  const projectedCreditBalance = currentCreditBalance + debtIncrease
  const creditLimit = selectedCustomer?.credit_limit ?? 1000
  const isOverCreditLimit =
    !!selectedCustomer && projectedCreditBalance > creditLimit
  const canConfirmUtang =
    !!selectedCustomer && (!isOverCreditLimit || isOwner)

  const handleQuickAmount = (amt) => {
    setTenderedAmount(String(amt))
    setApiError(null)
  }

  const handleExactCash = () => {
    setTenderedAmount(String(total))
    setApiError(null)
  }

  const handleCheckout = async () => {
    setApiError(null)

    const preparedCart = cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }))

    const paymentPayload =
      activeTab === 'cash'
        ? {
            payment_type: 'cash',
            amount_paid: tenderedNum,
            notes: notes.trim() || undefined,
          }
        : {
            payment_type: 'utang',
            customer_id: Number(selectedCustomerId),
            amount_paid: paidNowNum,
            notes: notes.trim() || undefined,
          }

    try {
      const res = await createSaleMutation.mutateAsync({
        cartItems: preparedCart,
        payment: paymentPayload,
      })
      setCompletedSale(res.data)
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          err.message ||
          'Hindi maiproseso ang transaksyon.',
      )
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(val) => {
        if (!val && completedSale) {
          onSuccessNewSale?.()
        }
        onOpenChange(val)
      }}
      title={
        completedSale ? 'Resibo ng Transaksyon' : 'Bayaran ang Benta (Checkout)'
      }
      description={
        completedSale
          ? 'Nai-record na ang transaksyon sa system.'
          : `Kabuuang Babayaran: ₱${total.toFixed(2)}`
      }
      className="sm:max-w-md"
    >
      {completedSale ? (
        /* Success Receipt View */
        <ReceiptView
          sale={completedSale}
          settings={settings}
          cashier={currentUser}
          onNewSale={() => {
            onSuccessNewSale?.()
            onOpenChange(false)
          }}
        />
      ) : (
        /* Checkout Forms */
        <div className="space-y-4">
          {/* API Error Banner */}
          {apiError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                May problema sa checkout
              </AlertTitle>
              <AlertDescription className="text-xs mt-0.5">
                {apiError}
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Tabs: Cash vs Utang */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val)
              setApiError(null)
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cash" className="gap-2 text-xs font-bold">
                <Banknote className="h-4 w-4" />
                Cash (Bayad)
              </TabsTrigger>
              <TabsTrigger value="utang" className="gap-2 text-xs font-bold">
                <BookOpen className="h-4 w-4" />
                Utang (Lista)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CASH */}
            <TabsContent value="cash" className="space-y-4 pt-3">
              {/* Tendered Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tendered-cash" className="text-xs font-semibold">
                    Halagang Ibinayad (Tendered)
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleExactCash}
                    className="h-auto p-0 text-xs text-primary font-bold"
                  >
                    Eksaktong Halaga (₱{total.toFixed(2)})
                  </Button>
                </div>
                <MoneyInput
                  id="tendered-cash"
                  value={tenderedAmount}
                  onChange={(e) => {
                    setTenderedAmount(e.target.value)
                    setApiError(null)
                  }}
                  className="h-11 text-lg font-mono"
                  autoFocus
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Mabilisang Pindot (Quick Cash):
                </span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactCash}
                    className="h-9 text-xs font-bold"
                  >
                    Exact
                  </Button>
                  {QUICK_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amt)}
                      className="h-9 font-mono text-xs font-medium"
                    >
                      ₱{amt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Big Sukli / Change Display */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-center transition-colors">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  SUKLI (Change)
                </span>
                <div className="flex items-baseline justify-center font-mono text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-success tabular-nums">
                  <span className="mr-0.5">₱</span>
                  <NumberFlow
                    value={changeAmount}
                    format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  />
                </div>
                {!isTenderedSufficient && tenderedNum > 0 && (
                  <p className="text-[11px] text-destructive font-medium mt-1">
                    Kulang pa ng ₱{(total - tenderedNum).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Confirm Button */}
              <Button
                type="button"
                size="lg"
                disabled={!isTenderedSufficient || createSaleMutation.isPending}
                onClick={handleCheckout}
                className="w-full h-12 text-base font-bold shadow-md gap-2"
              >
                {createSaleMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Itinatala ang Benta...
                  </>
                ) : (
                  <>
                    <Receipt className="h-5 w-5" />
                    Kumpirmahin ang Cash (Sukli: ₱{changeAmount.toFixed(2)})
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 2: UTANG */}
            <TabsContent value="utang" className="space-y-4 pt-3">
              {showNewCustomerForm ? (
                <NewCustomerMiniForm
                  onSuccess={(newCust) => {
                    setSelectedCustomerId(String(newCust.id))
                    setSelectedCustomer(newCust)
                    setShowNewCustomerForm(false)
                    notify.success(`Napili si ${newCust.name} para sa utang.`)
                  }}
                  onCancel={() => setShowNewCustomerForm(false)}
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Pangalan ng Suki <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="h-auto p-0 text-xs text-primary font-medium gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      + Bagong Suki
                    </Button>
                  </div>
                  <CustomerCombobox
                    value={selectedCustomerId}
                    customers={customers}
                    onChange={(id, cust) => {
                      setSelectedCustomerId(id ? String(id) : '')
                      setSelectedCustomer(cust)
                      setApiError(null)
                    }}
                    onAddNew={() => setShowNewCustomerForm(true)}
                    placeholder="Pumili ng suki na magpapalista..."
                  />
                </div>
              )}

              {/* Selected Customer Credit Info */}
              {selectedCustomer && (
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Kasalukuyang Utang (Current):</span>
                    <Money amount={currentCreditBalance} size="sm" tone="utang" />
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Credit Limit:</span>
                    <Money amount={creditLimit} size="sm" tone="muted" />
                  </div>
                  <div className="border-t border-border/60 pt-2 flex justify-between items-center font-bold">
                    <span>Bagong Balanse (New Balance):</span>
                    <Money
                      amount={projectedCreditBalance}
                      size="sm"
                      tone={isOverCreditLimit ? 'destructive' : 'utang'}
                    />
                  </div>
                </div>
              )}

              {/* Credit Limit Exceeded Warning */}
              {isOverCreditLimit && (
                <Alert
                  variant={isOwner ? 'default' : 'destructive'}
                  className="py-2.5 border-warning bg-warning/10 text-warning-foreground"
                >
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-xs font-bold text-warning-foreground">
                    Lampas sa Credit Limit
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    {isOwner
                      ? 'Ang bagong balanse ay lalampas sa limitasyon ng suki. Bilang Store Owner, maaari mong pahintulutan ito.'
                      : 'Lalampas ang utang sa pinapayagang limit. Hindi ito mapoproseso ng kahera nang walang pahintulot ng may-ari.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Optional Partial Payment (Paid Now) */}
              <div className="space-y-1">
                <Label htmlFor="utang-paid-now" className="text-xs font-semibold">
                  Halagang Ibinayad Ngayon (Opsyonal na Paunang Bayad)
                </Label>
                <MoneyInput
                  id="utang-paid-now"
                  value={paidNowAmount}
                  onChange={(e) => setPaidNowAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 font-mono"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <Label htmlFor="utang-notes" className="text-xs font-semibold">
                  Tala / Paalala (Opsyonal)
                </Label>
                <Input
                  id="utang-notes"
                  placeholder="hal. Babayaran sa darating na kinsena"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* Confirm Utang Button */}
              <Button
                type="button"
                size="lg"
                disabled={!canConfirmUtang || createSaleMutation.isPending}
                onClick={handleCheckout}
                className="w-full h-12 text-base font-bold shadow-md gap-2"
              >
                {createSaleMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Itinatala ang Utang...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5" />
                    Ilista sa Utang ni {selectedCustomer?.name || 'Suki'}
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ResponsiveDialog>
  )
}

export default PaymentDialog
