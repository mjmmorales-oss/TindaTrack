import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Printer, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/common/Money'
import { formatDateTime } from '@/lib/format'

/**
 * Printable POS receipt preview displayed after successful sale checkout.
 *
 * @param {object} props
 * @param {object} props.sale - Successfully recorded sale object
 * @param {object} [props.settings] - Store settings
 * @param {object} [props.cashier] - Current user / cashier
 * @param {() => void} props.onNewSale - Reset POS and clear cart callback
 */
export function ReceiptView({ sale, settings, cashier, onNewSale }) {
  const { t } = useTranslation(['pos', 'common'])
  const storeName = settings?.store_name || 'Tindahan ni Aling Nena'
  const storeAddress = settings?.address || 'Purok 3, Brgy. San Isidro'
  const storeContact = settings?.contact_number || '0917-123-4567'
  const receiptFooter = settings?.receipt_footer || 'Salamat po! Balik po kayo!'

  const isUtang = sale.payment_type === 'utang'
  const cashierName = cashier?.name || 'Cashier'

  const handlePrint = () => {
    window.print()
  }

  // Keyboard shortcut: Enter starts new sale
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onNewSale?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewSale])

  return (
    <div className="space-y-6">
      {/* Success Badge Banner (Screen only) */}
      <div className="flex flex-col items-center justify-center text-center space-y-1 print:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success mb-1 animate-in zoom-in-75 duration-200">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          {t('pos:saleCompleteTitle', 'Sale Completed Successfully')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('pos:receiptNo', 'Receipt #')}: <span className="font-mono font-medium text-foreground">{sale.sale_no}</span>
        </p>
      </div>

      {/* Thermal Receipt Paper Card (Screen + Print) */}
      <div
        id="pos-thermal-receipt"
        className="mx-auto max-w-[340px] rounded-xl border border-dashed border-border bg-card p-5 font-mono text-xs shadow-xs print:m-0 print:max-w-none print:border-none print:p-0 print:shadow-none"
      >
        {/* Store Header */}
        <div className="text-center space-y-0.5 border-b border-dashed border-border/80 pb-3">
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
            {storeName}
          </h2>
          <p className="text-[11px] text-muted-foreground">{storeAddress}</p>
          <p className="text-[11px] text-muted-foreground">{storeContact}</p>
        </div>

        {/* Metadata */}
        <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-border/80">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('pos:receiptNo', 'Receipt #')}:</span>
            <span className="font-bold text-foreground">{sale.sale_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('common:date', 'Date')}:</span>
            <span>{formatDateTime(sale.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('common:cashier', 'Cashier')}:</span>
            <span>{cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('common:paymentMethod', 'Method')}:</span>
            <span className="uppercase font-semibold text-foreground">
              {isUtang ? t('pos:utang', 'Credit (Utang)') : t('pos:cash', 'Cash')}
            </span>
          </div>
        </div>

        {/* Line Items */}
        <div className="py-2.5 space-y-2 border-b border-dashed border-border/80">
          {sale.items &&
            sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-foreground font-medium">
                  <span className="truncate pr-2">{item.product_name}</span>
                  <Money amount={item.subtotal} size="xs" />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {item.quantity} × ₱{Number(item.unit_price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* Totals & Payments */}
        <div className="py-2.5 space-y-1.5 border-b border-dashed border-border/80">
          <div className="flex justify-between text-xs font-bold text-foreground">
            <span>{t('pos:totalAmount', 'TOTAL AMOUNT')}:</span>
            <Money amount={sale.total_amount} size="sm" tone="highlight" />
          </div>

          {isUtang ? (
            <>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{t('pos:paidNow', 'Paid Now:')}</span>
                <Money amount={sale.amount_paid} size="xs" />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-utang">
                <span>{t('pos:addedToCredit', 'Added to Credit:')}</span>
                <Money
                  amount={Math.max(0, sale.total_amount - sale.amount_paid)}
                  size="xs"
                  tone="utang"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{t('pos:cashTendered', 'Cash Tendered:')}</span>
                <Money amount={sale.amount_paid} size="xs" />
              </div>
              <div className="flex justify-between text-xs font-bold text-success">
                <span>{t('pos:change', 'SUKLI (Change)')}:</span>
                <Money
                  amount={sale.change_amount}
                  size="sm"
                  tone="success"
                  className="font-extrabold"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Greetings */}
        <div className="pt-3 text-center space-y-1">
          <p className="text-[11px] font-medium text-foreground">{receiptFooter}</p>
          <p className="text-[9px] text-muted-foreground">
            POS Powered by TindaTrack
          </p>
        </div>
      </div>

      {/* Action Buttons (Screen only) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handlePrint}
          className="w-full sm:w-auto gap-2"
        >
          <Printer className="h-4 w-4" />
          {t('pos:printReceipt', 'Print Thermal Receipt')}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onNewSale}
          className="w-full sm:w-auto gap-2 shadow-md"
        >
          <PlusCircle className="h-4 w-4" />
          {t('pos:newSale', 'New Sale')}
        </Button>
      </div>
    </div>
  )
}

export default ReceiptView
