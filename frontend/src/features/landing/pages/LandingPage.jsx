import { Link } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  Clock,
  PackageCheck,
  Shield,
  Sparkles,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function LandingPage() {
  useDocumentTitle('Sari-Sari Store POS & Inventory')
  const { user } = useAuth()
  const homePath = user?.role === 'cashier' ? '/pos' : '/dashboard'

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="border-border/60 from-primary/5 via-background to-background relative overflow-hidden border-b bg-gradient-to-b py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="text-highlight h-3.5 w-3.5" />
            <span>School Project · Integrative Programming</span>
          </div>

          <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Benta, stock, at utang — <br />
            <span className="text-primary">sa isang app.</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            Ang TindaTrack ay isang magaan at modernong Point of Sale at
            Inventory System na idinisenyo partikular para sa mga sari-sari
            store sa Pilipinas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Button
                size="lg"
                asChild
                className="h-12 gap-2 px-6 text-base shadow-md"
              >
                <Link to={homePath}>
                  Pumunta sa App
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  asChild
                  className="h-12 gap-2 px-6 text-base shadow-md"
                >
                  <Link to="/register">
                    Mag-register bilang Owner
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 px-6 text-base"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="bg-muted/20 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Mga Pangunahing Tampok
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Binuo para sa mabilisang operasyon at malinaw na talaan
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="border-border/80 shadow-xs transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 pt-6">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-foreground text-lg font-semibold">
                  Mabilis na POS
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Search o barcode scan, category chips, automated change
                  (sukli) calculator, at resibo sa bawat benta.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 pt-6">
                <div className="bg-utang/10 text-utang flex h-10 w-10 items-center justify-center rounded-full">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-foreground text-lg font-semibold">
                  Aklat ng Utang
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Subaybayan ang utang ng bawat suki na may credit limits, aging
                  timeline, at polite Taglish SMS payment reminders.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 pt-6">
                <div className="bg-success/10 text-success flex h-10 w-10 items-center justify-center rounded-lg">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h3 className="text-foreground text-lg font-semibold">
                  Matalinong Imbentaryo
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Automatic stock deduction sa bawat benta, alerts kapag nauubos
                  na ang paninda, at printable restock checklist.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
