import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ActivityEditNotFound() {
  return (
    <PageContainer title="Activitate negăsită" description="">
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Activitatea nu a fost găsită</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Activitatea pe care încercați să o editați nu există sau a fost ștearsă.
        </p>
        <Button asChild>
          <Link href="/activities">Înapoi la Activități</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
