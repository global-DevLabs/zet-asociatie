"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings,
  PieChart,
  LogOut,
  Menu,
  Calendar,
  Wallet,
  Plus,
  FileText,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useQuickCashin } from "@/lib/quick-cashin-context"

const coreNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, matchPrefix: "/" },
  { name: "Membri", href: "/members", icon: Users, matchPrefix: "/members" },
  { name: "Cotizații", href: "/payments", icon: Wallet, matchPrefix: "/payments" },
  { name: "Activități", href: "/activities", icon: Calendar, matchPrefix: "/activities" },
  { name: "Grupuri", href: "/groups", icon: MessageCircle, matchPrefix: "/groups" },
]

const insightsNavigation = [
  { name: "Analiză & Grafice", href: "/analytics", icon: PieChart, matchPrefix: "/analytics" },
]

const adminNavigation = [{ name: "Setări", href: "/settings", icon: Settings, matchPrefix: "/settings" }]

export function AppSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, logout, hasPermission } = useAuth()
  const { openModal } = useQuickCashin()

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "editor":
        return "Editor"
      case "viewer":
        return "Vizualizare"
      default:
        return role
    }
  }

  const isActive = (item: { href: string; matchPrefix: string }) => {
    // Special case for dashboard: exact match only
    if (item.href === "/") {
      return pathname === "/"
    }
    // For all other routes: match if pathname starts with the matchPrefix
    return pathname.startsWith(item.matchPrefix)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="h-14 flex items-center px-4 border-b border-sidebar-border/50">
            <div className="flex items-center gap-2.5 w-full">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <span className="text-sm font-bold tracking-tight">A</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Asociație</span>
                <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wide">
                  Admin Panel
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3 overflow-y-auto min-h-0">
            {/* SECTION 1: CORE - Highest priority navigation items */}
            <div className="space-y-0.5 mb-4">
              {coreNavigation.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            <div className="border-t border-sidebar-border/40 my-3" />

            {/* SECTION 2: INSIGHTS - Analytics and reporting */}
            <div className="space-y-0.5 mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">
                Insights
              </p>
              {insightsNavigation.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            <div className="border-t border-sidebar-border/40 my-3" />

            {/* SECTION 3: ADMIN - Configuration and audit */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">
                Admin
              </p>
              {adminNavigation.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground/80",
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {item.name}
                  </Link>
                )
              })}

              {hasPermission("settings") && (
                <Link
                  href="/audit-log"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                    pathname.startsWith("/audit-log")
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground/80",
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  Activity Monitor
                </Link>
              )}
            </div>
          </nav>

          {/* Bottom sticky section - Quick Action + User Profile */}
          <div className="sticky bottom-0 bg-sidebar mt-auto">
            {/* Quick Action */}
            <div className="px-3 pb-3 border-t border-sidebar-border/50">
              <div className="pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 mb-2">
                  Quick Action
                </p>
                <Button
                  onClick={() => {
                    openModal()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full justify-start gap-2.5 h-10 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-[16px] w-[16px]" strokeWidth={2} />
                  Încasează cotizație
                </Button>
              </div>
            </div>

            {/* User profile section */}
            <div className="p-3 border-t border-sidebar-border/50">
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/90 to-purple-500/90 flex items-center justify-center text-white border border-white/10 shadow-sm">
                  <span className="text-xs font-semibold">
                    {user?.firstName[0]}
                    {user?.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground/90 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 truncate">{user?.role && getRoleText(user.role)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/40 rounded-lg"
                  title="Deconectare"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </>
  )
}
