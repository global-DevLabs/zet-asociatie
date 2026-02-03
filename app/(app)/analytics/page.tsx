"use client"

import { Suspense, useState, useMemo, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Download, BarChart3, LineChart, PieChart, TableIcon } from "lucide-react"
import { useMembers } from "@/lib/members-store"
import { usePayments } from "@/lib/payments-store"
import { useActivities } from "@/lib/activities-store"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  AnalyticsEngine,
  type MetricType,
  type GroupByOption,
  type ChartType,
  type AnalyticsFilters,
} from "@/lib/analytics-engine"
import { AnalyticsChart } from "@/components/analytics/analytics-chart"
import { AnalyticsTable } from "@/components/analytics/analytics-table"
import { AddFilterDialog } from "@/components/analytics/add-filter-dialog"
import { FilterChips } from "@/components/analytics/filter-chips"
import { useToast } from "@/hooks/use-toast"

function AnalyticsPageContent() {
  const { user, hasPermission } = useAuth()
  const router = useRouter()
  const { members } = useMembers()
  const { getAllPayments } = usePayments()
  const { activities, activityTypes, getParticipants } = useActivities()
  const { groups } = useWhatsAppGroups()
  const { memberGroups } = useMemberGroups()
  const { toast } = useToast()

  const [selectedMetric, setSelectedMetric] = useState<MetricType>("member_count")
  const [groupBy, setGroupBy] = useState<GroupByOption>("year")
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [showTable, setShowTable] = useState(false)

  // Suppress ResizeObserver errors globally
  useEffect(() => {
    const resizeObserverErrorHandler = (e: ErrorEvent) => {
      if (
        e.message === "ResizeObserver loop completed with undelivered notifications." ||
        e.message.includes("ResizeObserver loop limit exceeded")
      ) {
        e.stopImmediatePropagation()
        e.preventDefault()
        return false
      }
    }

    const unhandledRejectionHandler = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes("ResizeObserver") || e.reason?.toString().includes("ResizeObserver")) {
        e.preventDefault()
        return false
      }
    }

    window.addEventListener("error", resizeObserverErrorHandler, true)
    window.addEventListener("unhandledrejection", unhandledRejectionHandler, true)

    return () => {
      window.removeEventListener("error", resizeObserverErrorHandler, true)
      window.removeEventListener("unhandledrejection", unhandledRejectionHandler, true)
    }
  }, [])

  // Get all payments and activity participants
  const allPayments = useMemo(() => getAllPayments(), [getAllPayments])
  const allParticipants = useMemo(() => {
    return activities.flatMap((a) => getParticipants(a.id))
  }, [activities, getParticipants])

  // Generate analytics result
  const analyticsResult = useMemo(() => {
    return AnalyticsEngine.generateAnalytics(members, allPayments, activities, activityTypes, groups, allParticipants, {
      filters,
      groupBy: [groupBy],
      metrics: [selectedMetric],
      chartType,
    })
  }, [
    members,
    allPayments,
    activities,
    activityTypes,
    groups,
    allParticipants,
    filters,
    groupBy,
    selectedMetric,
    chartType,
  ])

  useEffect(() => {
    if (!hasPermission("view")) {
      router.push("/")
    }
  }, [hasPermission, router])

  if (!hasPermission("view")) {
    return null
  }

  const handleExportCSV = () => {
    const csv = AnalyticsEngine.exportToCSV(analyticsResult)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${AnalyticsEngine.generateFilename(analyticsResult.config)}.csv`
    link.click()

    toast({
      title: "Export reușit",
      description: "Datele au fost exportate în format CSV",
    })
  }

  const handleResetFilters = () => {
    setFilters({})
    toast({
      title: "Filtre resetate",
      description: "Toate filtrele au fost eliminate",
    })
  }

  const handleRemoveFilter = (filterKey: string) => {
    const newFilters = { ...filters }
    delete newFilters[filterKey as keyof AnalyticsFilters]
    setFilters(newFilters)
  }

  const metricOptions: { value: MetricType; label: string }[] = [
    { value: "member_count", label: "Număr Membri" },
    { value: "activity_count", label: "Număr Activități" },
    { value: "payment_count", label: "Număr Plăți" },
    { value: "total_amount", label: "Total Plăți (RON)" },
    { value: "average_per_member", label: "Medie/Membru (RON)" },
    { value: "participation_rate", label: "Rată Participare (%)" },
  ]

  const groupByOptions: { value: GroupByOption; label: string }[] = [
    { value: "year", label: "An" },
    { value: "month", label: "Lună" },
    { value: "unit", label: "Unitate Militară" },
    { value: "rank", label: "Grad" },
    { value: "profile", label: "Profil Principal" },
    { value: "member_status", label: "Status Membru" },
    { value: "activity_type", label: "Tip Activitate" },
    { value: "whatsapp_group", label: "Grup WhatsApp" },
    { value: "payment_type", label: "Tip Plată" },
  ]

  const chartTypeOptions: { value: ChartType; label: string; icon: any }[] = [
    { value: "bar", label: "Bare", icon: BarChart3 },
    { value: "line", label: "Linie", icon: LineChart },
    { value: "pie", label: "Pie", icon: PieChart },
    { value: "table", label: "Tabel", icon: TableIcon },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <PageContainer title="Analiză și Grafice" description="Rapoarte vizuale cu filtre personalizabile">
        {/* Toolbar */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Metric Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Metrică</label>
                <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Filter Button */}
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block invisible">Action</label>
                <Button variant="outline" size="sm" onClick={() => setShowFilterDialog(true)} className="h-9 w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă Filtru
                </Button>
              </div>

              {/* Group By Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Grupează după</label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupByOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type Selector */}
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block">Tip grafic</label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Export Dropdown */}
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground mb-1 block invisible">Export</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
                    <DropdownMenuItem disabled>Export XLSX (În curând)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filter Chips */}
            {Object.keys(filters).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <FilterChips filters={filters} onRemove={handleRemoveFilter} onReset={handleResetFilters} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="border-0 shadow-sm mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {metricOptions.find((m) => m.value === selectedMetric)?.label} -{" "}
                {groupByOptions.find((g) => g.value === groupBy)?.label}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {analyticsResult.metadata.totalMembers} membri • {analyticsResult.metadata.filtersApplied} filtre
                aplicate
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsResult.data.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Nu există date pentru filtrele selectate</p>
                <p className="text-xs mt-2">Încearcă să elimini unele filtre</p>
              </div>
            ) : chartType === "table" ? (
              <AnalyticsTable data={analyticsResult.data} metric={selectedMetric} />
            ) : (
              <AnalyticsChart data={analyticsResult.data} chartType={chartType} metric={selectedMetric} />
            )}
          </CardContent>
        </Card>

        {/* Toggle Table Button - Only show when chart type is not table */}
        {chartType !== "table" && (
          <>
            <div className="mb-2">
              <Button variant="ghost" size="sm" onClick={() => setShowTable(!showTable)}>
                <TableIcon className="h-4 w-4 mr-2" />
                {showTable ? "Ascunde Tabel" : "Arată Tabel"}
              </Button>
            </div>

            {/* Data Table */}
            {showTable && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Date Detaliate</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsTable data={analyticsResult.data} metric={selectedMetric} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </PageContainer>

      {/* Add Filter Dialog */}
      <AddFilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        currentFilters={filters}
        onApplyFilters={setFilters}
      />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsPageContent />
    </Suspense>
  )
}
