import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function GroupNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Grupul nu a fost găsit</p>
      <Button asChild>
        <Link href="/groups">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la grupuri
        </Link>
      </Button>
    </div>
  )
}
