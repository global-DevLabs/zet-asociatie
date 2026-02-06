import { ActivityDetailClient } from "./activity-detail-client"

export function generateStaticParams() {
  return [{ id: "_" }]
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActivityDetailClient id={id} />
}
