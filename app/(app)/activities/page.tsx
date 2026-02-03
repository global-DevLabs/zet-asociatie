"use client"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export const dynamic = 'force-dynamic'
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ListSorter, type SortOption } from "@/components/ui/list-sorter"
import { Plus, Filter, Download, Upload, ChevronDown, Archive } from "lucide-react"
import { ActivitiesTable } from "@/components/activities/activities-table"
import { ActivityFormModal } from "@/components/activities/activity-form-modal"
import { ActivitiesFilters } from "@/components/activities/activities-filters"
import { ExportModal } from "@/components/activities/export-modal"
import { ImportModal } from "@/components/activities/import-modal"
import { useActivities } from "@/lib/activities-store"
import { useMembers } from "@/lib/members-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { Activity } from "@/types"

const SORT_OPTIONS: SortOption[] = [
  { value: "date_from", label: "Data început" },
  { value: "title", label: "Titlu" },
  { value: "type", label: "Tip activitate" },
  { value: "participants_count", label: "Număr participanți" },
  { value: "id", label: "Cod activitate" },
]

function sortActivities(
  activities: Activity[],
  activityTypes: any[],
  sortBy: string,
  sortDir: "asc" | "desc",
): Activity[] {
  const sorted = [...activities].sort((a, b) => {
    let compareResult = 0

    // Primary sort
    switch (sortBy) {
      case "date_from":
        compareResult = a.date_from.localeCompare(b.date_from)
        break
      case "title":
        compareResult = (a.title || "").localeCompare(b.title || "", "ro")
        break
      case "type": {
        const typeA = activityTypes.find((t) => t.id === a.type_id)?.name || ""
        const typeB = activityTypes.find((t) => t.id === b.type_id)?.name || ""
        compareResult = typeA.localeCompare(typeB, "ro")
        break
      }
      case "participants_count":
        compareResult = (a.participants_count || 0) - (b.participants_count || 0)
        break
      case "id":
        compareResult = a.id.localeCompare(b.id)
        break
    }

    if (sortDir === "desc") compareResult *= -1

    if (compareResult === 0 && sortBy !== "date_from") {
      compareResult = b.date_from.localeCompare(a.date_from)
    }
    if (compareResult === 0) {
      compareResult = b.id.localeCompare(a.id)
    }

    return compareResult
  })

  return sorted
}

export default function ActivitiesPage() {
  const { activities, activityTypes, createActivity, getParticipants, refreshActivities } = useActivities()
  const { members } = useMembers()
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [showFormModal, setShowFormModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const [filters, setFilters] = useState({
    typeIds: [] as string[],
    dateFrom: "",
    dateTo: "",
  })

  const urlSort = searchParams.get("sort")
  const urlDir = searchParams.get("dir") as "asc" | "desc" | null

  const [sortBy, setSortBy] = useState<string>(urlSort || "date_from")
  const [sortDir, setSortDir] = useState<"asc" | "desc">(urlDir || "desc")

  const handleSortChange = (newSort: string, newDir: "asc" | "desc") => {
    setSortBy(newSort)
    setSortDir(newDir)

    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", newSort)
    params.set("dir", newDir)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const canEdit = hasPermission("edit")

  const filteredActivities = activities.filter((activity) => {
    if (!showArchived && activity.status === "archived") {
      return false
    }
    if (filters.typeIds.length > 0 && !filters.typeIds.includes(activity.type_id)) {
      return false
    }
    if (filters.dateFrom && activity.date_from < filters.dateFrom) {
      return false
    }
    if (filters.dateTo && activity.date_from > filters.dateTo) {
      return false
    }
    return true
  })

  const sortedActivities = useMemo(() => {
    return sortActivities(filteredActivities, activityTypes, sortBy, sortDir)
  }, [filteredActivities, activityTypes, sortBy, sortDir])

  const getFilterDescription = () => {
    const parts: string[] = []

    if (filters.typeIds.length > 0) {
      const typeNames = filters.typeIds.map((id) => activityTypes.find((t) => t.id === id)?.name).filter(Boolean)
      if (typeNames.length > 0) {
        parts.push(typeNames.join("-"))
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom && filters.dateTo) {
        parts.push(`${filters.dateFrom}-${filters.dateTo}`)
      } else if (filters.dateFrom) {
        parts.push(`de-la-${filters.dateFrom}`)
      } else if (filters.dateTo) {
        parts.push(`pana-la-${filters.dateTo}`)
      }
    }

    return parts.join("-")
  }

  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setShowFilters(false)
  }

  const getTypeName = (typeId: string) => {
    return activityTypes.find((t) => t.id === typeId)?.name || "—"
  }

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    return member ? `${member.lastName} ${member.firstName}` : memberId
  }

  const getTypeIdByName = (name: string): string | undefined => {
    const normalized = name.trim().toLowerCase()
    return activityTypes.find((t) => t.name.toLowerCase() === normalized)?.id
  }

  const handleImport = async (importedActivities: any[]) => {
    try {
      for (const activityData of importedActivities) {
        await createActivity(activityData)
      }

      await refreshActivities()

      toast({
        title: "Import finalizat",
        description: `${importedActivities.length} activități au fost importate cu succes`,
      })
    } catch (error) {
      console.error("Failed to import activities:", error)
      toast({
        title: "Eroare import",
        description: "A apărut o eroare la salvarea activităților",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <PageContainer
      title="Activități"
      description="Gestionați activitățile și evenimente"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? "Doar active" : "Afișează arhivate"}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowFilters(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filtrează
            {(filters.typeIds.length > 0 || filters.dateFrom || filters.dateTo) && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {filters.typeIds.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={sortedActivities.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowExportModal(true)}>
                <Download className="mr-2 h-4 w-4" />
                Exportă activități
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>

              <Button size="sm" onClick={() => setShowFormModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adaugă Activitate
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {sortedActivities.length > 0 && (
          <div className="flex justify-end">
            <ListSorter options={SORT_OPTIONS} value={sortBy} direction={sortDir} onChange={handleSortChange} />
          </div>
        )}

        <ActivitiesTable activities={sortedActivities} />
      </div>

      {showFormModal && <ActivityFormModal open={showFormModal} onClose={() => setShowFormModal(false)} />}

      {showFilters && (
        <ActivitiesFilters
          open={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          activityTypes={activityTypes}
        />
      )}

      {showExportModal && (
        <ExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          activities={sortedActivities}
          filterDescription={getFilterDescription()}
          getParticipants={getParticipants}
          getTypeName={getTypeName}
          getMemberName={getMemberName}
        />
      )}

      {showImportModal && (
        <ImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          getTypeIdByName={getTypeIdByName}
        />
      )}
    </PageContainer>
  )
}
