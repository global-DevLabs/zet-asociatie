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
import { Download, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActivities } from "@/lib/activities-store"
import { useMembers } from "@/lib/members-store"
import type { Activity, ActivityType } from "@/types"
import { formatDate as formatDateFns } from "date-fns"

interface ExportParticipantsModalProps {
  open: boolean
  onClose: () => void
  activity: Activity
  activityType?: ActivityType
}

export function ExportParticipantsModal({ open, onClose, activity, activityType }: ExportParticipantsModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const { getParticipants } = useActivities()
  const { members } = useMembers()

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const participants = getParticipants(activity.id)

      // Build CSV with Excel-friendly format (UTF-8 BOM)
      const headers = [
        "activity_code",
        "activity_title",
        "activity_date",
        "member_code",
        "last_name",
        "first_name",
        "rank",
        "um",
        "role",
        "added_at",
      ]

      const rows = participants.map((p) => {
        const member = members.find((m) => m.id === p.member_id)
        return [
          activity.id,
          activity.title || activityType?.name || "",
          activity.date_from,
          member?.memberCode || "",
          member?.lastName || "",
          member?.firstName || "",
          member?.rank || "",
          member?.unit || "",
          p.status === "attended" ? "Participant" : p.status === "organizer" ? "Organizator" : "Invitat",
          formatDateFns(new Date(p.created_at), "dd.MM.yyyy"),
        ]
      })

      // Create CSV with proper escaping
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\r\n")

      // Add UTF-8 BOM for Excel compatibility
      const bom = "\uFEFF"
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" })

      // Generate filename
      const filename = `participanti-${activity.id}-${formatDateFns(new Date(), "yyyy-MM-dd")}.csv`

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export reușit",
        description: `${participants.length} participanți exportați în ${filename}`,
      })

      onClose()
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export eșuat",
        description: "A apărut o eroare la exportarea participanților",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const participants = getParticipants(activity.id)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportă Participanți</DialogTitle>
          <DialogDescription>
            {participants.length === 1 ? "Exportă 1 participant" : `Exportă ${participants.length} participanți`} din
            activitatea {activity.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Format: CSV</p>
            <p>Fișierul poate fi deschis în Excel, Google Sheets sau alte aplicații similare.</p>
            <p className="mt-2 text-xs">
              Coloane: Cod Activitate, Titlu, Dată, Cod Membru, Nume, Prenume, Grad, UM, Rol, Data Adăugării
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Anulează
          </Button>
          <Button onClick={handleExport} disabled={isExporting || participants.length === 0}>
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
