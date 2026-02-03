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
import { useMembers } from "@/lib/members-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useToast } from "@/hooks/use-toast"
import { MemberMultiSelect } from "@/components/ui/member-multi-select"

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  existingMemberIds: string[]
}

export function AddMemberModal({ isOpen, onClose, groupId, existingMemberIds }: AddMemberModalProps) {
  const { members } = useMembers()
  const { bulkAddMembersToGroup } = useMemberGroups()
  const { toast } = useToast()
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAdd = async () => {
    if (selectedMemberIds.length === 0) {
      toast({
        title: "Eroare",
        description: "Selectează cel puțin un membru",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      await bulkAddMembersToGroup(groupId, selectedMemberIds, "append")

      toast({
        title: "Succes",
        description: `${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "membru adăugat" : "membri adăugați"} în grup`,
      })

      handleClose()
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu am putut adăuga membrii. Te rugăm să încerci din nou.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setSelectedMemberIds([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adaugă membri în grup</DialogTitle>
          <DialogDescription>
            Caută și selectează membrii pe care vrei să-i adaugi în acest grup WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <MemberMultiSelect
            members={members}
            selectedMemberIds={selectedMemberIds}
            onSelectionChange={setSelectedMemberIds}
            excludeMemberIds={existingMemberIds}
            placeholder="Caută membri după cod, nume, grad sau UM..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Anulează
          </Button>
          <Button onClick={handleAdd} disabled={selectedMemberIds.length === 0 || isProcessing}>
            {isProcessing
              ? "Se adaugă..."
              : `Adaugă ${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "membru" : "membri"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
