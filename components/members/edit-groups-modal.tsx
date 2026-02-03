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
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useToast } from "@/hooks/use-toast"

interface EditGroupsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function EditGroupsModal({ open, onOpenChange, memberId, memberName }: EditGroupsModalProps) {
  const { groups } = useWhatsAppGroups()
  const { getMemberGroups, addMemberToGroups, removeMemberFromGroups } = useMemberGroups()
  const { toast } = useToast()
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [initialGroupIds, setInitialGroupIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const activeGroups = groups.filter((g) => g.status === "Active")

  useEffect(() => {
    if (open) {
      const memberGroupships = getMemberGroups(memberId)
      const groupIds = memberGroupships.map((mg) => mg.group_id)
      setSelectedGroupIds(groupIds)
      setInitialGroupIds(groupIds)
    }
  }, [open, memberId, getMemberGroups])

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const toAdd = selectedGroupIds.filter((id) => !initialGroupIds.includes(id))
      const toRemove = initialGroupIds.filter((id) => !selectedGroupIds.includes(id))

      if (toAdd.length > 0) {
        await addMemberToGroups(memberId, toAdd)
      }
      if (toRemove.length > 0) {
        await removeMemberFromGroups(memberId, toRemove)
      }

      toast({
        title: "Succes",
        description: `Grupurile au fost actualizate pentru ${memberName}`,
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la salvarea datelor",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addedCount = selectedGroupIds.filter((id) => !initialGroupIds.includes(id)).length
  const removedCount = initialGroupIds.filter((id) => !selectedGroupIds.includes(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editează Grupuri WhatsApp</DialogTitle>
          <DialogDescription>Selectează grupurile pentru {memberName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <Command className="border rounded-lg">
            <CommandInput placeholder="Caută grupuri..." />
            <CommandList>
              <CommandEmpty>Nu s-au găsit grupuri</CommandEmpty>
              <CommandGroup>
                {activeGroups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id)
                  return (
                    <CommandItem
                      key={group.id}
                      value={group.name}
                      onSelect={() => toggleGroup(group.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{group.name}</p>
                          {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>

          {hasChanges && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">Modificări:</p>
              <div className="flex flex-wrap gap-2">
                {addedCount > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    +{addedCount} adăugat{addedCount > 1 ? "e" : ""}
                  </Badge>
                )}
                {removedCount > 0 && (
                  <Badge variant="default" className="bg-red-500">
                    -{removedCount} eliminat{removedCount > 1 ? "e" : ""}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Anulează
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Se salvează..." : "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
