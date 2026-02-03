import type React from "react"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/layout/back-button"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  actions?: React.ReactNode
  showBack?: boolean
  backFallback?: string
  showBreadcrumbs?: boolean
}

export function PageContainer({
  children,
  className,
  title,
  description,
  actions,
  showBack = false,
  backFallback,
  showBreadcrumbs = false,
}: PageContainerProps) {
  return (
    <div className={cn("flex-1 space-y-6 p-6 pt-5 lg:pl-72", className)}>
      {(showBack || showBreadcrumbs) && (
        <div className="flex items-center gap-4 -mb-2">
          {showBack && <BackButton fallbackHref={backFallback} />}
          {showBreadcrumbs && <Breadcrumbs />}
        </div>
      )}

      {(title || actions) && (
        <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 -mx-6 px-6 pb-5 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 pt-1">
            <div className="space-y-1.5">
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              {title === "Dashboard" && (
                <p className="text-xs text-muted-foreground/70 mt-1.5">Ultima actualizare: acum 5 min</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
