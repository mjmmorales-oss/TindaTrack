import { useState } from 'react'
import { useMockDb } from '@/mocks/db'
import { useResetDemoData } from '@/features/settings/hooks/useSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RotateCcw, Database } from 'lucide-react'

/**
 * Owner-only developer utility page for inspecting mock DB table counts
 * and resetting all demo data to fresh seed state.
 */
export function DevDataPage() {
  useDocumentTitle('Mock Data (Dev)')
  const db = useMockDb()
  const resetMutation = useResetDemoData()
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (window.confirm('I-reset ang lahat ng demo data sa orihinal na binhi?')) {
      setIsResetting(true)
      try {
        await resetMutation.mutateAsync()
      } finally {
        setIsResetting(false)
      }
    }
  }

  const tables = [
    { name: 'settings', count: db.settings ? 1 : 0, desc: 'Store profile & receipt settings' },
    { name: 'staff', count: db.staff?.length || 0, desc: 'User accounts (owner & cashiers)' },
    { name: 'categories', count: db.categories?.length || 0, desc: 'Product category taxonomy' },
    { name: 'products', count: db.products?.length || 0, desc: 'Inventory items with stock & pricing' },
    { name: 'customers', count: db.customers?.length || 0, desc: 'Suki customer ledger records' },
    { name: 'sales', count: db.sales?.length || 0, desc: '90-day POS transactions' },
    { name: 'utang_payments', count: db.utangPayments?.length || 0, desc: 'Customer credit payment records' },
    { name: 'stock_movements', count: db.stockMovements?.length || 0, desc: '30-day stock adjustment audit log' },
  ]

  const totalRecords = tables.reduce((acc, t) => acc + t.count, 0)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Mock Data Manager"
        subtitle="Developer inspection panel for Zustand-persisted mock database."
        actions={
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting || resetMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isResetting ? 'Nire-reset...' : 'Reset Demo Data'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Tables Overview</CardTitle>
          </div>
          <CardDescription>
            Kasalukuyang kabuuang tala: {totalRecords.toLocaleString()} records sa tindatrack-mockdb-v1
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Record Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="font-mono font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.desc}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {t.count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
