"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageContainer } from "@/components/layout/page-container"
import { MemberDetailView } from "@/components/members/member-detail-view"
import { useMembers } from "@/lib/members-store"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function MemberDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { members, getMember } = useMembers()
  const [member, setMember] = useState<any>(null)
  const [isChecked, setIsChecked] = useState(false)

  const returnTo = searchParams.get("returnTo")
  const returnLabel = searchParams.get("returnLabel") || "Înapoi"

  useEffect(() => {
    setIsChecked(false)
    setMember(null)
  }, [id])

  useEffect(() => {
    if (id === "new") {
      setIsChecked(true)
      return
    }
    if (members.length > 0) {
      const foundMember = getMember(id)
      setMember(foundMember)
      setIsChecked(true)
    }
  }, [id, members, getMember])

  if (id === "new") {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <PageContainer title="Adaugă Membru Nou" description="Completează datele pentru a înregistra un nou membru">
          <MemberDetailView />
        </PageContainer>
      </div>
    )
  }

  if (!isChecked) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <PageContainer title="Se încarcă..." description="Vă rugăm așteptați">
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Se încarcă detaliile membrului...</p>
            </div>
          </div>
        </PageContainer>
      </div>
    )
  }

  if (!member) notFound()

  const backButton = returnTo ? (
    <Button variant="outline" size="sm" onClick={() => router.push(returnTo)}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {returnLabel}
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={() => router.push("/members")}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Înapoi la Membri
    </Button>
  )

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <PageContainer
        title={`Detalii Membru: ${member.lastName} ${member.firstName}`}
        description={`ID: ${member.id} • ${member.rank}`}
        actions={backButton}
      >
        <MemberDetailView member={member} />
      </PageContainer>
    </div>
  )
}
