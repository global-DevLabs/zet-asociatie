import { ActivityEditClient } from "./activity-edit-client"

export function generateStaticParams() {
  return [{ id: "_" }]
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActivityEditClient id={id} />
}
