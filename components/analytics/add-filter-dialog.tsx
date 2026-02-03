"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import type { AnalyticsFilters } from "@/lib/analytics-engine"
import { PAYMENT_TYPES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants"
import { useSettings } from "@/lib/settings-store"
import { useActivities } from "@/lib/activities-store"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMembers } from "@/lib/members-store"
import { usePayments } from "@/lib/payments-store"

interface AddFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFilters: AnalyticsFilters
  onApplyFilters: (filters: AnalyticsFilters) => void
}

type FilterCategory = "member" | "payment" | "activity"

export function AddFilterDialog({ open, onOpenChange, currentFilters, onApplyFilters }: AddFilterDialogProps) {
  const [tempFilters, setTempFilters] = useState<AnalyticsFilters>(currentFilters)
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory | null>(null)
  const [yearInput, setYearInput] = useState("")
  const [yearError, setYearError] = useState("")
  const [unitSearch, setUnitSearch] = useState("")
  const [rankSearch, setRankSearch] = useState("")

  const { ranks, units, profiles, paymentYears, addPaymentYear } = useSettings()
  const { activityTypes } = useActivities()
  const { groups } = useWhatsAppGroups()
  const { members } = useMembers()
  const { getAllPayments } = usePayments()

  // Extract unique needs from members
  const allNeeds = Array.from(
    new Set(
      members.flatMap((m) => [
        ...(m.branchNeeds?.split(",").map((n) => n.trim()) || []),
        ...(m.foundationNeeds?.split(",").map((n) => n.trim()) || []),
        ...(m.otherNeeds?.split(",").map((n) => n.trim()) || []),
      ]),
    ),
  ).filter(Boolean)

  // Get unique payment values
  const allPayments = getAllPayments()
  const paymentTypesFromPayments = Array.from(
    new Set(allPayments.map((p) => p.paymentType).filter((v) => v && v.trim())),
  )
  const paymentMethodsFromPayments = Array.from(new Set(allPayments.map((p) => p.method).filter((v) => v && v.trim())))
  const paymentStatusesFromPayments = Array.from(new Set(allPayments.map((p) => p.status).filter((v) => v && v.trim())))

  const yearsFromPayments = Array.from(new Set(allPayments.map((p) => p.year).filter((y) => y)))
  const allPaymentYears = Array.from(new Set([...paymentYears, ...yearsFromPayments])).sort((a, b) => b - a)

  // Filter units based on search
  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units
    const searchLower = unitSearch.toLowerCase()
    return units.filter(
      (unit) =>
        unit.code.toLowerCase().includes(searchLower) ||
        (unit.description && unit.description.toLowerCase().includes(searchLower)),
    )
  }, [units, unitSearch])

  // Select/Clear all units helpers
  const selectAllUnits = () => {
    const allUnitCodes = filteredUnits.map((u) => u.code)
    const currentUnits = tempFilters.units || []
    const merged = Array.from(new Set([...currentUnits, ...allUnitCodes]))
    updateFilter("units", merged)
  }

  const clearAllUnits = () => {
    updateFilter("units", [])
    setUnitSearch("")
  }

  const selectedUnitsCount = (tempFilters.units || []).length

  // Filter ranks based on search
  const filteredRanks = useMemo(() => {
    if (!rankSearch.trim()) return ranks
    const searchLower = rankSearch.toLowerCase()
    return ranks.filter((rank) => rank.toLowerCase().includes(searchLower))
  }, [ranks, rankSearch])

  // Select/Clear all ranks helpers
  const selectAllRanks = () => {
    const allRankValues = filteredRanks
    const currentRanks = tempFilters.ranks || []
    const merged = Array.from(new Set([...currentRanks, ...allRankValues]))
    updateFilter("ranks", merged)
  }

  const clearAllRanks = () => {
    updateFilter("ranks", [])
    setRankSearch("")
  }

  const selectedRanksCount = (tempFilters.ranks || []).length

  const handleAddYear = () => {
    setYearError("")
    const trimmedInput = yearInput.trim()

    if (!trimmedInput) {
      setYearError("Introduceți un an")
      return
    }

    const year = Number.parseInt(trimmedInput, 10)

    // Validate year format (4 digits, 1900-2100)
    if (isNaN(year) || year < 1900 || year > 2100) {
      setYearError("Anul trebuie să fie între 1900 și 2100")
      return
    }

    // Check if already exists
    if (allPaymentYears.includes(year)) {
      setYearError("Anul există deja în listă")
      return
    }

    // Add to settings
    const success = addPaymentYear(year)
    if (success) {
      setYearInput("")
      setYearError("")
    }
  }

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddYear()
    }
  }

  const handleApply = () => {
    onApplyFilters(tempFilters)
    onOpenChange(false)
  }

  const handleReset = () => {
    setTempFilters({})
  }

  const updateFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleArrayValue = <K extends keyof AnalyticsFilters>(key: K, value: string) => {
    const current = (tempFilters[key] as string[]) || []
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateFilter(key, updated as AnalyticsFilters[K])
  }

  const renderMemberFilters = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Filtre Membri</h3>

      {/* Units - Enhanced Multi-Select */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Unitate Militară (UM)</Label>
            {selectedUnitsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedUnitsCount} selectate
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllUnits}
              className="h-7 text-xs px-2"
              disabled={filteredUnits.length === 0}
            >
              Selectează tot
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllUnits}
              className="h-7 text-xs px-2"
              disabled={selectedUnitsCount === 0}
            >
              Șterge tot
            </Button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Caută UM..."
            value={unitSearch}
            onChange={(e) => setUnitSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Units checkbox list */}
        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
          {filteredUnits.length === 0 ? (
            <div className="col-span-2 text-center text-sm text-muted-foreground py-4">
              {unitSearch ? "Nicio unitate găsită" : "Nu există unități configurate"}
            </div>
          ) : (
            filteredUnits.map((unit) => (
              <div key={unit.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`unit-${unit.code}`}
                  checked={(tempFilters.units || []).includes(unit.code)}
                  onCheckedChange={() => toggleArrayValue("units", unit.code)}
                />
                <label htmlFor={`unit-${unit.code}`} className="text-sm cursor-pointer truncate" title={unit.description || unit.code}>
                  {unit.code}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* Ranks - Enhanced Multi-Select */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Grad</Label>
            {selectedRanksCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedRanksCount} selectate
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllRanks}
              className="h-7 text-xs px-2"
              disabled={filteredRanks.length === 0}
            >
              Selectează tot
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllRanks}
              className="h-7 text-xs px-2"
              disabled={selectedRanksCount === 0}
            >
              Șterge tot
            </Button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Caută grad..."
            value={rankSearch}
            onChange={(e) => setRankSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Ranks checkbox list */}
        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
          {filteredRanks.length === 0 ? (
            <div className="col-span-2 text-center text-sm text-muted-foreground py-4">
              {rankSearch ? "Niciun grad găsit" : "Nu există grade configurate"}
            </div>
          ) : (
            filteredRanks.map((rank) => (
              <div key={rank} className="flex items-center space-x-2">
                <Checkbox
                  id={`rank-${rank}`}
                  checked={(tempFilters.ranks || []).includes(rank)}
                  onCheckedChange={() => toggleArrayValue("ranks", rank)}
                />
                <label htmlFor={`rank-${rank}`} className="text-sm cursor-pointer truncate" title={rank}>
                  {rank}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* Profiles */}
      <div className="space-y-2">
        <Label>Profil Principal</Label>
        <div className="grid grid-cols-2 gap-2">
          {profiles.map((profile) => (
            <div key={profile} className="flex items-center space-x-2">
              <Checkbox
                id={`profile-${profile}`}
                checked={(tempFilters.profiles || []).includes(profile)}
                onCheckedChange={() => toggleArrayValue("profiles", profile)}
              />
              <label htmlFor={`profile-${profile}`} className="text-sm cursor-pointer">
                {profile}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* WhatsApp Groups */}
      <div className="space-y-2">
        <Label>Grupuri WhatsApp</Label>
        <div className="space-y-2">
          {groups
            .filter((g) => g.status === "Active")
            .map((group) => (
              <div key={group.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={(tempFilters.whatsappGroupIds || []).includes(group.id)}
                  onCheckedChange={() => toggleArrayValue("whatsappGroupIds", group.id)}
                />
                <label htmlFor={`group-${group.id}`} className="text-sm cursor-pointer">
                  {group.name}
                </label>
              </div>
            ))}
        </div>
      </div>

      <Separator />

      {/* Member Status */}
      <div className="space-y-2">
        <Label>Status Membru</Label>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status-active"
              checked={(tempFilters.memberStatus || []).includes("Activ")}
              onCheckedChange={() => toggleArrayValue("memberStatus", "Activ")}
            />
            <label htmlFor="status-active" className="text-sm cursor-pointer">
              Activ
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status-withdrawn"
              checked={(tempFilters.memberStatus || []).includes("Retras")}
              onCheckedChange={() => toggleArrayValue("memberStatus", "Retras")}
            />
            <label htmlFor="status-withdrawn" className="text-sm cursor-pointer">
              Retras
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPaymentFilters = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Filtre Plăți</h3>

      {/* Payment Types */}
      <div className="space-y-2">
        <Label>Tip plată</Label>
        <div className="space-y-2">
          {PAYMENT_TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`payment-type-${type}`}
                checked={(tempFilters.paymentTypes || []).includes(type)}
                onCheckedChange={() => toggleArrayValue("paymentTypes", type)}
              />
              <label htmlFor={`payment-type-${type}`} className="text-sm cursor-pointer">
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Payment Methods */}
      <div className="space-y-2">
        <Label>Metodă de plată</Label>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <div key={method} className="flex items-center space-x-2">
              <Checkbox
                id={`payment-method-${method}`}
                checked={(tempFilters.paymentMethods || []).includes(method)}
                onCheckedChange={() => toggleArrayValue("paymentMethods", method)}
              />
              <label htmlFor={`payment-method-${method}`} className="text-sm cursor-pointer">
                {method}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Payment Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="space-y-2">
          {PAYMENT_STATUSES.map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`payment-status-${status}`}
                checked={(tempFilters.paymentStatuses || []).includes(status)}
                onCheckedChange={() => toggleArrayValue("paymentStatuses", status)}
              />
              <label htmlFor={`payment-status-${status}`} className="text-sm cursor-pointer">
                {status}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Payment Years */}
      <div className="space-y-2">
        <Label>An de cotizație</Label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="YYYY"
              value={yearInput}
              onChange={(e) => {
                setYearInput(e.target.value)
                setYearError("")
              }}
              onKeyDown={handleYearKeyDown}
              maxLength={4}
              className="h-9"
            />
            {yearError && <p className="text-xs text-destructive mt-1">{yearError}</p>}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleAddYear}>
            Adaugă an
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {Array.from(new Set([...paymentYears]))
            .sort((a, b) => b - a)
            .map((year) => (
              <div key={year} className="flex items-center space-x-2">
                <Checkbox
                  id={`payment-year-${year}`}
                  checked={(tempFilters.paymentYears || []).includes(year)}
                  onCheckedChange={() => {
                    const current = tempFilters.paymentYears || []
                    const updated = current.includes(year) ? current.filter((y) => y !== year) : [...current, year]
                    updateFilter("paymentYears", updated)
                  }}
                />
                <label htmlFor={`payment-year-${year}`} className="text-sm cursor-pointer">
                  {year}
                </label>
              </div>
            ))}
        </div>
      </div>
    </div>
  )

  const renderActivityFilters = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Filtre Activități</h3>

      {/* Activity Types */}
      <div className="space-y-2">
        <Label>Tip activitate</Label>
        <div className="space-y-2">
          {activityTypes
            .filter((at) => at.is_active)
            .map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`activity-type-${type.id}`}
                  checked={(tempFilters.activityTypes || []).includes(type.id)}
                  onCheckedChange={() => toggleArrayValue("activityTypes", type.id)}
                />
                <label htmlFor={`activity-type-${type.id}`} className="text-sm cursor-pointer">
                  {type.name}
                </label>
              </div>
            ))}
        </div>
      </div>

      <Separator />

      {/* Activity Date Range */}
      <div className="space-y-2">
        <Label>Interval date activitate</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">De la</Label>
            <Input
              type="date"
              value={tempFilters.activityDateFrom || ""}
              onChange={(e) => updateFilter("activityDateFrom", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Până la</Label>
            <Input
              type="date"
              value={tempFilters.activityDateTo || ""}
              onChange={(e) => updateFilter("activityDateTo", e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Participation */}
      <div className="space-y-2">
        <Label>Participare la activități</Label>
        <RadioGroup
          value={tempFilters.participated === undefined ? "all" : tempFilters.participated === true ? "yes" : "no"}
          onValueChange={(value) => {
            if (value === "all") {
              const { participated, ...rest } = tempFilters
              setTempFilters(rest)
            } else {
              updateFilter("participated", value === "yes")
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="participated-all" />
            <Label htmlFor="participated-all" className="font-normal cursor-pointer">
              Toți membrii
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="participated-yes" />
            <Label htmlFor="participated-yes" className="font-normal cursor-pointer">
              Au participat
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="participated-no" />
            <Label htmlFor="participated-no" className="font-normal cursor-pointer">
              Nu au participat
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        {/* HEADER - Fixed, no scroll */}
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>Adaugă Filtre</DialogTitle>
          <DialogDescription className="sr-only">Selectează filtrele pentru analiza datelor</DialogDescription>
        </DialogHeader>

        {/* CONTENT - Scrollable only, no padding bottom needed */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="grid grid-cols-4 gap-4">
            {/* Category selector */}
            <div className="space-y-2">
              <Button
                variant={selectedCategory === "member" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("member")}
                className="w-full justify-start"
              >
                Membri
              </Button>
              <Button
                variant={selectedCategory === "payment" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("payment")}
                className="w-full justify-start"
              >
                Plăți
              </Button>
              <Button
                variant={selectedCategory === "activity" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("activity")}
                className="w-full justify-start"
              >
                Activități
              </Button>
            </div>

            {/* Filter content */}
            <div className="col-span-3">
              {selectedCategory === "member" && renderMemberFilters()}
              {selectedCategory === "payment" && renderPaymentFilters()}
              {selectedCategory === "activity" && renderActivityFilters()}
              {!selectedCategory && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Selectează o categorie pentru a adăuga filtre
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER - Fixed, always visible, no sticky positioning */}
        <DialogFooter className="flex-shrink-0 bg-background border-t px-6 py-4">
          <Button variant="ghost" onClick={handleReset}>
            Resetează
          </Button>
          <Button onClick={handleApply}>Aplică Filtre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
