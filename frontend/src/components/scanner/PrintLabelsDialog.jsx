import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import JsBarcode from 'jsbarcode'
import { Printer, Minus, Plus } from 'lucide-react'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { toMoney } from '@/lib/format'

function BarcodeItem({ value, className }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const isEan = /^\d{13}$/.test(value)
        JsBarcode(svgRef.current, value, {
          format: isEan ? 'EAN13' : 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          margin: 2,
        })
      } catch {
        try {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width: 1.4,
            height: 36,
            displayValue: true,
            fontSize: 10,
            margin: 2,
          })
        } catch {
          // ignore
        }
      }
    }
  }, [value])

  return <svg ref={svgRef} className={className} />
}

/**
 * PrintLabelsDialog
 * Renders a sheet of barcode price tags for homemade products
 * and triggers window.print().
 */
export function PrintLabelsDialog({
  open,
  onOpenChange,
  product,
}) {
  const { t } = useTranslation(['scanner', 'common'])
  const [copies, setCopies] = useState(12)

  const handlePrint = () => {
    window.print()
  }

  if (!product?.barcode) return null

  const labels = Array.from({ length: copies }, (_, i) => i)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('scanner:printLabelsTitle', 'Print Barcode Labels')}
      description={t('scanner:printLabelsDesc', 'Sticker labels for homemade and repacked products.')}
      className="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {t('scanner:numberOfCopies', 'Number of copies:')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCopies((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-mono text-sm font-bold w-7 text-center">{copies}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCopies((c) => Math.min(60, c + 1))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:close', 'Close')}
            </Button>
            <Button type="button" onClick={handlePrint} className="gap-1.5 font-bold">
              <Printer className="h-4 w-4" />
              {t('scanner:print', 'Print')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Printable Label Grid Container */}
        <div
          id="printable-label-sheet"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[55vh] overflow-y-auto p-2 bg-muted/20 border border-border/80 rounded-xl"
        >
          {labels.map((idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-between p-2.5 bg-white text-black border border-neutral-300 rounded-lg shadow-xs text-center"
            >
              <div className="w-full text-center">
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider leading-none">
                  Tindahan ni Aling Nena
                </p>
                <p className="text-xs font-bold text-neutral-900 leading-tight mt-1 line-clamp-1">
                  {product.name || t('common:product', 'Product')}
                </p>
                <p className="text-sm font-black font-mono text-neutral-950 mt-0.5">
                  {toMoney(product.price || 0)}
                </p>
              </div>

              <div className="mt-1 flex justify-center">
                <BarcodeItem value={product.barcode} className="max-w-[140px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default PrintLabelsDialog
