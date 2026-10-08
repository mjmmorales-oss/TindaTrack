import { Link, Navigate } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  Clock,
  PackageCheck,
  Shield,
  Sparkles,
  Store,
  ScanBarcode,
  Search,
  ShoppingCart,
  HeartHandshake,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function LandingPage() {
  useDocumentTitle('TindaTrack — Benta, stock, at utang sa isang app')
  const { user } = useAuth()

  // Logged-in users visiting / redirect to their home
  if (user) {
    const homePath = user.role === 'cashier' ? '/pos' : '/dashboard'
    return <Navigate to={homePath} replace />
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
              TT
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              TindaTrack
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-xs">
              <Link to="/register">Magsimula (Register)</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5 text-highlight" />
            <span>School Project · Integrative Programming (React + Laravel)</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
            Benta, stock, at utang — <br />
            <span className="text-primary">sa isang app.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Ang modernong POS at Inventory Tracker na partikular na idinisenyo para sa
            mga sari-sari store sa Pilipinas. Mabilis magbenta, malinaw ang lista ng utang,
            at hindi nauubusan ng stock.
          </p>

          {/* CTA Buttons: Full width on phones, side by side from sm */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto sm:max-w-none">
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto h-12 px-7 text-base shadow-md gap-2"
            >
              <Link to="/register">
                Magsimula Ngayon (Get Started)
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto h-12 px-7 text-base border-border"
            >
              <Link to="/login">Mag-log In (Log In)</Link>
            </Button>
          </div>

          {/* POS Interactive Preview Card */}
          <div className="mt-12 sm:mt-16 mx-auto max-w-3xl w-full">
            <div className="rounded-2xl border-2 border-border/80 bg-card p-3 sm:p-5 shadow-xl text-left relative overflow-hidden ring-1 ring-primary/20">
              {/* Fake POS App Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-3 w-3 rounded-full bg-destructive/80" />
                  <div className="flex h-3 w-3 rounded-full bg-highlight/80" />
                  <div className="flex h-3 w-3 rounded-full bg-success/80" />
                  <span className="font-bold text-foreground ml-2 font-mono">
                    Tindahan ni Aling Nena · POS Terminal
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-success border-success/30 font-semibold">
                  Online
                </Badge>
              </div>

              {/* Fake Search & Chips */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>Hanapin ang produkto o i-scan ang barcode...</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto text-[11px] pb-1">
                  <span className="rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 font-medium shrink-0">
                    Lahat
                  </span>
                  <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 shrink-0">
                    Mga Inumin
                  </span>
                  <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 shrink-0">
                    Papak & Snacks
                  </span>
                  <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 shrink-0">
                    Canned Goods
                  </span>
                </div>
              </div>

              {/* Fake Product Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                <div className="rounded-lg border border-border p-2.5 bg-background shadow-2xs space-y-1">
                  <span className="font-semibold text-xs text-foreground block truncate">
                    Lucky Me Pancit Canton
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary font-mono">₱18.00</span>
                    <span className="text-[10px] text-muted-foreground font-mono">34 pcs</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-2.5 bg-background shadow-2xs space-y-1">
                  <span className="font-semibold text-xs text-foreground block truncate">
                    Coke Mismo 290ml
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary font-mono">₱25.00</span>
                    <span className="text-[10px] text-warning font-semibold">⚠ 3 left</span>
                  </div>
                </div>

                <div className="hidden sm:block rounded-lg border border-border p-2.5 bg-background shadow-2xs space-y-1">
                  <span className="font-semibold text-xs text-foreground block truncate">
                    Bear Brand Powder 33g
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary font-mono">₱16.00</span>
                    <span className="text-[10px] text-muted-foreground font-mono">52 pcs</span>
                  </div>
                </div>
              </div>

              {/* Fake Sticky Bottom Cart Bar */}
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">3 items sa Cart</span>
                  <span className="font-mono font-extrabold text-primary text-sm">₱61.00</span>
                </div>
                <div className="rounded-md bg-primary text-primary-foreground px-3 py-1 font-semibold text-xs flex items-center gap-1">
                  <span>Magbayad (Pay)</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Feature Cards */}
      <section className="py-16 sm:py-20 bg-muted/20 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Mga Tampok na Dinisenyo para sa Tindahan
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Simpleng gamitin sa cellphone o tablet, walang komplikasyon.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="space-y-3 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Mabilis na POS Terminal</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Pindot lang para sa bawat order, automated computation ng sukli,
                  at agarang thermal receipt printing para sa walk-in at suki.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="space-y-3 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-utang/15 text-utang">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Digital Utang Ledger</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Iwasan ang nawawalang notebook. May running balance timeline,
                  credit limits bawat suki, at 1-click polite Taglish SMS payment reminders.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
              <CardContent className="space-y-3 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Matalinong Imbentaryo</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Awtomatikong nababawas ang stock sa bawat benta, live warning kapag paubos na,
                  at mabilisang printable restock list kapag mamamalengke.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SDG 1 & SDG 8 Alignment Strip */}
      <section className="py-12 bg-background border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg">
                  SDG
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    United Nations Sustainable Development Goals
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    TindaTrack aligns with community socioeconomic empowerment
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-primary">
                      SDG 1
                    </Badge>
                    <span className="font-semibold text-xs text-foreground">No Poverty</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Protektahan ang kabuhayan ng maliliit na sari-sari store owners laban sa pagkalugi dulot ng hindi nasisingil na pautang.
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-primary">
                      SDG 8
                    </Badge>
                    <span className="font-semibold text-xs text-foreground">Decent Work & Growth</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pagpapasigla sa lokal na micro-commerce sa pamamagitan ng modernong digital financial literacy at inventory efficiency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Team Credits */}
      <footer className="mt-auto py-8 bg-card border-t border-border/80 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">TindaTrack</span>
            <span>· Integrative Programming Project</span>
          </div>

          <div className="text-center sm:text-right">
            <p>Binuo para sa Sari-Sari Store Micro-Retailers sa Pilipinas.</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              React 19 + Laravel 13 API · Open Source Educational Prototype
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
