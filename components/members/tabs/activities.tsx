"use client"

import type { Member } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit3, ExternalLink } from "lucide-react"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store"
import { useActivities } from "@/lib/activities-store"
import { EditActivitiesModal } from "@/components/members/edit-activities-modal"
import { useState } from "react"
import { format } from "date-fns"
import { ro } from "date-fns/locale"
import Link from "next/link"

interface ActivitiesTabProps {
  formData: Partial<Member>
  setFormData: (data: Partial<Member>) => void
  readOnly?: boolean
}

export function ActivitiesTab({ formData, setFormData, readOnly = false }: ActivitiesTabProps) {
  const { getMemberGroups } = useMemberGroups()
  const { getGroupById } = useWhatsAppGroups()
  const { getMemberActivities, activityTypes } = useActivities()
  const [showActivitiesModal, setShowActivitiesModal] = useState(false)

  const memberId = formData.id || ""
  const memberName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim()

  // Get member's groups from join table
  const memberGroupships = getMemberGroups(memberId)
  const memberGroups = memberGroupships.map((mg) => getGroupById(mg.group_id)).filter((g) => g && g.status === "Active")

  // Get member's activities
  const allMemberActivities = getMemberActivities(memberId)
  const uniqueActivityIds = Array.from(new Set(allMemberActivities.map((a) => a.id)))
  const memberActivities = uniqueActivityIds
    .map((id) => allMemberActivities.find((a) => a.id === id))
    .filter((a) => a !== undefined)
    .slice(0, 10)

  const handleChange = (field: keyof Member, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Groups - READ ONLY */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Grupuri WhatsApp / Comunități</CardTitle>
            {memberId && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/groups">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Gestionează în Grupuri
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3 italic">
            Afișare doar citire. Pentru a adăuga sau elimina acest membru din grupuri, accesează secțiunea Grupuri.
          </p>
          {memberGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {memberGroups.map((group) => (
                <Badge key={group.id} variant="secondary" className="px-3 py-1.5 text-sm">
                  {group.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nu este membru în niciun grup WhatsApp</p>
          )}
        </CardContent>
      </Card>

      {/* Activities Participation */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Participare la Activități</CardTitle>
            {!readOnly && memberId && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowActivitiesModal(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Gestionează participarea
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {memberActivities.length > 0 ? (
            <div className="space-y-2">
              {memberActivities.map((activity) => {
                const activityType = activityTypes.find((t) => t.id === activity.type_id)
                const dateStr = format(new Date(activity.date_from), "dd MMM yyyy", { locale: ro })
                return (
                  <div key={activity.id} className="p-3 rounded-lg border bg-card">
                    <p className="text-sm font-medium">{activity.title || activityType?.name || activity.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateStr} • {activity.location || "Fără locație"}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nu participă la nicio activitate</p>
          )}
        </CardContent>
      </Card>

      {/* Text fields for involvement */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Activități și Preocupări</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Implicare în Organizație / Sucursală</Label>
            <Textarea
              value={formData.organizationInvolvement || ""}
              onChange={(e) => handleChange("organizationInvolvement", e.target.value)}
              placeholder="Descrieți implicarea membrului..."
              className="min-h-[120px] bg-background border-border"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Contribuții la revista "Vitralii – Lumini și Umbre"</Label>
            <Textarea
              value={formData.magazineContributions || ""}
              onChange={(e) => handleChange("magazineContributions", e.target.value)}
              placeholder="Articole, poezii, etc..."
              className="min-h-[120px] bg-background border-border"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Activities Modal */}
      {memberId && (
        <EditActivitiesModal
          open={showActivitiesModal}
          onOpenChange={setShowActivitiesModal}
          memberId={memberId}
          memberName={memberName}
        />
      )}
    </div>
  )
}
