import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function ActivityNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-muted p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Activitatea nu a fost găsită</h2>
        <p className="text-sm text-muted-foreground">Activitatea pe care o căutați nu există sau a fost ștearsă.</p>
      </div>
      <Link href="/activities">
        <Button>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi la Activități
        </Button>
      </Link>
    </div>
  )
}
