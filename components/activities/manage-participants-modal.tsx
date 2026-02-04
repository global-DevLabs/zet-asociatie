"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useActivities } from "@/lib/activities-store"
import { useMembers } from "@/lib/members-store"
import { useToast } from "@/hooks/use-toast"
import { Search, UserPlus, Trash2, Loader2 } from "lucide-react"
import { MemberMultiSelect } from "@/components/ui/member-multi-select"
import { displayMemberCode } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ManageParticipantsModalProps {
  open: boolean
  onClose: () => void
  activityId: string
  activityTitle: string
}

export function ManageParticipantsModal({ open, onClose, activityId, activityTitle }: ManageParticipantsModalProps) {
  const { getParticipants, addParticipants, updateParticipant, removeParticipant } = useActivities()
  const { members } = useMembers()
  const { toast } = useToast()

  // Memoize participants with content-based comparison to prevent unnecessary re-renders
  // We need to get fresh data on every render, then compare to see if it actually changed
  const rawParticipants = getParticipants(activityId)
  const participantsRef = useRef<typeof rawParticipants>([])
  
  // Create a stable key from the participants for comparison
  const participantsKey = useMemo(() => {
    return rawParticipants
      .map(p => `${p.member_id}:${p.status}`)
      .sort()
      .join('|')
  }, [rawParticipants])
  
  // Only update the stable reference when the key changes
  const participants = useMemo(() => {
    participantsRef.current = rawParticipants
    return participantsRef.current
  }, [participantsKey, rawParticipants])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [updatingParticipant, setUpdatingParticipant] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("")
      setSelectedMembers([])
    }
  }, [open])

  const getMemberName = useCallback((memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return "Necunoscut"
    return `${displayMemberCode(member.memberCode)} - ${member.rank || ""} ${member.lastName} ${member.firstName}`.trim()
  }, [members])

  const filteredParticipants = useMemo(() => {
    if (!debouncedSearch.trim()) return participants
    return participants.filter((p) => {
      const name = getMemberName(p.member_id).toLowerCase()
      return name.includes(debouncedSearch.toLowerCase())
    })
  }, [participants, debouncedSearch, getMemberName])

  const handleAddParticipants = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Niciun participant selectat",
        description: "Selectează cel puțin un membru pentru a adăuga",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)
    try {
      const count = selectedMembers.length
      await addParticipants(activityId, selectedMembers)
      setSelectedMembers([])
      toast({
        title: "Participanți adăugați",
        description: `${count} ${count === 1 ? "participant adăugat" : "participanți adăugați"} cu succes`,
      })
    } catch (error) {
      console.error("Error adding participants:", error)
      toast({
        title: "Eroare la adăugare",
        description: error instanceof Error ? error.message : "Nu s-au putut adăuga participanții",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveClick = (memberId: string) => {
    setMemberToRemove(memberId)
    setRemoveConfirmOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      await removeParticipant(activityId, memberToRemove)
      toast({
        title: "Participant eliminat",
        description: "Participantul a fost eliminat din activitate",
      })
      setRemoveConfirmOpen(false)
      setMemberToRemove(null)
    } catch (error) {
      console.error("Error removing participant:", error)
      toast({
        title: "Eroare la eliminare",
        description: error instanceof Error ? error.message : "Nu s-a putut elimina participantul",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const handleStatusChange = async (memberId: string, currentStatus: string) => {
    // Cycle through statuses: attended -> organizer -> invited -> attended
    const statusCycle: Record<string, string> = {
      attended: "organizer",
      organizer: "invited",
      invited: "attended",
    }
    const newStatus = statusCycle[currentStatus] || "attended"

    setUpdatingParticipant(memberId)
    try {
      await updateParticipant(activityId, memberId, { status: newStatus as any })
      toast({
        title: "Status actualizat",
        description: `Statusul participantului a fost schimbat în ${
          newStatus === "attended" ? "Participant" : newStatus === "organizer" ? "Organizator" : "Invitat"
        }`,
      })
    } catch (error) {
      console.error("Error updating participant status:", error)
      toast({
        title: "Eroare la actualizare",
        description: error instanceof Error ? error.message : "Nu s-a putut actualiza statusul",
        variant: "destructive",
      })
    } finally {
      setUpdatingParticipant(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestionează Participanți</DialogTitle>
            <DialogDescription>{activityTitle}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-6 py-4">
            {/* Add Participants Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Adaugă Participanți</h3>
                <Badge variant="secondary">{selectedMembers.length} selectați</Badge>
              </div>
              <MemberMultiSelect
                members={members}
                selectedMemberIds={selectedMembers}
                onSelectionChange={setSelectedMembers}
                placeholder="Caută după cod membru, nume, grad sau UM..."
                excludeMemberIds={participants.map((p) => p.member_id)}
              />
              <Button onClick={handleAddParticipants} disabled={selectedMembers.length === 0 || isAdding} className="w-full">
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isAdding ? "Se adaugă..." : `Adaugă${selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ""}`}
              </Button>
            </div>

            {/* Current Participants Section */}
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Participanți Actuali ({participants.length})</h3>
              </div>

              {participants.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Caută în listă..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto border rounded-lg">
                {filteredParticipants.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {participants.length === 0 ? "Nu există participanți" : "Niciun rezultat"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.member_id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getMemberName(participant.member_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            Adăugat: {new Date(participant.created_at).toLocaleDateString("ro-RO")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => handleStatusChange(participant.member_id, participant.status)}
                            title="Click pentru a schimba statusul"
                          >
                            {updatingParticipant === participant.member_id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {participant.status === "attended"
                              ? "Participant"
                              : participant.status === "organizer"
                                ? "Organizator"
                                : "Invitat"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveClick(participant.member_id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimină participantul?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va elimina participantul din activitate. Poți să-l adaugi din nou mai târziu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemoveConfirmOpen(false)}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm} disabled={isRemoving}>
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se elimină...
                </>
              ) : (
                "Elimină"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
