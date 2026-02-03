"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuditLog } from "@/types";
import { AuditLogger } from "@/lib/audit-logger";

interface AuditLogContextType {
  logs: AuditLog[];
  isLoading: boolean;
  refreshLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
  exportLogs: () => Promise<AuditLog[]>;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(
  undefined
);

export function AuditLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedLogs = await AuditLogger.getLogs();
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Don't block rendering - load logs in background
    refreshLogs();
  }, [refreshLogs]);

  const clearLogs = async () => {
    await AuditLogger.clearLogs();
    await refreshLogs();
  };

  const exportLogs = async () => {
    return AuditLogger.exportLogs();
  };

  return (
    <AuditLogContext.Provider
      value={{ logs, isLoading, refreshLogs, clearLogs, exportLogs }}
    >
      {children}
    </AuditLogContext.Provider>
  );
}

export function useAuditLogs() {
  const context = useContext(AuditLogContext);
  if (context === undefined) {
    throw new Error("useAuditLogs must be used within an AuditLogProvider");
  }
  return context;
}
