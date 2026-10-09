import { useState } from 'react'
import { Printer, CheckSquare, Square, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

/**
 * Printable restock shopping checklist grouped by category with interactive checkboxes.
 *
 * @param {object} props
 * @param {object} props.restockData - Data from useRestockList
 * @param {object} [props.settings] - Store settings
 */
export function PrintableRestockList({ restockData, settings }) {
  const [checkedItems, setCheckedItems] = useState({})
  const grouped = restockData?.grouped || {}
  const totalItems = restockData?.total_items || 0
  const categories = Object.keys(grouped)

  const storeName = settings?.store_name || 'Tindahan ni Aling Nena'
  const todayDate = formatDate(new Date().toISOString())

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handlePrint = () => {
    window.print()
  }

  if (totalItems === 0) {
    return (
      <Card className="py-12 text-center text-muted-foreground">
        <CardContent className="space-y-2">
          <ShoppingBag className="mx-auto h-8 w-8 opacity-40" />
          <p className="font-semibold text-foreground text-sm">
            Walang panindang kailangang i-restock!
          </p>
          <p className="text-xs text-muted-foreground">
            Lahat ng mga aktibong paninda ay may sapat na bilang ng stock.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top action header (Screen only) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Listahan ng Pamimili sa Palengke / Grocery ({totalItems} Paninda)
          </h3>
          <p className="text-xs text-muted-foreground">
            Kusang kinakalkula ang iminumungkahing bibilhin base sa minimum stock level.
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2 shadow-xs h-11 sm:h-9 font-semibold">
          <Printer className="h-4 w-4" />
          I-print ang Checklist
        </Button>
      </div>

      {/* Printable Sheet Container */}
      <div
        id="restock-printable-area"
        className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs space-y-6 print:m-0 print:border-none print:p-0 print:shadow-none"
      >
        {/* Printable Header */}
        <div className="border-b border-border/80 pb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-foreground">
              {storeName} — Restock Checklist
            </h2>
            <p className="text-xs text-muted-foreground">
              Petsa ng Listahan: <span className="font-mono text-foreground font-semibold">{todayDate}</span>
            </p>
          </div>
          <Badge variant="outline" className="self-center sm:self-auto font-mono text-xs">
            {totalItems} Kabuuang Paninda
          </Badge>
        </div>

        {/* Categories Grouping */}
        <div className="space-y-6">
          {categories.map((categoryName) => {
            const items = grouped[categoryName] || []
            return (
              <div key={categoryName} className="space-y-2.5">
                <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                    {categoryName}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({items.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((item) => {
                    const isChecked = !!checkedItems[item.id]
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-colors select-none ${
                          isChecked
                            ? 'border-primary/40 bg-primary/5 line-through opacity-70'
                            : 'border-border/70 bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="text-primary mt-0.5 shrink-0"
                            aria-label={`Markahan ang ${item.name}`}
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              Stock ngayon: {item.stock_quantity} · Min: {item.reorder_level}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                            Bilihin: {item.suggested_quantity} {item.unit || 'pcs'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Printable Footer */}
        <div className="border-t border-dashed border-border pt-4 text-center text-[11px] text-muted-foreground">
          <p>TindaTrack Inventory Checklist · Nilikha para sa maayos na pamimili sa palengke</p>
        </div>
      </div>
    </div>
  )
}

export default PrintableRestockList
