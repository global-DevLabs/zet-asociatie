"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"

interface BackButtonProps {
  fallbackHref?: string
  label?: string
}

export function BackButton({ fallbackHref, label = "Înapoi" }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // Check if there's history to go back to
    setCanGoBack(window.history.length > 1)
  }, [pathname])

  const handleBack = () => {
    if (canGoBack) {
      router.back()
    } else if (fallbackHref) {
      router.push(fallbackHref)
    } else {
      // Fallback: go to parent route
      const segments = pathname.split("/").filter(Boolean)
      if (segments.length > 1) {
        segments.pop()
        router.push(`/${segments.join("/")}`)
      } else {
        router.push("/")
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  )
}
