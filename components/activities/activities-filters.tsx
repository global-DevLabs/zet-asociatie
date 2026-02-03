"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import type { ActivityType } from "@/types"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ActivitiesFiltersProps {
  open: boolean
  onClose: () => void
  filters: {
    typeIds: string[]
    dateFrom: string
    dateTo: string
  }
  onApplyFilters: (filters: { typeIds: string[]; dateFrom: string; dateTo: string }) => void
  activityTypes: ActivityType[]
}

export function ActivitiesFilters({ open, onClose, filters, onApplyFilters, activityTypes }: ActivitiesFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleReset = () => {
    const emptyFilters = { typeIds: [], dateFrom: "", dateTo: "" }
    setLocalFilters(emptyFilters)
    onApplyFilters(emptyFilters)
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
  }

  const toggleType = (typeId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      typeIds: prev.typeIds.includes(typeId) ? prev.typeIds.filter((id) => id !== typeId) : [...prev.typeIds, typeId],
    }))
  }

  const removeType = (typeId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      typeIds: prev.typeIds.filter((id) => id !== typeId),
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Filtrează Activități</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tip Activitate</Label>
            <div className="space-y-2">
              {activityTypes
                .filter((t) => t.is_active)
                .map((type) => (
                  <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localFilters.typeIds.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{type.name}</span>
                  </label>
                ))}
            </div>
            {localFilters.typeIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {localFilters.typeIds.map((typeId) => {
                  const type = activityTypes.find((t) => t.id === typeId)
                  return (
                    <Badge key={typeId} variant="secondary" className="pl-2 pr-1">
                      {type?.name}
                      <button
                        type="button"
                        onClick={() => removeType(typeId)}
                        className="ml-1 hover:bg-muted rounded-sm p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Perioadă</Label>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">De la</Label>
                <DatePickerInput
                  value={localFilters.dateFrom}
                  onChange={(value) => setLocalFilters({ ...localFilters, dateFrom: value })}
                  placeholder="dd.mm.yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Până la</Label>
                <DatePickerInput
                  value={localFilters.dateTo}
                  onChange={(value) => setLocalFilters({ ...localFilters, dateTo: value })}
                  placeholder="dd.mm.yyyy"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t mt-auto">
          <div className="flex items-center justify-between w-full gap-3">
            <Button variant="ghost" onClick={handleReset}>
              Resetează
            </Button>
            <Button onClick={handleApply}>Aplică filtrele</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
