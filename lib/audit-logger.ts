import type { AuditLog, AuditActionType, AuditModule, User } from "@/types";

function getBrowserInfo() {
  if (typeof window === "undefined") return {};
  return { userAgent: navigator.userAgent };
}

function maskSensitiveData(data: any): any {
  if (typeof data !== "object" || data === null) return data;
  const masked = { ...data };
  if (masked.cnp && typeof masked.cnp === "string") {
    masked.cnp = "***" + masked.cnp.slice(-3);
  }
  if (masked.phone && typeof masked.phone === "string") {
    masked.phone = "***" + masked.phone.slice(-3);
  }
  if (masked.email && typeof masked.email === "string") {
    const [, domain] = masked.email.split("@");
    masked.email = "***@" + (domain || "***");
  }
  return masked;
}

export class AuditLogger {
  private static generateRequestId(): string {
    return `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  static log(params: {
    user: User | null;
    actionType: AuditActionType;
    module: AuditModule;
    summary: string;
    entityType?: string;
    entityId?: string;
    entityCode?: string;
    metadata?: Record<string, any>;
    isError?: boolean;
  }): void {
    this.logAsync(params).catch((err) => {
      console.warn("Failed to write audit log:", err);
    });
  }

  private static async logAsync(params: {
    user: User | null;
    actionType: AuditActionType;
    module: AuditModule;
    summary: string;
    entityType?: string;
    entityId?: string;
    entityCode?: string;
    metadata?: Record<string, any>;
    isError?: boolean;
  }): Promise<void> {
    try {
      const browserInfo = getBrowserInfo();
      const safeMetadata = params.metadata ? maskSensitiveData(params.metadata) : undefined;
      const body = {
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
      };
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn("Failed to write audit log:", err);
    }
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const res = await fetch(`/api/audit-logs?limit=${limit}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static async clearLogs(): Promise<void> {
    console.warn("Audit log clearing not implemented for local DB");
  }

  static async exportLogs(): Promise<AuditLog[]> {
    return this.getLogs(10000);
  }
}
