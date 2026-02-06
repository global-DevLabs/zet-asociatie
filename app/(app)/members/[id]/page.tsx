import { ProtectedRoute } from "@/components/layout/protected-route"
import { MemberDetailClient } from "./member-detail-client"

export function generateStaticParams() {
  return [{ id: "new" }, { id: "_" }]
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ProtectedRoute>
      <MemberDetailClient id={id} />
    </ProtectedRoute>
  )
}
