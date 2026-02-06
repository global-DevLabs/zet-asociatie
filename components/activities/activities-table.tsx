"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate as formatDateFns } from "date-fns"
import { ro } from "date-fns/locale"
import type { Activity } from "@/types"
import { useActivities } from "@/lib/activities-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Users, MoreVertical, Archive, RotateCcw, Trash2 } from "lucide-react"
import { ArchiveActivityDialog } from "./archive-activity-dialog"
import { DeleteActivityDialog } from "./delete-activity-dialog"

interface ActivitiesTableProps {
  activities: Activity[]
}

export function ActivitiesTable({ activities }: ActivitiesTableProps) {
  const router = useRouter()
  const { activityTypes, getParticipants, archiveActivity, reactivateActivity, deleteActivity } = useActivities()
  const { hasPermission } = useAuth()
  const { toast } = useToast()

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const canEdit = hasPermission("edit")

  const getActivityTypeName = (typeId: string) => {
    const type = activityTypes.find((t) => t.id === typeId)
    return type?.name || "—"
  }

  const formatDate = (dateString: string) => {
    try {
      const m = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (!m) return dateString
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
      return formatDateFns(d, "dd MMM yyyy", { locale: ro })
    } catch {
      return dateString
    }
  }

  const handleArchiveClick = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedActivity(activity)
    setArchiveDialogOpen(true)
  }

  const handleReactivateClick = async (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await reactivateActivity(activity.id)
      toast({
        title: "Activitate reactivată",
        description: `${activity.title || activity.id} a fost reactivată cu succes`,
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut reactiva activitatea",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedActivity(activity)
    setDeleteDialogOpen(true)
  }

  const handleArchiveConfirm = async () => {
    if (!selectedActivity) return

    try {
      await archiveActivity(selectedActivity.id)
      toast({
        title: "Activitate arhivată",
        description: `${selectedActivity.title || selectedActivity.id} a fost arhivată cu succes`,
      })
      setArchiveDialogOpen(false)
      setSelectedActivity(null)
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut arhiva activitatea",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedActivity) return

    try {
      await deleteActivity(selectedActivity.id)
      toast({
        title: "Activitate ștearsă",
        description: `${selectedActivity.title || selectedActivity.id} a fost ștearsă permanent`,
      })
      setDeleteDialogOpen(false)
      setSelectedActivity(null)
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge activitatea",
        variant: "destructive",
      })
    }
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">Nu există activități înregistrate</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="font-semibold">Cod</TableHead>
              <TableHead className="font-semibold">Tip Activitate</TableHead>
              <TableHead className="font-semibold">Titlu</TableHead>
              <TableHead className="font-semibold">Dată</TableHead>
              <TableHead className="font-semibold">Locație</TableHead>
              <TableHead className="font-semibold text-right">Participanți</TableHead>
              {canEdit && <TableHead className="font-semibold text-right w-[50px]">Acțiuni</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => {
              const participants = getParticipants(activity.id)
              const isArchived = activity.status === "archived"

              return (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/activities/${activity.id}`)}
                >
                  <TableCell className="font-mono text-sm">{activity.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {getActivityTypeName(activity.type_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.title || "—"}</span>
                      {isArchived && (
                        <Badge variant="secondary" className="text-xs">
                          Arhivat
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(activity.date_from)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{activity.location || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">{participants.length}</span>
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isArchived ? (
                            <DropdownMenuItem onClick={(e) => handleArchiveClick(activity, e)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Arhivează
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => handleReactivateClick(activity, e)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reactivează
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(activity, e)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Șterge
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedActivity && (
        <>
          <ArchiveActivityDialog
            open={archiveDialogOpen}
            onClose={() => {
              setArchiveDialogOpen(false)
              setSelectedActivity(null)
            }}
            onConfirm={handleArchiveConfirm}
            activityTitle={selectedActivity.title || selectedActivity.id}
          />

          <DeleteActivityDialog
            open={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false)
              setSelectedActivity(null)
            }}
            onConfirm={handleDeleteConfirm}
            activityTitle={selectedActivity.title || selectedActivity.id}
          />
        </>
      )}
    </>
  )
}
