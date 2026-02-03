"use client"

import { useState, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useAuditLogs } from "@/lib/audit-log-store"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, Search, X, Eye, RefreshCw } from "lucide-react"
import { format as formatDate } from "date-fns"

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuditLogPageContent />
    </Suspense>
  )
}

function AuditLogPageContent() {
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const { logs, refreshLogs, exportLogs } = useAuditLogs()

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    userId: "",
    actionType: "",
    module: "",
    entityCode: "",
    onlyErrors: false,
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLog, setSelectedLog] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date range
      if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) return false
      if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo + "T23:59:59")) return false

      // User filter
      if (filters.userId && log.actorUserId !== filters.userId) return false

      // Action type filter
      if (filters.actionType && log.actionType !== filters.actionType) return false

      // Module filter
      if (filters.module && log.module !== filters.module) return false

      // Entity code filter
      if (filters.entityCode && !log.entityCode?.toLowerCase().includes(filters.entityCode.toLowerCase())) return false

      // Only errors filter
      if (filters.onlyErrors && !log.isError) return false

      // Search query (searches in summary, entity code, actor name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSummary = log.summary.toLowerCase().includes(query)
        const matchesEntityCode = log.entityCode?.toLowerCase().includes(query)
        const matchesActorName = log.actorName.toLowerCase().includes(query)
        if (!matchesSummary && !matchesEntityCode && !matchesActorName) return false
      }

      return true
    })
  }, [logs, filters, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    const users = new Map()
    logs.forEach((log) => {
      if (!users.has(log.actorUserId)) {
        users.set(log.actorUserId, log.actorName)
      }
    })
    return Array.from(users.entries())
  }, [logs])

  const uniqueActionTypes = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.actionType))).sort()
  }, [logs])

  const uniqueModules = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.module))).sort()
  }, [logs])

  const handleExport = () => {
    const csvHeaders = ["Timestamp", "User", "Role", "Action", "Module", "Entity Code", "Summary", "Is Error"]

    const csvRows = filteredLogs.map((log) => [
      formatDate(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss"),
      log.actorName,
      log.actorRole,
      log.actionType,
      log.module,
      log.entityCode || "",
      `"${log.summary.replace(/"/g, '""')}"`,
      log.isError ? "Yes" : "No",
    ])

    const csvContent = [csvHeaders.join(";"), ...csvRows.map((row) => row.join(";"))].join("\n")

    // Add BOM for Excel UTF-8
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-log-${formatDate(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      userId: "",
      actionType: "",
      module: "",
      entityCode: "",
      onlyErrors: false,
    })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const getActionBadgeColor = (actionType) => {
    if (actionType.includes("CREATE")) return "default"
    if (actionType.includes("UPDATE")) return "secondary"
    if (actionType.includes("DELETE")) return "destructive"
    if (actionType.includes("LOGIN")) return "default"
    if (actionType.includes("EXPORT")) return "outline"
    if (actionType.includes("IMPORT")) return "outline"
    return "secondary"
  }

  if (!hasPermission("settings")) {
    router.push("/")
    return null
  }

  return (
    <PageContainer
      title="Activity Monitor"
      description="Audit log pentru toate acțiunile utilizatorilor"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="dateFrom" className="text-xs">
              De la data
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="dateTo" className="text-xs">
              Până la data
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="userId" className="text-xs">
              Utilizator
            </Label>
            <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Toți" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toți</SelectItem>
                {uniqueUsers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="actionType" className="text-xs">
              Tip acțiune
            </Label>
            <Select value={filters.actionType} onValueChange={(value) => setFilters({ ...filters, actionType: value })}>
              <SelectTrigger id="actionType">
                <SelectValue placeholder="Toate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {uniqueActionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="module" className="text-xs">
              Modul
            </Label>
            <Select value={filters.module} onValueChange={(value) => setFilters({ ...filters, module: value })}>
              <SelectTrigger id="module">
                <SelectValue placeholder="Toate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {uniqueModules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="entityCode" className="text-xs">
              Cod entitate
            </Label>
            <Input
              id="entityCode"
              placeholder="MEM-####, ACT-####, PAY-####"
              value={filters.entityCode}
              onChange={(e) => setFilters({ ...filters, entityCode: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="search" className="text-xs">
              Caută în descriere
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Caută..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant={filters.onlyErrors ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters({ ...filters, onlyErrors: !filters.onlyErrors })}
            >
              Doar erori
            </Button>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredLogs.length} rezultate din {logs.length} total
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead>Utilizator</TableHead>
              <TableHead>Acțiune</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Entitate</TableHead>
              <TableHead>Descriere</TableHead>
              <TableHead className="w-[80px]">Detalii</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nu există log-uri pentru criteriile selectate
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id} className={log.isError ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.actorName}</div>
                    <div className="text-xs text-muted-foreground">{log.actorRole}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeColor(log.actionType)}>{log.actionType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.module}</Badge>
                  </TableCell>
                  <TableCell>{log.entityCode && <div className="font-mono text-sm">{log.entityCode}</div>}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm truncate">{log.summary}</div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Pagina {currentPage} din {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Precedent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Următor
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalii Audit Log</DialogTitle>
            <DialogDescription>Informații complete despre acțiune</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <div className="font-mono text-sm">
                    {formatDate(new Date(selectedLog.timestamp), "dd.MM.yyyy HH:mm:ss")}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Request ID</Label>
                  <div className="font-mono text-sm">{selectedLog.requestId || "N/A"}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Utilizator</Label>
                  <div className="text-sm">
                    {selectedLog.actorName} ({selectedLog.actorRole})
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Acțiune</Label>
                  <div>
                    <Badge variant={getActionBadgeColor(selectedLog.actionType)}>{selectedLog.actionType}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Modul</Label>
                  <div>
                    <Badge variant="outline">{selectedLog.module}</Badge>
                  </div>
                </div>
                {selectedLog.entityCode && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cod entitate</Label>
                    <div className="font-mono text-sm">{selectedLog.entityCode}</div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Descriere</Label>
                <div className="text-sm mt-1">{selectedLog.summary}</div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Metadata (JSON)</Label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto mt-1">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-xs text-muted-foreground">User Agent</Label>
                  <div className="text-xs text-muted-foreground mt-1">{selectedLog.userAgent}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
