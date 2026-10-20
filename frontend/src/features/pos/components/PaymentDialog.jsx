import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  BookOpen,
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
import { useCartStore } from '@/stores/cartStore'
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
  const { t } = useTranslation(['pos', 'common', 'errors'])
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
  const currentCreditBalance = Number(selectedCustomer?.credit_balance || 0)
  const projectedCreditBalance = currentCreditBalance + debtIncrease
  const creditLimit = Number(selectedCustomer?.credit_limit ?? 1000)
  const isOverCreditLimit =
    !!selectedCustomer && projectedCreditBalance > creditLimit
  // A down payment above the total would *lower* the balance; the server rejects it too
  const isPaidNowTooHigh = paidNowNum > total
  const canConfirmUtang =
    !!selectedCustomer && !isPaidNowTooHigh && (!isOverCreditLimit || isOwner)

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

    const cartStartedAt = useCartStore.getState().cart_started_at || null
    const cartDurationMs = cartStartedAt
      ? Math.max(0, Date.now() - new Date(cartStartedAt).getTime())
      : null

    const preparedCart = cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      add_method: item.add_method || 'manual',
    }))

    const paymentPayload =
      activeTab === 'cash'
        ? {
            payment_type: 'cash',
            amount_paid: tenderedNum,
            notes: notes.trim() || undefined,
            cart_started_at: cartStartedAt,
            cart_duration_ms: cartDurationMs,
          }
        : {
            payment_type: 'utang',
            customer_id: Number(selectedCustomerId),
            amount_paid: paidNowNum,
            // The owner confirmed going over the credit limit (cashiers can't; the server checks the role)
            override_limit: isOwner && isOverCreditLimit,
            notes: notes.trim() || undefined,
            cart_started_at: cartStartedAt,
            cart_duration_ms: cartDurationMs,
          }

    try {
      const res = await createSaleMutation.mutateAsync({
        cartItems: preparedCart,
        payment: paymentPayload,
      })
      setCompletedSale(res.data)
    } catch (err) {
      setApiError(
        err.message ||
          err.response?.data?.message ||
          t('pos:defaultTransactionError', 'Could not process transaction.'),
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
        completedSale ? t('pos:receiptTitle', 'Transaction Receipt') : t('pos:checkoutTitle', 'Checkout & Payment')
      }
      description={
        completedSale
          ? t('pos:receiptDesc', 'Transaction recorded in system.')
          : `${t('pos:amountDue', 'Amount Due')}: ₱${Number(total || 0).toFixed(2)}`
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
                {t('pos:checkoutIssue', 'Problem with checkout')}
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
                {t('pos:cash', 'Cash')}
              </TabsTrigger>
              <TabsTrigger value="utang" className="gap-2 text-xs font-bold">
                <BookOpen className="h-4 w-4" />
                {t('pos:utang', 'Credit (Utang)')}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CASH */}
            <TabsContent value="cash" className="space-y-4 pt-3">
              {/* Tendered Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tendered-cash" className="text-xs font-semibold">
                    {t('pos:cashReceived', 'Cash Received (Tendered)')}
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleExactCash}
                    className="h-auto p-0 text-xs text-primary font-bold"
                  >
                    {t('pos:exactAmount', 'Exact Amount')} (₱{Number(total || 0).toFixed(2)})
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
                  {t('pos:quickCash', 'Quick Cash:')}
                </span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactCash}
                    className="h-9 text-xs font-bold"
                  >
                    {t('pos:exactAmount', 'Exact')}
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
                  {t('pos:change', 'Sukli (Change)')}
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
                    {t('pos:insufficientCash', { amount: Math.max(0, Number(total || 0) - tenderedNum).toFixed(2) })}
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
                    {t('pos:recordingSale', 'Recording Sale...')}
                  </>
                ) : (
                  <>
                    <Receipt className="h-5 w-5" />
                    {t('pos:confirmCash', { change: Number(changeAmount || 0).toFixed(2) })}
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
                    notify.success(t('pos:customerSelectedForUtang', { name: newCust.name, defaultValue: `Selected ${newCust.name} for credit.` }))
                  }}
                  onCancel={() => setShowNewCustomerForm(false)}
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {t('pos:selectCustomer', 'Select Customer (Suki)')} <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="h-auto p-0 text-xs text-primary font-medium gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t('pos:newCustomer', '+ New Suki')}
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
                    placeholder={t('pos:selectCustomerPlaceholder', 'Search customer name...')}
                  />
                </div>
              )}

              {/* Selected Customer Credit Info */}
              {selectedCustomer && (
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{t('pos:currentUtang', 'Current Credit (Utang):')}</span>
                    <Money amount={currentCreditBalance} size="sm" tone="utang" />
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{t('pos:creditLimit', 'Credit Limit:')}</span>
                    <Money amount={creditLimit} size="sm" tone="muted" />
                  </div>
                  <div className="border-t border-border/60 pt-2 flex justify-between items-center font-bold">
                    <span>{t('pos:newBalance', 'New Balance:')}</span>
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
                    {t('pos:creditLimitWarning', 'Credit Limit Exceeded')}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    {isOwner
                      ? t('pos:limitExceededOwner', 'The new balance will exceed the customer\'s credit limit. As Store Owner, you may authorize this.')
                      : t('pos:limitExceededCashier', 'Credit limit exceeded. A cashier cannot process this without owner approval.')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Optional Partial Payment (Paid Now) */}
              <div className="space-y-1">
                <Label htmlFor="utang-paid-now" className="text-xs font-semibold">
                  {t('pos:paidNowLabel', 'Amount Paid Now (Optional Down Payment)')}
                </Label>
                <MoneyInput
                  id="utang-paid-now"
                  value={paidNowAmount}
                  onChange={(e) => setPaidNowAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 font-mono"
                  aria-invalid={isPaidNowTooHigh || undefined}
                />
                {isPaidNowTooHigh && (
                  <p className="text-xs font-medium text-destructive">
                    {t('pos:paidNowTooHigh')}
                  </p>
                )}
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <Label htmlFor="utang-notes" className="text-xs font-semibold">
                  {t('pos:notesLabel', 'Notes / Reminder (Optional)')}
                </Label>
                <Input
                  id="utang-notes"
                  placeholder={t('pos:notesPlaceholder', 'e.g. Will pay on payday')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 text-base md:text-xs"
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
                    {t('pos:recordingUtang', 'Recording Credit...')}
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5" />
                    {t('pos:chargeToCustomer', { name: selectedCustomer?.name || 'Suki' })}
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
