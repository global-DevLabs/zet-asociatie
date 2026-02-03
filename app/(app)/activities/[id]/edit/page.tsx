"use client"

import { use, useEffect, useState } from "react"
import { notFound, useRouter } from "next/navigation"

export const dynamic = 'force-dynamic'
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import { useActivities } from "@/lib/activities-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { Activity } from "@/types"

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

function ActivityEditContent({ id }: { id: string }) {
  const router = useRouter()
  const { getActivityById, updateActivity, activityTypes } = useActivities()
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [activity, setActivity] = useState<Activity | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const canEdit = hasPermission("edit")

  const [formData, setFormData] = useState({
    type_id: "",
    title: "",
    date_from: "",
    date_to: "",
    location: "",
    notes: "",
  })

  // Fetch activity on mount
  useEffect(() => {
    const fetchActivity = () => {
      const found = getActivityById(id)
      setActivity(found)
      if (found) {
        setFormData({
          type_id: found.type_id,
          title: found.title || "",
          date_from: found.date_from,
          date_to: found.date_to || "",
          location: found.location || "",
          notes: found.notes || "",
        })
      }
      setIsLoading(false)
    }

    fetchActivity()
  }, [id, getActivityById])

  // Redirect if no edit permission
  useEffect(() => {
    if (!canEdit && !isLoading) {
      toast({
        title: "Acces interzis",
        description: "Nu aveți permisiunea de a edita activități",
        variant: "destructive",
      })
      router.push(`/activities/${id}`)
    }
  }, [canEdit, isLoading, id, router, toast])

  // Show not found if activity doesn't exist
  if (!isLoading && !activity) {
    notFound()
  }

  // Show loading state
  if (isLoading || !activity) {
    return (
      <PageContainer title="Se încarcă..." description="">
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">Se încarcă activitatea...</p>
        </div>
      </PageContainer>
    )
  }

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
      await updateActivity(id, formData)
      toast({
        title: "Succes",
        description: "Activitatea a fost actualizată",
      })
      router.push(`/activities/${id}`)
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

  const handleCancel = () => {
    router.push(`/activities/${id}`)
  }

  return (
    <PageContainer
      title="Editează Activitate"
      description={`Cod: ${activity.id}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/activities")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la Activități
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Detalii Activitate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="type">
                Tip Activitate <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type_id} onValueChange={(value) => setFormData({ ...formData, type_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează tipul" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes
                    .filter((t) => t.is_active)
                    .map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="date_from">
                  Data începere <span className="text-red-500">*</span>
                </Label>
                <DatePickerInput
                  value={formData.date_from}
                  onChange={(value) => setFormData({ ...formData, date_from: value })}
                  placeholder="dd.mm.yyyy"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date_to">Data încheiere (opțional)</Label>
                <DatePickerInput
                  value={formData.date_to}
                  onChange={(value) => setFormData({ ...formData, date_to: value })}
                  placeholder="dd.mm.yyyy"
                />
              </div>
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
                rows={4}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Anulează
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Se salvează..." : "Salvează modificările"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function ActivityEditPage({ params }: PageProps) {
  let id: string
  try {
    if (params && typeof params === "object" && "then" in params) {
      const resolvedParams = use(params as Promise<{ id: string }>)
      id = resolvedParams.id
    } else {
      id = (params as { id: string }).id
    }
  } catch (error) {
    console.error("Error unwrapping params:", error)
    notFound()
  }

  return <ActivityEditContent id={id} />
}
