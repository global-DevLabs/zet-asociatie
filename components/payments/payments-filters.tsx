"use client"

import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { YearSelect } from "@/components/ui/year-select"
import { Checkbox } from "@/components/ui/checkbox"
import type { PaymentType, PaymentStatus } from "@/types"
import { PAYMENT_TYPES, PAYMENT_STATUSES } from "@/lib/constants"
import { useSettings } from "@/lib/settings-store"

interface PaymentsFiltersProps {
  filters: {
    dateFrom: string
    dateTo: string
    types: PaymentType[]
    statuses: PaymentStatus[]
    methods: string[]
    yearFrom: number | null
    yearTo: number | null
  }
  onFiltersChange: (filters: any) => void
  onClose: () => void
}

export function PaymentsFilters({ filters, onFiltersChange, onClose }: PaymentsFiltersProps) {
  const { paymentMethods } = useSettings()

  const handleReset = () => {
    onFiltersChange({
      dateFrom: "",
      dateTo: "",
      types: [],
      statuses: [],
      methods: [],
      yearFrom: null,
      yearTo: null,
    })
  }

  const handleApply = () => {
    onClose()
  }

  const toggleType = (type: PaymentType) => {
    const newTypes = filters.types.includes(type) ? filters.types.filter((t) => t !== type) : [...filters.types, type]
    onFiltersChange({ ...filters, types: newTypes })
  }

  const toggleStatus = (status: PaymentStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const toggleMethod = (method: string) => {
    const newMethods = filters.methods.includes(method)
      ? filters.methods.filter((m) => m !== method)
      : [...filters.methods, method]
    onFiltersChange({ ...filters, methods: newMethods })
  }

  const activeCount =
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.types.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.methods.length > 0 ? 1 : 0) +
    (filters.yearFrom || filters.yearTo ? 1 : 0)

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pb-4 border-b">
        <SheetTitle>Filtrare plăți</SheetTitle>
        <SheetDescription>Filtrează lista de plăți după diverse criterii</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Interval date</Label>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">De la</Label>
                <DatePickerInput
                  value={filters.dateFrom}
                  onChange={(value) => onFiltersChange({ ...filters, dateFrom: value })}
                  placeholder="dd.mm.yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Până la</Label>
                <DatePickerInput
                  value={filters.dateTo}
                  onChange={(value) => onFiltersChange({ ...filters, dateTo: value })}
                  placeholder="dd.mm.yyyy"
                />
              </div>
            </div>
          </div>

          {/* Year Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">An cotizație</Label>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">De la anul</Label>
                <YearSelect
                  value={filters.yearFrom || undefined}
                  onChange={(value) => onFiltersChange({ ...filters, yearFrom: value || null })}
                  placeholder="Selectează"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Până la anul</Label>
                <YearSelect
                  value={filters.yearTo || undefined}
                  onChange={(value) => onFiltersChange({ ...filters, yearTo: value || null })}
                  placeholder="Selectează"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 2}
                />
              </div>
            </div>
          </div>

          {/* Payment Types */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tip plată</Label>
            <div className="space-y-2">
              {PAYMENT_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filters.types.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Statuses */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="space-y-2">
              {PAYMENT_STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.statuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Metodă de plată</Label>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox
                    id={`method-${method}`}
                    checked={filters.methods.includes(method)}
                    onCheckedChange={() => toggleMethod(method)}
                  />
                  <Label htmlFor={`method-${method}`} className="text-sm font-normal cursor-pointer">
                    {method}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 space-y-3">
        <Button onClick={handleApply} className="w-full">
          Aplică filtrele {activeCount > 0 && `(${activeCount})`}
        </Button>
        <Button variant="outline" onClick={handleReset} className="w-full bg-transparent">
          Resetează filtrele
        </Button>
      </div>
    </div>
  )
}
