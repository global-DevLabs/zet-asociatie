"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Fragment } from "react"

const routeLabels: Record<string, string> = {
  members: "Membri",
  payments: "Cotizații",
  activities: "Activități",
  groups: "Grupuri",
  analytics: "Analiză & Grafice",
  settings: "Setări",
  "audit-log": "Activity Monitor",
  new: "Membru Nou",
  edit: "Editare",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const label =
      routeLabels[segment] ||
      (segment.startsWith("MBR-") || segment.startsWith("ACT-") || segment.startsWith("GRP-") ? "Detalii" : segment)
    const isLast = index === segments.length - 1

    return {
      label,
      href,
      isLast,
    }
  })

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
