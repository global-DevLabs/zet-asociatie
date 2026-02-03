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
import { Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  exportActivitiesToCSV,
  exportActivitiesWithParticipantsToCSV,
  downloadFile,
  generateFilename,
} from "@/lib/activities-export-import"
import type { Activity, ActivityParticipant } from "@/types"

interface ExportModalProps {
  open: boolean
  onClose: () => void
  activities: Activity[]
  filterDescription: string
  getParticipants: (activityId: string) => ActivityParticipant[]
  getTypeName: (typeId: string) => string
  getMemberName: (memberId: string) => string
}

type ExportType = "activities" | "activities-with-participants"

export function ExportModal({
  open,
  onClose,
  activities,
  filterDescription,
  getParticipants,
  getTypeName,
  getMemberName,
}: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>("activities")
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let csvContent: string
      let filename: string

      if (exportType === "activities") {
        csvContent = exportActivitiesToCSV(activities, getParticipants, getTypeName)
        filename = generateFilename("activitati", filterDescription, "csv")
      } else {
        csvContent = exportActivitiesWithParticipantsToCSV(activities, getParticipants, getTypeName, getMemberName)
        filename = generateFilename("activitati-participanti", filterDescription, "csv")
      }

      downloadFile(csvContent, filename, "text/csv;charset=utf-8")

      toast({
        title: "Export reușit",
        description: `Au fost exportate ${activities.length} activități în fișierul ${filename}`,
      })

      onClose()
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export eșuat",
        description: "A apărut o eroare la exportarea activităților",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportă Activități</DialogTitle>
          <DialogDescription>
            {activities.length === 1 ? "Exportă 1 activitate" : `Exportă ${activities.length} activități`}
            {filterDescription && ` (${filterDescription})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tip Export</Label>
            <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="activities" id="export-activities" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="export-activities" className="font-medium cursor-pointer">
                    Listă activități
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">O linie per activitate cu număr de participanți</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="activities-with-participants" id="export-with-participants" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="export-with-participants" className="font-medium cursor-pointer">
                    Activități cu participanți
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">O linie per participant (detalii complete)</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Format: CSV</p>
            <p>Fișierul poate fi deschis în Excel, Google Sheets sau alte aplicații similare.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Anulează
          </Button>
          <Button onClick={handleExport} disabled={isExporting || activities.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se exportă...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportă CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
