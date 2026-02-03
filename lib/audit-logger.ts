import type { AuditLog, AuditActionType, AuditModule, User } from "@/types"
import { createBrowserClient } from "@/lib/supabase/client"

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
      const browserInfo = getBrowserInfo()
      const supabase = createBrowserClient()

      // Mask sensitive data in metadata
      const safeMetadata = params.metadata ? maskSensitiveData(params.metadata) : undefined

      const auditLog = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        actor_user_id: params.user?.id || "anonymous",
        actor_name: params.user ? `${params.user.firstName} ${params.user.lastName}` : "Anonymous",
        actor_role: params.user?.role || "viewer",
        action_type: params.actionType,
        module: params.module,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_code: params.entityCode,
        summary: params.summary,
        metadata: safeMetadata,
        user_agent: browserInfo.userAgent,
        request_id: this.generateRequestId(),
        is_error: params.isError || false,
      }

      const { error } = await supabase.from("audit_logs").insert(auditLog)

      if (error) {
        console.warn("Failed to insert audit log:", error)
      }
    } catch (error) {
      console.warn("Failed to write audit log:", error)
    }
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit)

      if (error) {
        console.warn("Failed to fetch audit logs:", error)
        return []
      }

      return (data || []).map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        actorUserId: row.actor_user_id,
        actorName: row.actor_name,
        actorRole: row.actor_role,
        actionType: row.action_type,
        module: row.module,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityCode: row.entity_code,
        summary: row.summary,
        metadata: row.metadata,
        userAgent: row.user_agent,
        requestId: row.request_id,
        isError: row.is_error,
      }))
    } catch {
      return []
    }
  }

  static async clearLogs(): Promise<void> {
    // Only admins can clear logs - this would be done via Supabase dashboard
    console.warn("Audit log clearing should be done via Supabase dashboard")
  }

  static async exportLogs(): Promise<AuditLog[]> {
    return this.getLogs(10000)
  }
}
