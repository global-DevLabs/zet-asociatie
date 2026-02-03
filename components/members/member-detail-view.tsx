"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
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
import { Trash2, Save, X, ArrowLeft } from "lucide-react"
import type { Member } from "@/types"
import { PersonalInfoTab } from "./tabs/personal-info"
import { PaymentsTab } from "./tabs/payments"
import { ActivitiesTab } from "./tabs/activities"
import { NeedsTab } from "./tabs/needs"
import { ObservationsTab } from "./tabs/observations"
import { useRouter } from "next/navigation"
import { useMembers } from "@/lib/members-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface MemberDetailViewProps {
  member?: Member
}

export function MemberDetailView({ member }: MemberDetailViewProps) {
  const router = useRouter()
  const { createMember, updateMember, deleteMember } = useMembers()
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("personal")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isNew = !member

  const [formData, setFormData] = useState<Partial<Member>>(
    member ||
      ({
        firstName: "",
        lastName: "",
        rank: "",
        unit: "",
        mainProfile: "",
        dateOfBirth: "",
        payments: [],
        whatsappGroups: [],
        organizationInvolvement: "",
        magazineContributions: "",
        branchNeeds: "",
        foundationNeeds: "",
        otherNeeds: "",
        carMemberStatus: "",
        foundationMemberStatus: "",
        currentWorkplace: "",
        otherObservations: "",
      } as Partial<Member>),
  )

  useEffect(() => {
    if (member) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(member)
      setIsDirty(hasChanges)
    } else {
      // For new members, consider dirty if any field is filled
      const hasData = formData.firstName || formData.lastName || formData.rank || formData.unit
      setIsDirty(!!hasData)
    }
  }, [formData, member])

  const performSave = async (): Promise<boolean> => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      toast({
        title: "Eroare",
        description: "Nume și prenume sunt obligatorii",
        variant: "destructive",
      })
      return false
    }

    setIsSaving(true)

    try {
      if (isNew) {
        await createMember(formData as Omit<Member, "id" | "memberCode">)
      } else {
        updateMember(member.id, formData)
      }

      toast({
        title: "Succes",
        description: "Modificările au fost salvate.",
      })

      setIsDirty(false)
      return true
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare la salvarea datelor",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndStay = async () => {
    await performSave()
    // No redirect - stays on the same page
  }

  const handleSaveAndReturn = async () => {
    const success = await performSave()
    if (success) {
      router.push("/members")
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedDialog(true)
    } else {
      router.push("/members")
    }
  }

  const handleBack = () => {
    if (isDirty) {
      setShowUnsavedDialog(true)
    } else {
      router.push("/members")
    }
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    router.push("/members")
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      deleteMember(member!.id)
      toast({
        title: "Membru șters",
        description: "Membrul a fost șters cu succes",
      })
      setShowDeleteDialog(false)
      router.push("/members")
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut șterge membrul",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const canEdit = hasPermission("edit")
  const canDelete = hasPermission("delete")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi la Membri
        </Button>
      </div>

      {canEdit && (
        <div className="flex items-center justify-between gap-3 pb-4 border-b">
          <p className="text-sm text-muted-foreground">
            {isNew ? "Completați formularul pentru a adăuga un membru nou" : "Editați informațiile membrului"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" />
              Anulează
            </Button>
            {!isNew && canDelete && (
              <Button variant="destructive" size="default" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Șterge Membru
              </Button>
            )}
            <Button onClick={handleSaveAndReturn} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Se salvează..." : "Salvează și revino la listă"}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted/50 p-1 text-muted-foreground w-auto">
            <TabsTrigger
              value="personal"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Date Personale
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Cotizații
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Activități
            </TabsTrigger>
            <TabsTrigger
              value="needs"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Nevoi
            </TabsTrigger>
            <TabsTrigger
              value="observations"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Observații
            </TabsTrigger>
          </TabsList>
        </div>

        <div>
          <TabsContent value="personal" className="mt-0 space-y-4">
            <PersonalInfoTab formData={formData} setFormData={setFormData} readOnly={!canEdit} />
          </TabsContent>

          <TabsContent value="payments" className="mt-0 space-y-4">
            <PaymentsTab formData={formData} setFormData={setFormData} readOnly={!canEdit} />
          </TabsContent>

          <TabsContent value="activities" className="mt-0 space-y-4">
            <ActivitiesTab formData={formData} setFormData={setFormData} readOnly={!canEdit} />
          </TabsContent>

          <TabsContent value="needs" className="mt-0 space-y-4">
            <NeedsTab formData={formData} setFormData={setFormData} readOnly={!canEdit} />
          </TabsContent>

          <TabsContent value="observations" className="mt-0 space-y-4">
            <ObservationsTab formData={formData} setFormData={setFormData} readOnly={!canEdit} />
          </TabsContent>
        </div>
      </Tabs>

      {canEdit && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="mr-2 h-4 w-4" />
            Anulează
          </Button>
          <Button onClick={handleSaveAndStay} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Se salvează..." : "Salvează"}
          </Button>
        </div>
      )}

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modificări nesalvate</AlertDialogTitle>
            <AlertDialogDescription>
              Aveți modificări nesalvate. Sigur doriți să părăsiți pagina?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rămâi pe pagină</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveWithoutSaving}>Părăsește fără salvare</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !isDeleting && setShowDeleteDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge Membru</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur doriți să ștergeți membrul {member?.firstName} {member?.lastName}?
              <br />
              <br />
              <strong>Această acțiune este permanentă și nu poate fi anulată.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Se șterge..." : "Șterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
