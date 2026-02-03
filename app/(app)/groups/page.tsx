"use client"

import { useState, Suspense } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Users, Archive } from "lucide-react"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function GroupsPageContent() {
  const { groups, isLoading, createGroup } = useWhatsAppGroups()
  const { getGroupMembers } = useMemberGroups()
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Archived">("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")

  const canEdit = hasPermission("edit")

  const filteredGroups = groups
    .filter((group) => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || group.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .map((group) => ({
      ...group,
      memberCount: getGroupMembers(group.id).length,
    }))

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Eroare",
        description: "Numele grupului este obligatoriu",
        variant: "destructive",
      })
      return
    }

    createGroup({
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || undefined,
      status: "Active",
    })

    toast({
      title: "Succes",
      description: `Grupul "${newGroupName}" a fost creat`,
    })

    setIsCreateModalOpen(false)
    setNewGroupName("")
    setNewGroupDescription("")
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Se încarcă...</div>
  }

  return (
    <>
      <PageContainer
        title="Grupuri WhatsApp"
        description="Gestionează grupurile și membrii lor"
        action={
          canEdit && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Grup nou
            </Button>
          )
        }
      >
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută grup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate grupurile</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Archived">Arhivate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Groups Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  {group.status === "Archived" && (
                    <Badge variant="secondary" className="ml-2">
                      <Archive className="h-3 w-3 mr-1" />
                      Arhivat
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  {group.memberCount} {group.memberCount === 1 ? "membru" : "membri"}
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nu au fost găsite grupuri</p>
          </div>
        )}
      </PageContainer>

      {/* Create Group Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grup nou</DialogTitle>
            <DialogDescription className="sr-only">Completează formularul pentru a crea un grup nou</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nume grup *</Label>
              <Input
                id="name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ex: Grup Sport"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descriere (opțional)</Label>
              <Textarea
                id="description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Scurtă descriere a grupului..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleCreateGroup}>Creează grup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Se încarcă...</div>}>
      <GroupsPageContent />
    </Suspense>
  )
}
