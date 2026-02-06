"use client"

import { useEffect, useState } from "react"
import { notFound, useRouter } from "next/navigation"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, MapPin, Users, FileText, Edit, UserPlus, Download, Upload } from "lucide-react"
import { useActivities } from "@/lib/activities-store"
import { useMembers } from "@/lib/members-store"
import { useAuth } from "@/lib/auth-context"
import { formatDate as formatDateFns } from "date-fns"
import { ro } from "date-fns/locale"
import type { Activity } from "@/types"
import { ManageParticipantsModal } from "@/components/activities/manage-participants-modal"
import { ExportParticipantsModal } from "@/components/activities/export-participants-modal"
import { ImportParticipantsModal } from "@/components/activities/import-participants-modal"

export function ActivityDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { getActivityById, activityTypes, getParticipants } = useActivities()
  const { members } = useMembers()
  const { hasPermission } = useAuth()
  const [activity, setActivity] = useState<Activity | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const [showManageParticipants, setShowManageParticipants] = useState(false)
  const [showExportParticipants, setShowExportParticipants] = useState(false)
  const [showImportParticipants, setShowImportParticipants] = useState(false)
  const [participantsKey, setParticipantsKey] = useState(0)

  const canEdit = hasPermission("edit")

  useEffect(() => {
    const found = getActivityById(id)
    setActivity(found)
    setIsLoading(false)
  }, [id, getActivityById])

  if (!isLoading && !activity) {
    notFound()
  }

  if (isLoading || !activity) {
    return (
      <PageContainer title="Se încarcă..." description="">
        <div className="flex justify-center p-12">
          <p className="text-sm text-muted-foreground">Se încarcă activitatea...</p>
        </div>
      </PageContainer>
    )
  }

  const activityType = activityTypes.find((t) => t.id === activity.type_id)
  const participants = getParticipants(activity.id)

  const formatDate = (dateString: string) => {
    try {
      return formatDateFns(new Date(dateString), "dd MMMM yyyy", { locale: ro })
    } catch {
      return dateString
    }
  }

  const getParticipantName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return "Necunoscut"
    return `${member.rank || ""} ${member.lastName} ${member.firstName}`.trim()
  }

  return (
    <PageContainer
      title={activity.title || activityType?.name || "Activitate"}
      description={`Cod: ${activity.id}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/activities")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la Activități
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => router.push(`/activities/${activity.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Editează
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Detalii Activitate</CardTitle>
              <Badge variant="outline" className="font-normal">
                {activityType?.name || "—"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(activity.date_from)}
                    {activity.date_to && activity.date_to !== activity.date_from && (
                      <> — {formatDate(activity.date_to)}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Locație</p>
                  <p className="text-sm text-muted-foreground">{activity.location || "—"}</p>
                </div>
              </div>
            </div>
            {activity.notes && (
              <div className="flex gap-3 pt-2">
                <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Observații</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card key={participantsKey}>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participanți ({participants.length})
              </CardTitle>
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowImportParticipants(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportParticipants(true)}
                    disabled={participants.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => setShowManageParticipants(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Gestionează participanți
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nu există participanți înregistrați</p>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.member_id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      const returnTo = `/activities/${activity.id}`
                      const returnLabel = "Înapoi la Activitate"
                      router.push(
                        `/members/${participant.member_id}?returnTo=${encodeURIComponent(returnTo)}&returnLabel=${encodeURIComponent(returnLabel)}`,
                      )
                    }}
                  >
                    <span className="text-sm font-medium">{getParticipantName(participant.member_id)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {participant.status === "attended"
                        ? "Participant"
                        : participant.status === "organizer"
                          ? "Organizator"
                          : "Invitat"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showManageParticipants && (
        <ManageParticipantsModal
          open={showManageParticipants}
          onClose={() => {
            setShowManageParticipants(false)
            setParticipantsKey((k) => k + 1)
          }}
          activityId={activity.id}
          activityTitle={activity.title || activityType?.name || activity.id}
        />
      )}

      {showExportParticipants && (
        <ExportParticipantsModal
          open={showExportParticipants}
          onClose={() => setShowExportParticipants(false)}
          activity={activity}
          activityType={activityType}
        />
      )}

      {showImportParticipants && (
        <ImportParticipantsModal
          open={showImportParticipants}
          onClose={() => {
            setShowImportParticipants(false)
            setParticipantsKey((k) => k + 1)
          }}
          activityId={activity.id}
          activityTitle={activity.title || activityType?.name || activity.id}
        />
      )}
    </PageContainer>
  )
}
