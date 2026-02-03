"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { AnalyticsFilters } from "@/lib/analytics-engine"

interface FilterChipsProps {
  filters: AnalyticsFilters
  onRemove: (filterKey: string) => void
  onReset: () => void
}

export function FilterChips({ filters, onRemove, onReset }: FilterChipsProps) {
  const filterLabels: Record<keyof AnalyticsFilters, string> = {
    dateFrom: "Dată de la",
    dateTo: "Dată până la",
    ranks: "Graduri",
    units: "Unități",
    profiles: "Profiluri",
    carMemberStatus: "Status CAR",
    foundationMemberStatus: "Status Fundație",
    hasCurrentWorkplace: "Are loc de muncă",
    whatsappGroupIds: "Grupuri WhatsApp",
    needs: "Nevoi",
    memberStatus: "Status Membru",
    activityTypes: "Tipuri Activitate",
    activityDateFrom: "Activitate de la",
    activityDateTo: "Activitate până la",
    participated: "A participat",
    paymentYears: "Ani plată",
    paymentTypes: "Tipuri plată",
    paymentMethods: "Metode plată",
    paymentStatuses: "Statusuri plată",
  }

  const filterEntries = Object.entries(filters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined
  })

  if (filterEntries.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Filtre active:</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
          Resetează tot
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {filterEntries.map(([key, value]) => {
          const label = filterLabels[key as keyof AnalyticsFilters] || key
          let displayValue = ""

          if (Array.isArray(value)) {
            displayValue = `${value.length} selectate`
          } else if (typeof value === "boolean") {
            displayValue = value ? "Da" : "Nu"
          } else {
            displayValue = String(value)
          }

          return (
            <Badge key={key} variant="secondary" className="pl-3 pr-1 py-1 text-xs">
              <span className="mr-2">
                {label}: {displayValue}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(key)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
