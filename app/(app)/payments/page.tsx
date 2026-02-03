"use client"

import { Suspense, useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export const dynamic = 'force-dynamic'
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ListSorter, type SortOption } from "@/components/ui/list-sorter"
import { Plus, Search, Filter, Download, Upload } from "lucide-react"
import { useQuickCashin } from "@/lib/quick-cashin-context"
import { usePayments } from "@/lib/payments-store"
import { useMembers } from "@/lib/members-store"
import { PaymentsTable } from "@/components/payments/payments-table"
import { PaymentsFilters } from "@/components/payments/payments-filters"
import { ImportPaymentsModal } from "@/components/payments/import-payments-modal"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import type { PaymentType, PaymentStatus, Payment } from "@/types"
import { paymentIdMatchesSearch, memberCodeMatchesSearch } from "@/lib/utils"

const SORT_OPTIONS: SortOption[] = [
  { value: "date", label: "Data plată" },
  { value: "contributionYear", label: "An de cotizație" },
  { value: "amount", label: "Sumă" },
  { value: "memberCode", label: "Cod Membru" },
  { value: "memberName", label: "Nume Membru" },
  { value: "paymentType", label: "Tip plată" },
  { value: "status", label: "Status" },
]

function sortPayments(payments: Payment[], members: any[], sortBy: string, sortDir: "asc" | "desc"): Payment[] {
  const sorted = [...payments].sort((a, b) => {
    let compareResult = 0

    const memberA = members.find((m) => m.id === a.memberId)
    const memberB = members.find((m) => m.id === b.memberId)

    // Primary sort
    switch (sortBy) {
      case "date":
        compareResult = a.date.localeCompare(b.date)
        break
      case "contributionYear":
        compareResult = (a.contributionYear || 0) - (b.contributionYear || 0)
        break
      case "amount":
        compareResult = a.amount - b.amount
        break
      case "memberCode":
        compareResult = (memberA?.memberCode || "").localeCompare(memberB?.memberCode || "")
        break
      case "memberName": {
        const nameA = memberA ? `${memberA.lastName} ${memberA.firstName}` : ""
        const nameB = memberB ? `${memberB.lastName} ${memberB.firstName}` : ""
        compareResult = nameA.localeCompare(nameB, "ro")
        break
      }
      case "paymentType":
        compareResult = a.paymentType.localeCompare(b.paymentType, "ro")
        break
      case "status":
        compareResult = a.status.localeCompare(b.status, "ro")
        break
    }

    if (sortDir === "desc") compareResult *= -1

    if (compareResult === 0 && sortBy !== "date") {
      compareResult = b.date.localeCompare(a.date)
    }
    if (compareResult === 0) {
      compareResult = b.id.localeCompare(a.id)
    }

    return compareResult
  })

  return sorted
}

function PaymentsPageContent() {
  const { getAllPayments } = usePayments()
  const { members } = useMembers()
  const { openModal } = useQuickCashin()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const [filters, setFilters] = useState<{
    dateFrom: string
    dateTo: string
    types: PaymentType[]
    statuses: PaymentStatus[]
    methods: string[]
    yearFrom: number | null
    yearTo: number | null
  }>({
    dateFrom: "",
    dateTo: "",
    types: [],
    statuses: [],
    methods: [],
    yearFrom: null,
    yearTo: null,
  })

  const urlSort = searchParams.get("sort")
  const urlDir = searchParams.get("dir") as "asc" | "desc" | null

  const [sortBy, setSortBy] = useState<string>(urlSort || "date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">(urlDir || "desc")

  const handleSortChange = (newSort: string, newDir: "asc" | "desc") => {
    setSortBy(newSort)
    setSortDir(newDir)

    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", newSort)
    params.set("dir", newDir)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const allPayments = getAllPayments()

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    let result = [...allPayments]

    // Apply search (using debounced value)
    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase().trim()
      result = result.filter((payment) => {
        // Search by payment ID (supports P000123, P-123, etc.)
        if (paymentIdMatchesSearch(payment.id, search)) return true

        const member = members.find((m) => m.id === payment.memberId)
        
        // Search by member code (supports 01008, MEM-1008, etc.)
        if (member && memberCodeMatchesSearch(member.memberCode, search)) return true
        
        // Search by member name
        if (member) {
          const memberName = `${member.firstName} ${member.lastName}`.toLowerCase()
          if (memberName.includes(search)) return true
        }

        // Search by observations
        const observations = payment.observations?.toLowerCase() || ""
        if (observations.includes(search)) return true

        return false
      })
    }

    // Apply filters
    if (filters.dateFrom) {
      result = result.filter((p) => p.date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      result = result.filter((p) => p.date <= filters.dateTo)
    }
    if (filters.types.length > 0) {
      result = result.filter((p) => filters.types.includes(p.paymentType))
    }
    if (filters.statuses.length > 0) {
      result = result.filter((p) => filters.statuses.includes(p.status))
    }
    if (filters.methods.length > 0) {
      result = result.filter((p) => filters.methods.includes(p.method))
    }
    if (filters.yearFrom) {
      result = result.filter((p) => !p.contributionYear || p.contributionYear >= filters.yearFrom!)
    }
    if (filters.yearTo) {
      result = result.filter((p) => !p.contributionYear || p.contributionYear <= filters.yearTo!)
    }

    return result
  }, [allPayments, debouncedSearch, filters, members])

  const sortedPayments = useMemo(() => {
    return sortPayments(filteredPayments, members, sortBy, sortDir)
  }, [filteredPayments, members, sortBy, sortDir])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.types.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.methods.length > 0) count++
    if (filters.yearFrom || filters.yearTo) count++
    return count
  }, [filters])

  const handleExport = () => {
    if (sortedPayments.length === 0) return

    try {
      // Build CSV header
      const headers = [
        "Cod Plata",
        "Cod Membru",
        "Nume Membru",
        "Data Plata",
        "An Cotizatie",
        "Tip Plata",
        "Suma RON",
        "Metoda Plata",
        "Status",
        "Observatii",
      ]

      // Build CSV rows
      const rows = sortedPayments.map((payment) => {
        const member = members.find((m) => m.id === payment.memberId)
        const memberName = member ? `${member.lastName} ${member.firstName}` : ""
        const memberCode = member?.memberCode || ""

        // Format date as dd.mm.yyyy
        const dateParts = payment.date.split("-")
        const formattedDate =
          dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : payment.date

        return [
          payment.id || "",
          memberCode,
          memberName,
          formattedDate,
          payment.contributionYear?.toString() || "",
          payment.paymentType || "",
          payment.amount.toString(),
          payment.method || "",
          payment.status || "",
          (payment.observations || "").replace(/[\r\n]+/g, " "), // Remove newlines
        ]
      })

      // Build CSV content with semicolon separator (Excel RO locale)
      const csvContent = [headers.join(";"), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))].join("\r\n")

      // Add UTF-8 BOM for Excel compatibility
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })

      // Create download link
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      link.setAttribute("href", url)
      link.setAttribute("download", `export_plati_${dateStr}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  return (
    <PageContainer
      title="Cotizații"
      description="Gestionarea tuturor plăților și cotizațiilor"
      actions={
        <>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={sortedPayments.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={openModal}>
            <Plus className="h-4 w-4 mr-2" />
            Încasează
          </Button>
        </>
      }
    >
      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după membru, cod membru, observații..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              Filtrează
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <PaymentsFilters filters={filters} onFiltersChange={setFilters} onClose={() => setFiltersOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {sortedPayments.length > 0 && (
        <div className="flex justify-end mb-4">
          <ListSorter options={SORT_OPTIONS} value={sortBy} direction={sortDir} onChange={handleSortChange} />
        </div>
      )}

      {/* Payments Table */}
      <PaymentsTable payments={sortedPayments} />

      {/* Import Modal */}
      <ImportPaymentsModal 
        open={importModalOpen} 
        onOpenChange={setImportModalOpen}
        onImportComplete={() => {
          // Payments auto-refresh via members context, no extra action needed
          // Force a small delay to let state propagate
          setTimeout(() => {
            setSearchQuery("")
          }, 100)
        }}
      />
    </PageContainer>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  )
}
