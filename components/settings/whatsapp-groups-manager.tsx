"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { WhatsAppGroup } from "@/types"

export function WhatsAppGroupsManager() {
  const { groups, createGroup, updateGroup, deleteGroup, getGroupMemberCount } = useWhatsAppGroups()
  const { getGroupMembers } = useMemberGroups()
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WhatsAppGroup | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "" })

  const getMemberCount = (groupId: string): number => {
    return getGroupMembers(groupId).length
  }

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast({ title: "Eroare", description: "Numele grupului este obligatoriu", variant: "destructive" })
      return
    }

    createGroup({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: "Active",
    })

    setFormData({ name: "", description: "" })
    setIsAddDialogOpen(false)
    toast({ title: "Succes", description: "Grupul WhatsApp a fost adăugat" })
  }

  const handleEdit = () => {
    if (!editingGroup || !formData.name.trim()) {
      toast({ title: "Eroare", description: "Numele grupului este obligatoriu", variant: "destructive" })
      return
    }

    updateGroup(editingGroup.id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    })

    setFormData({ name: "", description: "" })
    setEditingGroup(null)
    toast({ title: "Succes", description: "Grupul WhatsApp a fost actualizat" })
  }

  const handleToggleStatus = (group: WhatsAppGroup) => {
    const newStatus = group.status === "Active" ? "Archived" : "Active"
    updateGroup(group.id, { status: newStatus })
    toast({
      title: "Succes",
      description: `Grupul a fost ${newStatus === "Archived" ? "arhivat" : "reactivat"}`,
    })
  }

  const handleDelete = (group: WhatsAppGroup) => {
    const memberCount = getMemberCount(group.id)
    if (memberCount > 0) {
      toast({
        title: "Atenție",
        description: `Nu se poate șterge. ${memberCount} membr${memberCount > 1 ? "i sunt" : "u este"} în acest grup.`,
        variant: "destructive",
      })
      return
    }

    if (confirm(`Sigur doriți să ștergeți grupul "${group.name}"?`)) {
      deleteGroup(group.id)
      toast({ title: "Succes", description: "Grupul WhatsApp a fost șters" })
    }
  }

  const openEditDialog = (group: WhatsAppGroup) => {
    setEditingGroup(group)
    setFormData({ name: group.name, description: group.description || "" })
  }

  const closeEditDialog = () => {
    setEditingGroup(null)
    setFormData({ name: "", description: "" })
  }

  const activeGroups = groups.filter((g) => g.status === "Active")
  const archivedGroups = groups.filter((g) => g.status === "Archived")

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grupuri WhatsApp</CardTitle>
            <CardDescription className="mt-1.5">Gestionează grupurile WhatsApp pentru membri</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adaugă Grup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adaugă Grup WhatsApp</DialogTitle>
                <DialogDescription>Completează informațiile pentru noul grup</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume Grup *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Grup Sport"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere (opțional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descriere scurtă a grupului..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Anulează
                </Button>
                <Button onClick={handleAdd}>Adaugă</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Grupuri Active</h3>
            <div className="space-y-2">
              {activeGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nu există grupuri active</p>
              ) : (
                activeGroups.map((group) => {
                  const memberCount = getMemberCount(group.id)
                  return (
                    <div
                      key={group.id}
                      className="flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{group.name}</p>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Activ
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {memberCount} membr{memberCount !== 1 ? "i" : "u"}
                          </Badge>
                        </div>
                        {group.description && <p className="text-sm text-muted-foreground mt-1">{group.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(group)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleStatus(group)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {archivedGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Grupuri Arhivate</h3>
              <div className="space-y-2">
                {archivedGroups.map((group) => {
                  const memberCount = getMemberCount(group.id)
                  return (
                    <div
                      key={group.id}
                      className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-muted-foreground">{group.name}</p>
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            Arhivat
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {memberCount} membr{memberCount !== 1 ? "i" : "u"}
                          </Badge>
                        </div>
                        {group.description && <p className="text-sm text-muted-foreground mt-1">{group.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleStatus(group)}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <Dialog open={!!editingGroup} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editează Grup WhatsApp</DialogTitle>
              <DialogDescription>Modifică informațiile grupului</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nume Grup *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Grup Sport"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descriere (opțional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descriere scurtă a grupului..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Anulează
              </Button>
              <Button onClick={handleEdit}>Salvează</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
