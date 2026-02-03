"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, X, Save, RotateCcw } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RANKS, PROFILES, PROVENANCE_OPTIONS, WITHDRAWAL_REASONS } from "@/lib/constants"
import { YearSelect } from "@/components/ui/year-select"
import { useSettings } from "@/lib/settings-store"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useActivities } from "@/lib/activities-store"
import { Badge } from "@/components/ui/badge"
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MemberFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filters: any
  setFilters: (filters: any) => void
  resultCount?: number
  hideSearch?: boolean // When true, only renders the filter button (search is rendered externally)
}

interface FilterPreset {
  id: string
  name: string
  filters: any
  createdAt: string
}

const PRESETS_STORAGE_KEY = "filters_presets"

export function MemberFilters({ searchQuery, setSearchQuery, filters, setFilters, resultCount, hideSearch = false }: MemberFiltersProps) {
  const { units, getUnitDisplay } = useSettings()
  const { groups } = useWhatsAppGroups()
  const { activityTypes } = useActivities()
  const { toast } = useToast()
  
  const [isOpen, setIsOpen] = useState(false)
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) {
        setPresets(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Failed to load filter presets:", e)
    }
  }, [])

  const activeWhatsAppGroups = useMemo(() => groups.filter((g) => g.status === "Active"), [groups])
  const activeActivityTypes = useMemo(() => activityTypes.filter((t) => t.is_active), [activityTypes])

  // Convert data to MultiSelectCombobox options
  const rankOptions = RANKS.map((rank) => ({ value: rank, label: rank }))
  const unitOptions = units.map((u) => ({ value: u.code, label: getUnitDisplay(u.code) }))
  const profileOptions = PROFILES.map((p) => ({ value: p, label: p }))
  const activityTypeOptions = activeActivityTypes.map((t) => ({ value: t.id, label: t.name, description: t.category }))
  const whatsappGroupOptions = activeWhatsAppGroups.map((g) => ({ value: g.id, label: g.name, description: g.description }))
  const provenanceOptions = PROVENANCE_OPTIONS.map((p) => ({ value: p, label: p }))

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      ranks: [],
      units: [],
      profiles: [],
      carStatus: "",
      foundationStatus: "",
      foundationRole: "",
      provenances: [],
      withdrawalReasons: [],
      enrollmentYearStart: "",
      enrollmentYearEnd: "",
      retirementYearStart: "",
      retirementYearEnd: "",
      ageMin: "",
      ageMax: "",
      hasOutstandingPayments: "",
      hasRecentPayments: "",
      needsFilter: "",
      whatsappGroups: [],
      activityTypes: [],
    })
  }

  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (Array.isArray(value)) return count + value.length
    if (typeof value === "string" && value !== "" && value !== "all") return count + 1
    return count
  }, 0)

  const getActiveFilterChips = () => {
    const chips: { label: string; key: string; value?: string }[] = []

    filters.ranks.forEach((rank: string) => chips.push({ label: `Grad: ${rank}`, key: "ranks", value: rank }))
    filters.units.forEach((unit: string) => chips.push({ label: `UM: ${getUnitDisplay(unit)}`, key: "units", value: unit }))
    filters.profiles.forEach((profile: string) => chips.push({ label: `Profil: ${profile}`, key: "profiles", value: profile }))
    filters.provenances.forEach((prov: string) => chips.push({ label: `Proveniență: ${prov}`, key: "provenances", value: prov }))
    filters.activityTypes?.forEach((typeId: string) => {
      const activityType = activityTypes.find((t) => t.id === typeId)
      if (activityType) chips.push({ label: `Activitate: ${activityType.name}`, key: "activityTypes", value: typeId })
    })
    filters.whatsappGroups?.forEach((groupId: string) => {
      const group = groups.find((g) => g.id === groupId)
      if (group) chips.push({ label: `WA: ${group.name}`, key: "whatsappGroups", value: groupId })
    })
    if (filters.carStatus && filters.carStatus !== "all") chips.push({ label: `CAR: ${filters.carStatus}`, key: "carStatus" })
    if (filters.foundationStatus && filters.foundationStatus !== "all") chips.push({ label: `Fundație: ${filters.foundationStatus}`, key: "foundationStatus" })
    if (filters.hasOutstandingPayments && filters.hasOutstandingPayments !== "all") chips.push({ label: `Restanțe: ${filters.hasOutstandingPayments}`, key: "hasOutstandingPayments" })
    if (filters.hasRecentPayments && filters.hasRecentPayments !== "all") chips.push({ label: `Plăți recente: ${filters.hasRecentPayments}`, key: "hasRecentPayments" })
    if (filters.needsFilter && filters.needsFilter !== "all") {
      const needsLabels: Record<string, string> = { active: "Nevoi", none: "Fără solicitări", inactive: "Fără solicitări curente" }
      chips.push({ label: `Nevoi: ${needsLabels[filters.needsFilter] || filters.needsFilter}`, key: "needsFilter" })
    }
    if (filters.enrollmentYearStart || filters.enrollmentYearEnd) chips.push({ label: `Înscriere: ${filters.enrollmentYearStart || "—"} – ${filters.enrollmentYearEnd || "—"}`, key: "enrollmentYear" })
    if (filters.retirementYearStart || filters.retirementYearEnd) chips.push({ label: `Pensionare: ${filters.retirementYearStart || "—"} – ${filters.retirementYearEnd || "—"}`, key: "retirementYear" })
    if (filters.ageMin || filters.ageMax) chips.push({ label: `Vârstă: ${filters.ageMin || "—"} – ${filters.ageMax || "—"} ani`, key: "age" })

    return chips
  }

  const removeFilter = (chip: { key: string; value?: string }) => {
    if (Array.isArray(filters[chip.key])) {
      setFilters({ ...filters, [chip.key]: filters[chip.key].filter((v: string) => v !== chip.value) })
    } else if (chip.key === "enrollmentYear") {
      setFilters({ ...filters, enrollmentYearStart: "", enrollmentYearEnd: "" })
    } else if (chip.key === "retirementYear") {
      setFilters({ ...filters, retirementYearStart: "", retirementYearEnd: "" })
    } else if (chip.key === "age") {
      setFilters({ ...filters, ageMin: "", ageMax: "" })
    } else {
      setFilters({ ...filters, [chip.key]: "" })
    }
  }

  const savePreset = () => {
    if (!presetName.trim()) return
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    }
    
    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets))
    
    toast({ title: "Preset salvat", description: `Filtrul "${presetName}" a fost salvat.` })
    setPresetName("")
    setSavePresetOpen(false)
  }

  const loadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters)
    toast({ title: "Preset încărcat", description: `Filtrul "${preset.name}" a fost aplicat.` })
  }

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter((p) => p.id !== presetId)
    setPresets(updatedPresets)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets))
    toast({ title: "Preset șters" })
  }

  const activeChips = getActiveFilterChips()

  // Year quick chips
  const currentYear = new Date().getFullYear()
  const quickYearChips = [
    { label: "Ultimii 5 ani", startYear: currentYear - 5, endYear: currentYear },
    { label: "2020+", startYear: 2020, endYear: currentYear },
    { label: "2015-2019", startYear: 2015, endYear: 2019 },
    { label: "2010-2014", startYear: 2010, endYear: 2014 },
  ]

  // Filter button component (reused in both layouts)
  const filterButton = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 h-10 bg-background border-border shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtre</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
          
      <SheetContent side="top" className="flex flex-col p-0 w-full h-auto max-h-[85vh] gap-0">
        {/* Header with result count and actions */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold">Filtre Avansate</SheetTitle>
              <SheetDescription className="text-sm mt-1">
                {resultCount !== undefined && (
                  <span className="font-medium text-primary">Rezultate: {resultCount}</span>
                )}
              </SheetDescription>
            </div>
            {presets.length > 0 && (
              <Select onValueChange={(id) => {
                const preset = presets.find((p) => p.id === id)
                if (preset) loadPreset(preset)
              }}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Încarcă preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Applied filters chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              {activeChips.map((chip, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1 text-xs">
                  {chip.label}
                  <button onClick={() => removeFilter(chip)} className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        {/* Filter body - 2 columns */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-2">
              <Accordion type="multiple" defaultValue={["identitate", "activitati"]} className="space-y-2">
                {/* Identitate */}
                <AccordionItem value="identitate" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">
                    <div className="flex items-center gap-2">
                      Identitate
                      {(filters.ranks.length + filters.units.length + filters.profiles.length) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {filters.ranks.length + filters.units.length + filters.profiles.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Grad</Label>
                      {rankOptions.length > 0 ? (
                        <MultiSelectCombobox
                          options={rankOptions}
                          selectedValues={filters.ranks}
                          onSelectionChange={(values) => handleFilterChange("ranks", values)}
                          placeholder="Selectează graduri..."
                          searchPlaceholder="Caută grad..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există opțiuni disponibile</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Unitate Militară (UM)</Label>
                      {unitOptions.length > 0 ? (
                        <MultiSelectCombobox
                          options={unitOptions}
                          selectedValues={filters.units}
                          onSelectionChange={(values) => handleFilterChange("units", values)}
                          placeholder="Selectează unități..."
                          searchPlaceholder="Caută unitate..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există opțiuni disponibile</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Profil Principal</Label>
                      {profileOptions.length > 0 ? (
                        <MultiSelectCombobox
                          options={profileOptions}
                          selectedValues={filters.profiles}
                          onSelectionChange={(values) => handleFilterChange("profiles", values)}
                          placeholder="Selectează profiluri..."
                          searchPlaceholder="Caută profil..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există opțiuni disponibile</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Activități & Grupuri */}
                <AccordionItem value="activitati" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">
                    <div className="flex items-center gap-2">
                      Activități & Grupuri
                      {((filters.activityTypes?.length || 0) + (filters.whatsappGroups?.length || 0)) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {(filters.activityTypes?.length || 0) + (filters.whatsappGroups?.length || 0)}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Tip Activitate</Label>
                      {activityTypeOptions.length > 0 ? (
                        <MultiSelectCombobox
                          options={activityTypeOptions}
                          selectedValues={filters.activityTypes || []}
                          onSelectionChange={(values) => handleFilterChange("activityTypes", values)}
                          placeholder="Selectează tipuri activități..."
                          searchPlaceholder="Caută tip activitate..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există tipuri de activități</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Grupuri WhatsApp</Label>
                      {whatsappGroupOptions.length > 0 ? (
                        <MultiSelectCombobox
                          options={whatsappGroupOptions}
                          selectedValues={filters.whatsappGroups || []}
                          onSelectionChange={(values) => handleFilterChange("whatsappGroups", values)}
                          placeholder="Selectează grupuri..."
                          searchPlaceholder="Caută grup..."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există grupuri active</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <Accordion type="multiple" defaultValue={["statut"]} className="space-y-2">
                {/* Statut */}
                <AccordionItem value="statut" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">
                    <div className="flex items-center gap-2">
                      Statut
                      {(filters.carStatus || filters.foundationStatus || filters.hasOutstandingPayments || filters.hasRecentPayments) && (
                        <Badge variant="secondary" className="text-xs">!</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Status CAR</Label>
                        <Select
                          value={filters.carStatus || "all"}
                          onValueChange={(val) => handleFilterChange("carStatus", val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Toți membrii" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toți membrii</SelectItem>
                            <SelectItem value="Activ">Activ</SelectItem>
                            <SelectItem value="Retras">Retras</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Status Fundație</Label>
                        <Select
                          value={filters.foundationStatus || "all"}
                          onValueChange={(val) => handleFilterChange("foundationStatus", val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Toți" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toți</SelectItem>
                            <SelectItem value="Da">Da</SelectItem>
                            <SelectItem value="Nu">Nu</SelectItem>
                            <SelectItem value="Beneficiar">Beneficiar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Cotizații Restante</Label>
                        <Select
                          value={filters.hasOutstandingPayments || "all"}
                          onValueChange={(val) => handleFilterChange("hasOutstandingPayments", val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Toți" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toți</SelectItem>
                            <SelectItem value="Da">Cu restanțe</SelectItem>
                            <SelectItem value="Nu">Fără restanțe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Plăți Recente</Label>
                        <Select
                          value={filters.hasRecentPayments || "all"}
                          onValueChange={(val) => handleFilterChange("hasRecentPayments", val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Toți" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toți</SelectItem>
                            <SelectItem value="Da">Cu plăți recente</SelectItem>
                            <SelectItem value="Nu">Fără plăți recente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Nevoi / Solicitări</Label>
                        <Select
                          value={filters.needsFilter || "all"}
                          onValueChange={(val) => handleFilterChange("needsFilter", val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Toți membrii" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toți membrii</SelectItem>
                            <SelectItem value="active">Nevoi</SelectItem>
                            <SelectItem value="none">Fără solicitări</SelectItem>
                            <SelectItem value="inactive">Fără solicitări curente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Perioade */}
                <AccordionItem value="perioade" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">
                    <div className="flex items-center gap-2">
                      Perioade
                      {(filters.enrollmentYearStart || filters.enrollmentYearEnd || filters.retirementYearStart || filters.retirementYearEnd || filters.ageMin || filters.ageMax) && (
                        <Badge variant="secondary" className="text-xs">!</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="space-y-2">
                      <Label className="text-sm">An Înscriere</Label>
                      <div className="flex items-center gap-2">
                        <YearSelect
                          value={filters.enrollmentYearStart ? Number.parseInt(filters.enrollmentYearStart) : undefined}
                          onChange={(val) => handleFilterChange("enrollmentYearStart", val?.toString() || "")}
                          placeholder="De la"
                        />
                        <span className="text-muted-foreground">—</span>
                        <YearSelect
                          value={filters.enrollmentYearEnd ? Number.parseInt(filters.enrollmentYearEnd) : undefined}
                          onChange={(val) => handleFilterChange("enrollmentYearEnd", val?.toString() || "")}
                          placeholder="Până la"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {quickYearChips.map((chip) => (
                          <Button
                            key={chip.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs px-2 bg-transparent"
                            onClick={() => {
                              handleFilterChange("enrollmentYearStart", chip.startYear.toString())
                              handleFilterChange("enrollmentYearEnd", chip.endYear.toString())
                            }}
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">An Pensionare</Label>
                      <div className="flex items-center gap-2">
                        <YearSelect
                          value={filters.retirementYearStart ? Number.parseInt(filters.retirementYearStart) : undefined}
                          onChange={(val) => handleFilterChange("retirementYearStart", val?.toString() || "")}
                          placeholder="De la"
                        />
                        <span className="text-muted-foreground">—</span>
                        <YearSelect
                          value={filters.retirementYearEnd ? Number.parseInt(filters.retirementYearEnd) : undefined}
                          onChange={(val) => handleFilterChange("retirementYearEnd", val?.toString() || "")}
                          placeholder="Până la"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Interval Vârstă</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.ageMin}
                          onChange={(e) => handleFilterChange("ageMin", e.target.value)}
                          className="h-9 w-20"
                          min={0}
                          max={120}
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.ageMax}
                          onChange={(e) => handleFilterChange("ageMax", e.target.value)}
                          className="h-9 w-20"
                          min={0}
                          max={120}
                        />
                        <span className="text-sm text-muted-foreground">ani</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          { label: "< 60", min: "", max: "59" },
                          { label: "60-70", min: "60", max: "70" },
                          { label: "70-80", min: "70", max: "80" },
                          { label: "> 80", min: "80", max: "" },
                        ].map((chip) => (
                          <Button
                            key={chip.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs px-2 bg-transparent"
                            onClick={() => {
                              handleFilterChange("ageMin", chip.min)
                              handleFilterChange("ageMax", chip.max)
                            }}
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Altele */}
                <AccordionItem value="altele" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">
                    <div className="flex items-center gap-2">
                      Altele
                      {filters.provenances.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{filters.provenances.length}</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Proveniență</Label>
                      {provenanceOptions.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {PROVENANCE_OPTIONS.map((prov) => (
                            <div key={prov} className="flex items-center space-x-2">
                              <Checkbox
                                id={`prov-${prov}`}
                                checked={filters.provenances.includes(prov)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleFilterChange("provenances", [...filters.provenances, prov])
                                  } else {
                                    handleFilterChange("provenances", filters.provenances.filter((p: string) => p !== prov))
                                  }
                                }}
                              />
                              <Label htmlFor={`prov-${prov}`} className="text-sm cursor-pointer">
                                {prov}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Nu există opțiuni disponibile</p>
                      )}
                    </div>

                    {filters.carStatus === "Retras" && WITHDRAWAL_REASONS.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Motiv Retragere</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {WITHDRAWAL_REASONS.map((reason) => (
                            <div key={reason} className="flex items-center space-x-2">
                              <Checkbox
                                id={`reason-${reason}`}
                                checked={filters.withdrawalReasons.includes(reason)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleFilterChange("withdrawalReasons", [...filters.withdrawalReasons, reason])
                                  } else {
                                    handleFilterChange("withdrawalReasons", filters.withdrawalReasons.filter((r: string) => r !== reason))
                                  }
                                }}
                              />
                              <Label htmlFor={`reason-${reason}`} className="text-sm cursor-pointer">
                                {reason}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-background shrink-0">
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={clearFilters} disabled={activeFilterCount === 0} className="bg-transparent">
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetează filtrele
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Aplică filtrele
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  // Applied filters bar (outside sheet)
  const appliedFiltersBar = activeChips.length > 0 && (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
      <span className="text-xs font-medium text-muted-foreground">Filtre active:</span>
      {activeChips.slice(0, 6).map((chip, index) => (
        <Badge key={index} variant="secondary" className="gap-1 pr-1 text-xs">
          {chip.label}
          <button onClick={() => removeFilter(chip)} className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeChips.length > 6 && (
        <Badge variant="outline" className="text-xs">+{activeChips.length - 6} mai multe</Badge>
      )}
      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs ml-auto">
        Șterge toate
      </Button>
    </div>
  )

  // Save Preset Dialog
  const savePresetDialog = (
    <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvează Preset Filtru</DialogTitle>
          <DialogDescription>Salvează configurația actuală de filtre pentru a o reutiliza.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nume preset</Label>
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="ex: Membri activi din București"
            />
          </div>
          {activeChips.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Filtre incluse:</Label>
              <div className="flex flex-wrap gap-1">
                {activeChips.map((chip, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{chip.label}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSavePresetOpen(false)}>Anulează</Button>
          <Button onClick={savePreset} disabled={!presetName.trim()}>Salvează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // When hideSearch is true, only render the filter button (for unified control bar)
  if (hideSearch) {
    return (
      <>
        {filterButton}
        {savePresetDialog}
      </>
    )
  }

  // Full layout with search, filter button, and applied filters bar
  return (
    <div className="space-y-3">
      {filterButton}
      {activeChips.length > 0 && appliedFiltersBar}
      {savePresetDialog}
    </div>
  )
}
