import { Link } from 'react-router'
import { ArrowRight, BookOpen, Clock, PackageCheck, Shield, Sparkles, Store } from 'lucide-react'
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
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5 text-highlight" />
            <span>School Project · Integrative Programming</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Benta, stock, at utang — <br />
            <span className="text-primary">sa isang app.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            Ang TindaTrack ay isang magaan at modernong Point of Sale at Inventory System
            na idinisenyo partikular para sa mga sari-sari store sa Pilipinas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Button size="lg" asChild className="gap-2 text-base px-6 h-12 shadow-md">
                <Link to={homePath}>
                  Pumunta sa App
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="gap-2 text-base px-6 h-12 shadow-md">
                  <Link to="/register">
                    Mag-register bilang Owner
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-6 h-12">
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Mga Pangunahing Tampok
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Binuo para sa mabilisang operasyon at malinaw na talaan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Mabilis na POS</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Search o barcode scan, category chips, automated change (sukli) calculator, at resibo sa bawat benta.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-utang/10 text-utang">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Aklat ng Utang</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Subaybayan ang utang ng bawat suki na may credit limits, aging timeline, at polite Taglish SMS payment reminders.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Matalinong Imbentaryo</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatic stock deduction sa bawat benta, alerts kapag nauubos na ang paninda, at printable restock checklist.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
