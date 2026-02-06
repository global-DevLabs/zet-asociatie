import { Suspense } from "react"
import { GroupDetailClient } from "./group-detail-client"

export function generateStaticParams() {
  return [{ id: "_" }]
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<div className="flex justify-center h-64">Se încarcă...</div>}>
      <GroupDetailClient id={id} />
    </Suspense>
  )
}
