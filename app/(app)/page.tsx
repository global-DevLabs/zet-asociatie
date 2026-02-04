"use client"

import { useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserMinus, Wallet, TrendingUp, ArrowUpRight, PieChart, Building2, UserPlus, Receipt, FileEdit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMembers } from "@/lib/members-store"
import { usePayments } from "@/lib/payments-store"

export default function DashboardPage() {
  const { members } = useMembers()
  const { getAllPayments } = usePayments()
  const allPayments = getAllPayments()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())

  // Calculate stats from members data
  const totalMembers = members.length
  const activeMembers = members.filter((m) => !m.branchWithdrawalYear).length
  const withdrawnMembers = totalMembers - activeMembers

  const yearlyPaymentMetrics = useMemo(() => {
    const year = Number.parseInt(selectedYear)
    let totalCollected = 0
    const uniqueMembersWhoPaid = new Set<string>()

    // Filter payments for the selected year with status "Plătită"
    const yearPayments = allPayments.filter((p) => {
      // Use contributionYear if available, otherwise extract year from payment date
      const paymentYear = p.contributionYear || new Date(p.date).getFullYear()
      // Only count "Plătită" status payments
      return paymentYear === year && p.status === "Plătită"
    })

    yearPayments.forEach((payment) => {
      totalCollected += payment.amount
      uniqueMembersWhoPaid.add(payment.memberId)
    })

    return {
      totalCollected,
      memberCount: uniqueMembersWhoPaid.size,
    }
  }, [allPayments, selectedYear])

  // Calculate collection rate based on current year payments
  const currentYearPayingMembers = useMemo(() => {
    const uniqueMembers = new Set<string>()
    allPayments.forEach((p) => {
      const paymentYear = p.contributionYear || new Date(p.date).getFullYear()
      if (paymentYear === currentYear && p.status === "Plătită") {
        uniqueMembers.add(p.memberId)
      }
    })
    return uniqueMembers.size
  }, [allPayments, currentYear])

  const collectionRate = activeMembers > 0 ? Math.round((currentYearPayingMembers / activeMembers) * 100) : 0
  const getCollectionStatus = (rate: number) => {
    if (rate >= 80) return { label: "Excelent", variant: "default" as const, color: "emerald" }
    if (rate >= 60) return { label: "Bine", variant: "secondary" as const, color: "blue" }
    return { label: "Necesită atenție", variant: "destructive" as const, color: "amber" }
  }
  const collectionStatus = getCollectionStatus(collectionRate)

  const totalCollections = allPayments
    .filter((p) => {
      const paymentYear = p.contributionYear || new Date(p.date).getFullYear()
      return paymentYear === currentYear && p.status === "Plătită"
    })
    .reduce((sum, p) => sum + p.amount, 0)

  const unitCounts = members.reduce(
    (acc, member) => {
      if (!member.branchWithdrawalYear) {
        acc[member.unit] = (acc[member.unit] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )
  const topUnits = Object.entries(unitCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentPayments = allPayments
    .filter((p) => new Date(p.date) >= thirtyDaysAgo && p.status === "Plătită")
    .reduce((sum, p) => sum + p.amount, 0)

  // Generate list of years for the selector
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  return (
    <PageContainer title="Dashboard" description="Privire de ansamblu asupra asociației">
      {/* Top KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Primary KPI - Collection Rate with enhanced prominence */}
        <Card className="relative border-0 shadow-[0_4px_12px_rgba(147,51,234,0.15)] hover:shadow-[0_8px_24px_rgba(147,51,234,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] overflow-hidden group bg-gradient-to-br from-purple-50 via-purple-100 to-fuchsia-50">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-transparent to-fuchsia-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700">Rată de Colectare</p>
                  <Badge variant={collectionStatus.variant} className="text-[10px] px-1.5 py-0 h-5 shadow-sm font-semibold">
                    {collectionStatus.label}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                    {collectionRate}
                  </p>
                  <span className="text-lg font-semibold text-slate-700">%</span>
                </div>
                {collectionRate > 0 ? (
                  <p className="text-xs text-slate-600">{currentYearPayingMembers} din {activeMembers} membri activi au cotizat</p>
                ) : (
                  <p className="text-xs text-slate-600">Nicio cotizație înregistrată în {currentYear}</p>
                )}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 p-3.5 shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-purple-200">
              Procentul membrilor cu cotizația la zi
            </p>
          </CardContent>
        </Card>

        {/* Secondary KPIs with refined hierarchy */}
        <Card className="relative border-0 shadow-[0_4px_12px_rgba(59,130,246,0.15)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] overflow-hidden group bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Membri Activi</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 drop-shadow-sm">{activeMembers}</p>
                  <span className="text-xs font-medium text-slate-600">din {totalMembers}</span>
                </div>
                {activeMembers > 0 ? (
                  <p className="text-xs text-slate-600">{withdrawnMembers > 0 ? `${withdrawnMembers} membri retrași` : 'Toți membrii activi'}</p>
                ) : (
                  <p className="text-xs text-slate-600">Adaugă primul membru</p>
                )}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative border-0 shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] overflow-hidden group bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-50">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 via-transparent to-teal-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Cotizații {currentYear}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                    {totalCollections > 0 ? totalCollections.toLocaleString() : "0"}
                  </p>
                  <span className="text-xs font-medium text-slate-600">RON</span>
                </div>
                {totalCollections > 0 ? (
                  <p className="text-xs text-slate-600">Total cotizații încasate în {currentYear}</p>
                ) : (
                  <p className="text-xs text-slate-600">Nicio plată înregistrată în {currentYear}</p>
                )}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 shadow-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative border-0 shadow-[0_4px_12px_rgba(245,158,11,0.15)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] overflow-hidden group bg-gradient-to-br from-amber-50 via-amber-100 to-orange-50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 via-transparent to-orange-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Membri Retrași</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 drop-shadow-sm">{withdrawnMembers}</p>
                </div>
                {withdrawnMembers > 0 ? (
                  <p className="text-xs text-slate-600">Membri care s-au retras din filială</p>
                ) : (
                  <p className="text-xs text-slate-600">Toți membrii sunt activi</p>
                )}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 shadow-lg">
                <UserMinus className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Contributions Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Statistici anuale</h3>
            <p className="text-xs text-slate-600 mt-0.5">Doar plățile cu status &quot;Plătită&quot;</p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Selectează anul" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Total Collected Card */}
          <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            <CardHeader className="pb-3 border-b border-emerald-100/50">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-md">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Cotizații {selectedYear}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {yearlyPaymentMetrics.totalCollected > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Total încasat
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                      {yearlyPaymentMetrics.totalCollected.toLocaleString()}
                    </p>
                    <span className="text-lg font-semibold text-slate-600">RON</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-2">
                    Din toate plățile efectuate în {selectedYear}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <div className="rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 p-3 mb-3 shadow-sm">
                    <Wallet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Nicio cotizație în {selectedYear}
                  </p>
                  <p className="text-xs text-slate-500">
                    Plățile înregistrate vor apărea aici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members Who Paid Card */}
          <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
            <CardHeader className="pb-3 border-b border-indigo-100/50">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 p-2 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Membri care au cotizat
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {yearlyPaymentMetrics.memberCount > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Membri unici
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold tracking-tight text-slate-900 drop-shadow-sm">
                      {yearlyPaymentMetrics.memberCount}
                    </p>
                    <span className="text-lg font-semibold text-slate-600">
                      membri
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 pt-2">
                    Din {activeMembers} membri activi în {selectedYear}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
                  <div className="rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 p-3 mb-3 shadow-sm">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Niciun membru nu a cotizat în {selectedYear}
                  </p>
                  <p className="text-xs text-slate-500">
                    Plățile vor fi contorizate aici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Row - subtle section separation */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        {/* Structura Membri */}
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100/50">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-2 shadow-md">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Structura Membri</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">Distribuția statusului membrilor</p>
          </CardHeader>
          <CardContent className="pb-4 pt-4">
            {totalMembers > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Activi</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{((activeMembers / totalMembers) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 rounded-full transition-all duration-500 shadow-md"
                      style={{ width: `${(activeMembers / totalMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/70 font-medium">{activeMembers} membri activi</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Retrași</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{((withdrawnMembers / totalMembers) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-full transition-all duration-500 shadow-md"
                      style={{ width: `${(withdrawnMembers / totalMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/70 font-medium">{withdrawnMembers} membri retrași</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <p className="text-sm text-muted-foreground">Niciun membru înregistrat</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Începe prin a adăuga membri</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Unități */}
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white">
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100/50">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-2 shadow-md">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Top Unități (UM)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">Cele mai numeroase unități militare</p>
          </CardHeader>
          <CardContent className="pb-4 pt-4">
            {topUnits.length > 0 ? (
              <div className="space-y-2">
                {topUnits.map(([unit, count], index) => (
                  <div key={unit} className="flex items-center justify-between group hover:bg-gradient-to-r hover:from-indigo-50 hover:to-violet-50 -mx-2 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-indigo-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold shadow-md group-hover:scale-110 transition-transform">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{unit}</span>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50">
                <p className="text-sm text-muted-foreground">Nicio unitate înregistrată</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Datele vor apărea după adăugarea membrilor</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plăți în ultimele 30 zile */}
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white">
          <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/50">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-md">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Plăți recente (30 zile)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">Activitate recentă de colectare</p>
          </CardHeader>
          <CardContent className="pb-4 pt-4">
            {recentPayments > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{recentPayments.toLocaleString()}</span>
                  <span className="text-sm font-semibold text-muted-foreground">RON</span>
                </div>
                <p className="text-xs text-slate-600">Încasări din ultimele 30 de zile</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                <p className="text-sm text-muted-foreground">Nicio plată în ultimele 30 zile</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Plățile recente vor apărea aici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-4 mt-6">
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">Activitate Recentă</CardTitle>
                <p className="text-xs text-muted-foreground/70 mt-1">Ultimele acțiuni în sistem</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {[
                {
                  action: "Membru nou înregistrat",
                  detail: "Popescu Ion a fost adăugat în sistem",
                  time: "Acum 2h",
                  type: "member",
                  icon: UserPlus,
                },
                {
                  action: "Cotizație primită",
                  detail: "Ionescu Maria - 500 RON pentru 2024",
                  time: "Acum 4h",
                  type: "payment",
                  icon: Receipt,
                },
                {
                  action: "Profil actualizat",
                  detail: "Vasilescu George și-a actualizat datele",
                  time: "Ieri",
                  type: "update",
                  icon: FileEdit,
                },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-200 group border shadow-sm ${
                      item.type === "member"
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/50 hover:border-emerald-300 hover:shadow-md"
                        : item.type === "payment"
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50 hover:border-blue-300 hover:shadow-md"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200/50 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        item.type === "member"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500 group-hover:from-emerald-600 group-hover:to-teal-600"
                          : item.type === "payment"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-500 group-hover:from-blue-600 group-hover:to-indigo-600"
                            : "bg-gradient-to-br from-slate-500 to-gray-500 group-hover:from-slate-600 group-hover:to-gray-600"
                      } transition-all duration-200 group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-tight">{item.action}</p>
                        <span className={`text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-full ${
                          item.type === "member"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.type === "payment"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                        }`}>
                          {item.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium">{item.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {members.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="rounded-full bg-gradient-to-br from-slate-100 to-blue-100 p-4 mb-3 shadow-md">
                  <FileEdit className="h-7 w-7 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Nicio activitate recentă
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-sm">
                  Acțiunile precum adăugarea de membri, înregistrarea plăților și actualizări vor apărea aici
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
