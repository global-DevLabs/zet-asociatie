"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useActivities } from "@/lib/activities-store"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ro } from "date-fns/locale"

interface EditActivitiesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function EditActivitiesModal({ open, onOpenChange, memberId, memberName }: EditActivitiesModalProps) {
  const { activities, getParticipants, addParticipants, removeParticipant, activityTypes } = useActivities()
  const { toast } = useToast()
  const [memberActivities, setMemberActivities] = useState<string[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      // Find all activities where this member is a participant
      const participatingActivities = activities
        .filter((activity) => getParticipants(activity.id).some((p) => p.member_id === memberId))
        .map((a) => a.id)

      // Defensive de-duplication
      const uniqueActivities = Array.from(new Set(participatingActivities))
      setMemberActivities(uniqueActivities)
    }
  }, [open, memberId, activities, getParticipants])

  const handleAddToActivity = async () => {
    if (!selectedActivityId) return

    if (memberActivities.includes(selectedActivityId)) {
      toast({
        title: "Deja adăugat",
        description: "Membrul este deja adăugat la această activitate",
        variant: "default",
      })
      setSelectedActivityId("")
      return
    }

    setIsSaving(true)
    try {
      await addParticipants(selectedActivityId, [memberId])
      setMemberActivities((prev) => {
        if (prev.includes(selectedActivityId)) {
          return prev
        }
        return [...prev, selectedActivityId]
      })
      setSelectedActivityId("")

      toast({
        title: "Succes",
        description: `${memberName} a fost adăugat la activitate`,
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la adăugarea participantului",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveFromActivity = async (activityId: string) => {
    setIsSaving(true)
    try {
      await removeParticipant(activityId, memberId)
      setMemberActivities((prev) => prev.filter((id) => id !== activityId))

      toast({
        title: "Succes",
        description: `${memberName} a fost eliminat din activitate`,
      })
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la eliminarea participantului",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const availableActivities = activities.filter((a) => !memberActivities.includes(a.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editează Participarea la Activități</DialogTitle>
          <DialogDescription>Gestionează activitățile pentru {memberName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
          {/* Add to activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Adaugă la activitate</h3>
            <div className="flex gap-2">
              <Command className="border rounded-lg flex-1">
                <CommandInput placeholder="Caută activități..." />
                <CommandList>
                  <CommandEmpty>Nu s-au găsit activități</CommandEmpty>
                  <CommandGroup>
                    {availableActivities.map((activity) => {
                      const activityType = activityTypes.find((t) => t.id === activity.type_id)
                      const dateStr = format(new Date(activity.date_from), "dd MMM yyyy", { locale: ro })
                      return (
                        <CommandItem
                          key={activity.id}
                          value={`${activity.id} ${activity.title} ${dateStr}`}
                          onSelect={() => setSelectedActivityId(activity.id)}
                          className={cn("cursor-pointer", selectedActivityId === activity.id && "bg-accent")}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title || activityType?.name || activity.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {dateStr} • {activity.location || "Fără locație"}
                            </p>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
              <Button
                type="button"
                onClick={handleAddToActivity}
                disabled={!selectedActivityId || isSaving}
                size="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adaugă
              </Button>
            </div>
          </div>

          {/* Current activities */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Activități curente ({memberActivities.length})</h3>
            {memberActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nu participă la nicio activitate</p>
            ) : (
              <div className="space-y-2">
                {Array.from(new Set(memberActivities)).map((activityId) => {
                  const activity = activities.find((a) => a.id === activityId)
                  if (!activity) return null
                  const activityType = activityTypes.find((t) => t.id === activity.type_id)
                  const dateStr = format(new Date(activity.date_from), "dd MMM yyyy", { locale: ro })

                  return (
                    <div key={activityId} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title || activityType?.name || activity.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateStr} • {activity.location || "Fără locație"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromActivity(activityId)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
