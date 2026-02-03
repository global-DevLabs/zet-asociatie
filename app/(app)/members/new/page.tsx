"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageContainer } from "@/components/layout/page-container"
import { MemberDetailView } from "@/components/members/member-detail-view"
import { ProtectedRoute } from "@/components/layout/protected-route"

function NewMemberPageContent() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <PageContainer title="Adaugă Membru Nou" description="Completează datele pentru a înregistra un nou membru">
        <MemberDetailView />
      </PageContainer>
    </div>
  )
}

export default function NewMemberPage() {
  return (
    <ProtectedRoute>
      <NewMemberPageContent />
    </ProtectedRoute>
  )
}
