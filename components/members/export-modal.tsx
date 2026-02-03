"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { Member } from "@/types"
import {
  type ExportFormat,
  type ExportSortBy,
  EXPORT_FIELDS,
  generateCSV,
  downloadCSV,
  generateFilename,
} from "@/lib/export-utils"
import { useSettings } from "@/lib/settings-store"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: Member[]
  filterDescription?: string
}

export function ExportModal({ open, onOpenChange, members, filterDescription }: ExportModalProps) {
  const { getUnitDisplay } = useSettings()
  const { user } = useAuth()
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter((f) => !f.sensitive).map((f) => f.key),
  )
  const [sortBy, setSortBy] = useState<ExportSortBy>("name")
  const [isExporting, setIsExporting] = useState(false)

  const isAdmin = user?.role === "admin"

  // Filter available fields based on user role
  const availableFields = isAdmin ? EXPORT_FIELDS : EXPORT_FIELDS.filter((f) => !f.sensitive)

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) => (prev.includes(fieldKey) ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey]))
  }

  const handleSelectAll = () => {
    setSelectedFields(availableFields.map((f) => f.key))
  }

  const handleDeselectAll = () => {
    setSelectedFields([])
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Te rog selectează cel puțin un câmp pentru export")
      return
    }

    setIsExporting(true)

    try {
      // Filter fields based on selection
      const fieldsToExport = EXPORT_FIELDS.filter((f) => selectedFields.includes(f.key))

      // Generate export based on format
      if (format === "csv") {
        const csvContent = generateCSV(members, fieldsToExport, sortBy, getUnitDisplay)
        const filename = generateFilename("csv", filterDescription)
        downloadCSV(csvContent, filename)
        toast.success("Export finalizat cu succes")
      } else if (format === "xlsx") {
        // Excel export would require a library like xlsx
        toast.info("Export Excel va fi disponibil în curând")
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Eroare la generarea exportului")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Listă Membri</DialogTitle>
          <DialogDescription>
            Exportă lista curentă de membri ({members.length} rezultate) în formatul dorit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Format Fișier</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV (.csv) — Compatibil cu Excel, Google Sheets
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" disabled />
                <Label htmlFor="xlsx" className="font-normal cursor-pointer text-muted-foreground">
                  Excel (.xlsx) — În curând
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Câmpuri de Inclus</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} type="button">
                  Selectează Tot
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll} type="button">
                  Deselectează Tot
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4 bg-muted/30">
              {availableFields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => handleFieldToggle(field.key)}
                  />
                  <Label htmlFor={field.key} className="font-normal cursor-pointer text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Câmpurile sensibile (CNP, date de contact) sunt disponibile doar pentru administratori.
              </p>
            )}
          </div>

          {/* Sorting */}
          <div className="space-y-3">
            <Label htmlFor="sort-by" className="text-sm font-semibold">
              Sortare
            </Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as ExportSortBy)}>
              <SelectTrigger id="sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">După Nume</SelectItem>
                <SelectItem value="memberCode">După ID Membru</SelectItem>
                <SelectItem value="enrollmentYear">După An Înscriere</SelectItem>
                <SelectItem value="rank">După Grad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Anulează
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportare...
              </>
            ) : (
              "Exportă"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
