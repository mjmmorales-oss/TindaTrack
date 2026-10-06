import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  CheckCircle2,
  Lock,
  ScanBarcode,
  ShieldCheck,
  Store,
  Users,
  Warehouse,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const [apiPing, setApiPing] = useState(null)
  const [ownerTestResult, setOwnerTestResult] = useState(null)
  const [staffTestResult, setStaffTestResult] = useState(null)
  const [isLoadingPing, setIsLoadingPing] = useState(true)

  useEffect(() => {
    api
      .get('/ping')
      .then((res) => setApiPing(res.data))
      .catch((err) => setApiPing({ status: 'error', message: err.message }))
      .finally(() => setIsLoadingPing(false))
  }, [])

  const testOwnerEndpoint = async () => {
    try {
      const res = await api.get('/owner/ping')
      setOwnerTestResult({ status: 200, message: res.data.message })
      notify.success('Owner endpoint returned 200 OK')
    } catch (err) {
      const status = err.response?.status || 500
      const message = err.response?.data?.message || err.message
      setOwnerTestResult({ status, message })
      notify.error(`Owner endpoint returned ${status} ${message}`)
    }
  }

  const testStaffEndpoint = async () => {
    try {
      const res = await api.get('/staff/ping')
      setStaffTestResult({ status: 200, message: res.data.message })
      notify.success('Staff endpoint returned 200 OK')
    } catch (err) {
      const status = err.response?.status || 500
      const message = err.response?.data?.message || err.message
      setStaffTestResult({ status, message })
      notify.error(`Staff endpoint returned ${status}`)
    }
  }

  const isOwner = user?.role === 'owner'

  return (
    <PageContainer>
      <PageHeader
        title={`Kamusta, ${user?.name || 'User'}!`}
        description={
          isOwner
            ? 'Store Owner Overview · Real-time status at mga live system connection'
            : 'Cashier Terminal Dashboard · Handa na sa pagbenta at mga transaksyon'
        }
        actions={
          <Button asChild className="gap-2 shadow-xs">
            <Link to="/pos">
              <ScanBarcode className="h-4 w-4" />
              Open POS Terminal
            </Link>
          </Button>
        }
      />

      {/* System & Auth Status Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              API Connection
            </CardTitle>
            <Activity className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            {isLoadingPing ? (
              <span className="text-muted-foreground text-xs">
                Connecting...
              </span>
            ) : apiPing?.status === 'ok' ? (
              <div className="text-success flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Connected (Laravel 13)</span>
              </div>
            ) : (
              <div className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>Offline / Error</span>
              </div>
            )}
            <p className="text-muted-foreground mt-1 text-[11px]">
              Backend URL:{' '}
              {import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Current Session
            </CardTitle>
            <ShieldCheck className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-base font-bold capitalize">
                {user?.role_label || user?.role}
              </span>
              <Badge
                variant={isOwner ? 'default' : 'secondary'}
                className="text-[10px] font-bold uppercase"
              >
                {user?.role}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 truncate text-[11px]">
              {user?.email}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Store Profile
            </CardTitle>
            <Store className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm font-semibold">
              Tindahan ni Aling Nena
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Purok 3, Brgy. San Isidro
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Access Scope
            </CardTitle>
            <Lock className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm font-semibold">
              {isOwner ? 'Full Administrative' : 'POS & Customer Suki'}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              {isOwner ? 'All 11 modules enabled' : 'Restricted owner modules'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real Sanctum API & Middleware Verification Panel */}
      <Card className="border-border/80 bg-card/60">
        <CardHeader>
          <CardTitle className="text-lg">
            Real Backend Auth & Middleware Live Check
          </CardTitle>
          <CardDescription>
            I-test ang proteksyon ng Sanctum bearer token at Laravel role
            middleware nang direkta mula sa browser:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Owner Endpoint Check */}
            <div className="border-border bg-background space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Owner Endpoint</h4>
                  <p className="text-muted-foreground text-xs">
                    <code>GET /api/owner/ping</code> (Protektado ng{' '}
                    <code>role:owner</code>)
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={testOwnerEndpoint}>
                  Test Call
                </Button>
              </div>

              {ownerTestResult && (
                <div
                  className={`flex items-center justify-between rounded-lg p-3 font-mono text-xs ${
                    ownerTestResult.status === 200
                      ? 'bg-success/10 text-success border-success/30 border'
                      : 'bg-destructive/10 text-destructive border-destructive/30 border'
                  }`}
                >
                  <span>HTTP {ownerTestResult.status}</span>
                  <span className="max-w-[200px] truncate">
                    {ownerTestResult.message}
                  </span>
                </div>
              )}
            </div>

            {/* Staff Endpoint Check */}
            <div className="border-border bg-background space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Staff Endpoint</h4>
                  <p className="text-muted-foreground text-xs">
                    <code>GET /api/staff/ping</code> (Kasama ang{' '}
                    <code>role:owner,cashier</code>)
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={testStaffEndpoint}>
                  Test Call
                </Button>
              </div>

              {staffTestResult && (
                <div
                  className={`flex items-center justify-between rounded-lg p-3 font-mono text-xs ${
                    staffTestResult.status === 200
                      ? 'bg-success/10 text-success border-success/30 border'
                      : 'bg-destructive/10 text-destructive border-destructive/30 border'
                  }`}
                >
                  <span>HTTP {staffTestResult.status}</span>
                  <span className="max-w-[200px] truncate">
                    {staffTestResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/products"
          className="border-border bg-card hover:border-primary/50 hover:bg-muted/40 flex items-center gap-4 rounded-xl border p-4 transition-all"
        >
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Warehouse className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-semibold">
              Mga Paninda
            </h4>
            <p className="text-muted-foreground text-xs">
              Tingnan ang listahan ng stock at presyo
            </p>
          </div>
        </Link>

        <Link
          to="/customers"
          className="border-border bg-card hover:border-primary/50 hover:bg-muted/40 flex items-center gap-4 rounded-xl border p-4 transition-all"
        >
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-semibold">Mga Suki</h4>
            <p className="text-muted-foreground text-xs">
              Pamahalaan ang mga regular na mamimili
            </p>
          </div>
        </Link>

        <Link
          to="/pos"
          className="border-border bg-card hover:border-primary/50 hover:bg-muted/40 flex items-center gap-4 rounded-xl border p-4 transition-all"
        >
          <div className="bg-highlight/10 text-highlight flex h-12 w-12 items-center justify-center rounded-xl">
            <ScanBarcode className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-semibold">
              Magbenta Ngayon
            </h4>
            <p className="text-muted-foreground text-xs">
              Buksan ang POS cash & utang register
            </p>
          </div>
        </Link>
      </div>
    </PageContainer>
  )
}
