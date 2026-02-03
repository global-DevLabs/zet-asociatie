"use client"

import { useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserMinus, Wallet, TrendingUp, ArrowUpRight, PieChart, Building2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMembers } from "@/lib/members-store"

export default function DashboardPage() {
  const { members } = useMembers()
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

    members.forEach((member) => {
      const yearPayments =
        member.payments?.filter((p) => {
          // Use contributionYear if available, otherwise extract year from payment date
          const paymentYear = p.contributionYear || new Date(p.date).getFullYear()
          // Only count "Plătită" status payments
          return paymentYear === year && p.status === "Plătită"
        }) || []

      yearPayments.forEach((payment) => {
        totalCollected += payment.amount
        uniqueMembersWhoPaid.add(member.id)
      })
    })

    return {
      totalCollected,
      memberCount: uniqueMembersWhoPaid.size,
    }
  }, [members, selectedYear])

  const totalCollections = members.reduce((acc, member) => {
    const thisYearPayments = member.payments?.filter((p) => p.year === currentYear) || []
    return acc + thisYearPayments.reduce((sum, p) => sum + p.amount, 0)
  }, 0)

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
  const recentPayments = members.reduce((acc, member) => {
    const recent = member.payments?.filter((p) => new Date(p.date) >= thirtyDaysAgo) || []
    return acc + recent.reduce((sum, p) => sum + p.amount, 0)
  }, 0)

  // Generate list of years for the selector
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  return (
    <PageContainer title="Dashboard" description="Privire de ansamblu asupra asociației">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Membri Activi</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{activeMembers}</p>
                  <span className="text-xs text-muted-foreground">/ {totalMembers}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="font-medium">+12%</span>
                  <span className="text-muted-foreground">față de luna trecută</span>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Membri Retrași</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{withdrawnMembers}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="font-medium">+2</span>
                  <span className="text-muted-foreground">luna aceasta</span>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-2.5">
                <UserMinus className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cotizații {currentYear}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{totalCollections.toLocaleString()}</p>
                  <span className="text-xs text-muted-foreground">RON</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="font-medium">+15%</span>
                  <span className="text-muted-foreground">față de luna trecută</span>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Rată de Colectare</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">85</p>
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="font-medium">+3%</span>
                  <span className="text-muted-foreground">membri cu cotizația la zi</span>
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Cotizații pe an</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total încasat ({selectedYear})</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">
                    {yearlyPaymentMetrics.totalCollected.toLocaleString()}
                  </p>
                  <span className="text-sm text-muted-foreground">RON</span>
                </div>
                <p className="text-xs text-muted-foreground">doar plățile cu status &quot;Plătită&quot;</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Membri care au cotizat</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{yearlyPaymentMetrics.memberCount}</p>
                  <span className="text-sm text-muted-foreground">membri</span>
                </div>
                <p className="text-xs text-muted-foreground">unici în anul selectat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-6">
        {/* Structura Membri */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-slate-50 p-1.5">
                <PieChart className="h-4 w-4 text-slate-600" />
              </div>
              <CardTitle className="text-sm font-semibold">Structura Membri</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Activi</span>
                <span className="font-semibold">{((activeMembers / totalMembers) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(activeMembers / totalMembers) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-muted-foreground">Retrași</span>
                <span className="font-semibold">{((withdrawnMembers / totalMembers) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(withdrawnMembers / totalMembers) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Unități */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-indigo-50 p-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-semibold">Top Unități (UM)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              {topUnits.map(([unit, count], index) => (
                <div key={unit} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground">{unit}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plăți în ultimele 30 zile */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-50 p-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold">Plăți în ultimele 30 zile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{recentPayments.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">RON</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                <span className="font-medium">+18%</span>
                <span className="text-muted-foreground">față de perioada anterioară</span>
              </div>
              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-12 pt-2">
                {[40, 55, 35, 65, 45, 75, 60].map((height, i) => (
                  <div key={i} className="flex-1 bg-emerald-200 rounded-t" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Activitate Recentă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  action: "Membru nou înregistrat",
                  detail: "Popescu Ion a fost adăugat în sistem",
                  time: "Acum 2h",
                  type: "success",
                },
                {
                  action: "Cotizație primită",
                  detail: "Ionescu Maria - 500 RON pentru 2024",
                  time: "Acum 4h",
                  type: "payment",
                },
                {
                  action: "Profil actualizat",
                  detail: "Vasilescu George și-a actualizat datele",
                  time: "Ieri",
                  type: "update",
                },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-3 p-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === "success" ? "bg-emerald-50" : item.type === "payment" ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.type === "success"
                          ? "bg-emerald-500"
                          : item.type === "payment"
                            ? "bg-blue-500"
                            : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-tight">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                    <p className="text-xs text-muted-foreground/70 pt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
