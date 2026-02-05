import type { AuditLog, AuditActionType, AuditModule, User } from "@/types"

// Get browser info safely
function getBrowserInfo() {
  if (typeof window === "undefined") return {}
  return {
    userAgent: navigator.userAgent,
  }
}

// Mask sensitive data (PII)
function maskSensitiveData(data: any): any {
  if (typeof data !== "object" || data === null) return data

  const masked = { ...data }

  // Mask CNP (keep last 3 digits)
  if (masked.cnp && typeof masked.cnp === "string") {
    masked.cnp = "***" + masked.cnp.slice(-3)
  }

  // Mask phone (keep last 3 digits)
  if (masked.phone && typeof masked.phone === "string") {
    masked.phone = "***" + masked.phone.slice(-3)
  }

  // Mask email (keep domain)
  if (masked.email && typeof masked.email === "string") {
    const [, domain] = masked.email.split("@")
    masked.email = "***@" + (domain || "***")
  }

  return masked
}

export class AuditLogger {
  private static generateId(): string {
    return `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private static generateRequestId(): string {
    return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  }

  static log(params: {
    user: User | null
    actionType: AuditActionType
    module: AuditModule
    summary: string
    entityType?: string
    entityId?: string
    entityCode?: string
    metadata?: Record<string, any>
    isError?: boolean
  }): void {
    // Don't block on logging failures - run async
    this.logAsync(params).catch((error) => {
      console.warn("Failed to write audit log:", error)
    })
  }

  private static async logAsync(params: {
    user: User | null
    actionType: AuditActionType
    module: AuditModule
    summary: string
    entityType?: string
    entityId?: string
    entityCode?: string
    metadata?: Record<string, any>
    isError?: boolean
  }): Promise<void> {
    try {
      // Mask sensitive data in metadata
      const safeMetadata = params.metadata ? maskSensitiveData(params.metadata) : undefined

      const payload = {
        actionType: params.actionType,
        module: params.module,
        summary: params.summary,
        metadata: safeMetadata,
        isError: params.isError || false,
        userId: params.user?.id || null,
      }

      const response = await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn("Failed to write audit log")
      }
    } catch (error) {
      console.warn("Failed to write audit log:", error)
    }
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const response = await fetch(`/api/audit-logs?limit=${limit}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        console.warn("Failed to fetch audit logs")
        return []
      }

      const data = await response.json()

      return (data.logs || []).map((row: any) => ({
        id: row.id,
        timestamp: row.created_at,
        actorUserId: row.user_id,
        actorName: row.summary,
        actorRole: "system",
        actionType: row.action_type,
        module: row.module,
        entityType: undefined,
        entityId: undefined,
        entityCode: undefined,
        summary: row.summary,
        metadata: row.metadata,
        userAgent: undefined,
        requestId: row.id,
        isError: row.is_error === 1,
      }))
    } catch {
      return []
    }
  }

  static async clearLogs(): Promise<void> {
    // Only admins can clear logs - this would be done via admin API
    console.warn("Audit log clearing should be done via admin panel")
  }

  static async exportLogs(): Promise<AuditLog[]> {
    return this.getLogs(10000)
  }
}
