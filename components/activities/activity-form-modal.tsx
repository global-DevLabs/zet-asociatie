"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { useActivities } from "@/lib/activities-store"
import { useToast } from "@/hooks/use-toast"
import { useMembers } from "@/lib/members-store"
import { MemberMultiSelect } from "@/components/ui/member-multi-select"
import { ActivityTypeCombobox } from "@/components/ui/activity-type-combobox"

interface ActivityFormModalProps {
  open: boolean
  onClose: () => void
  activityId?: string
}

export function ActivityFormModal({ open, onClose, activityId }: ActivityFormModalProps) {
  const {
    createActivity,
    updateActivity,
    getActivityById,
    activityTypes,
    createActivityType,
    addParticipants,
    getParticipants,
  } = useActivities()
  const { members } = useMembers()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const activity = activityId ? getActivityById(activityId) : undefined
  const isEdit = !!activity

  const [formData, setFormData] = useState({
    type_id: activity?.type_id || "",
    title: activity?.title || "",
    date_from: activity?.date_from || "",
    date_to: activity?.date_to || "",
    location: activity?.location || "",
    notes: activity?.notes || "",
  })

  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    if (activity) {
      setFormData({
        type_id: activity.type_id,
        title: activity.title || "",
        date_from: activity.date_from,
        date_to: activity.date_to || "",
        location: activity.location || "",
        notes: activity.notes || "",
      })
      const existingParticipants = getParticipants(activity.id)
      setSelectedMembers(existingParticipants.map((p) => p.member_id))
    } else {
      setSelectedMembers([])
    }
  }, [activity, getParticipants])

  const handleSave = async () => {
    if (!formData.type_id || !formData.date_from) {
      toast({
        title: "Eroare",
        description: "Tip activitate și data sunt obligatorii",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      if (isEdit) {
        await updateActivity(activityId!, formData)
        await addParticipants(activityId!, selectedMembers)
        toast({
          title: "Succes",
          description: "Activitatea a fost actualizată",
        })
      } else {
        const newActivity = await createActivity(formData as any)
        if (selectedMembers.length > 0) {
          await addParticipants(newActivity.id, selectedMembers)
        }
        toast({
          title: "Succes",
          description: "Activitatea a fost creată",
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la salvarea activității",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateActivityType = (name: string) => {
    // Normalize name (trim and capitalize first letter)
    const normalizedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase()

    const newType = createActivityType({
      name: normalizedName,
      category: "Altele",
      is_active: true,
    })

    setFormData({ ...formData, type_id: newType.id })

    toast({
      title: "Tip activitate creat",
      description: `Tipul "${normalizedName}" a fost adăugat cu succes`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editează Activitate" : "Adaugă Activitate Nouă"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Modifică detaliile activității existente" : "Completează formularul pentru a adăuga o activitate nouă"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">
              Tip Activitate <span className="text-red-500">*</span>
            </Label>
            <ActivityTypeCombobox
              activityTypes={activityTypes}
              value={formData.type_id}
              onChange={(value) => setFormData({ ...formData, type_id: value })}
              onCreateNew={handleCreateActivityType}
              placeholder="Selectează sau scrie tipul activității..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date_from">
              Dată <span className="text-red-500">*</span>
            </Label>
            <DatePickerInput
              value={formData.date_from}
              onChange={(value) => setFormData({ ...formData, date_from: value })}
              placeholder="dd.mm.yyyy"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Titlu (opțional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Teatru – Ianuarie"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Locație (opțional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Teatrul Național"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Note (opțional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalii suplimentare..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Participanți (opțional)</Label>
            <MemberMultiSelect
              members={members}
              selectedMemberIds={selectedMembers}
              onSelectionChange={setSelectedMembers}
              placeholder="Caută și selectează participanți..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Se salvează..." : isEdit ? "Salvează" : "Creează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
