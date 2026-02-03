"use client"

import { use, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Archive, Download, Upload, UserPlus, Trash2 } from "lucide-react"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useMembers } from "@/lib/members-store"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { exportGroupMembersToCSV } from "@/lib/group-import-export"
import { ImportMembersModal } from "@/components/groups/import-members-modal"
import { AddMemberModal } from "@/components/groups/add-member-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

function GroupDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { getGroupById, updateGroup } = useWhatsAppGroups()
  const { getGroupMembers, removeMemberFromGroup } = useMemberGroups()
  const { members } = useMembers()
  const { hasPermission } = useAuth()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)

  const group = getGroupById(id)
  const canEdit = hasPermission("edit")

  if (!group) {
    notFound()
  }

  const memberGroups = getGroupMembers(id)
  const groupMembers = memberGroups
    .map((mg) => {
      const member = members.find((m) => m.id === mg.member_id)
      return member ? { ...member, joinedAt: mg.joined_at } : null
    })
    .filter((m) => m !== null)

  const handleExport = () => {
    exportGroupMembersToCSV(groupMembers, group.name)
    toast({
      title: "Succes",
      description: "Membri exportați în CSV",
    })
  }

  const handleArchiveToggle = () => {
    updateGroup(id, {
      status: group.status === "Active" ? "Archived" : "Active",
    })
    toast({
      title: "Succes",
      description: `Grup ${group.status === "Active" ? "arhivat" : "reactivat"}`,
    })
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    await removeMemberFromGroup(memberToRemove, id)
    setMemberToRemove(null)
    toast({
      title: "Succes",
      description: "Membru eliminat din grup",
    })
  }

  return (
    <>
      <PageContainer
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/groups")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>{group.name}</span>
            {group.status === "Archived" && (
              <Badge variant="secondary">
                <Archive className="h-3 w-3 mr-1" />
                Arhivat
              </Badge>
            )}
          </div>
        }
        description={group.description || "Detalii grup"}
      >
        {/* Group Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
              {group.description && <p className="text-muted-foreground mb-4">{group.description}</p>}
              <div className="text-sm text-muted-foreground">
                <p>
                  {groupMembers.length} {groupMembers.length === 1 ? "membru" : "membri"}
                </p>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleArchiveToggle}>
                  <Archive className="h-4 w-4 mr-2" />
                  {group.status === "Active" ? "Arhivează" : "Reactivează"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Actions Bar */}
        <div className="flex gap-2 mb-6">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import membri
              </Button>
              <Button onClick={() => setIsAddMemberModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adaugă membru
              </Button>
            </>
          )}
        </div>

        {/* Members Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Nume</TableHead>
                <TableHead>Grad</TableHead>
                <TableHead>UM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Adăugat la</TableHead>
                {canEdit && <TableHead className="w-[100px]">Acțiuni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Niciun membru în acest grup
                  </TableCell>
                </TableRow>
              ) : (
                groupMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link href={`/members/${member.id}`} className="hover:underline font-mono text-sm">
                        {member.memberCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/members/${member.id}`} className="hover:underline">
                        {member.firstName} {member.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{member.rank}</TableCell>
                    <TableCell>{member.unit}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "Activ" ? "default" : "secondary"}>
                        {member.status || "Activ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("ro-RO") : "-"}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setMemberToRemove(member.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </PageContainer>

      {/* Import Modal */}
      <ImportMembersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        groupId={id}
        groupName={group.name}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        groupId={id}
        existingMemberIds={memberGroups.map((mg) => mg.member_id)}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimină membru din grup</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să elimini acest membru din grup? Această acțiune poate fi anulată adăugând din nou
              membrul.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>Elimină</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  let id: string
  try {
    const unwrapped = use(params)
    id = unwrapped.id
  } catch {
    id = (params as { id: string }).id
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Se încarcă...</div>}>
      <GroupDetailContent id={id} />
    </Suspense>
  )
}
