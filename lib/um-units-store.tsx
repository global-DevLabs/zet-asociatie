"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UMUnit } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";

interface UMUnitsContextType {
  units: UMUnit[];
  loading: boolean;
  error: string | null;
  refreshUnits: () => Promise<void>;
  addUnit: (code: string, name?: string) => Promise<{ success: boolean; error?: string; unit?: UMUnit }>;
  updateUnit: (id: string, updates: Partial<UMUnit>) => Promise<boolean>;
  deleteUnit: (id: string) => Promise<boolean>;
  toggleUnitStatus: (id: string) => Promise<boolean>;
  formatUMCode: (input: string) => string;
  getUnitDisplay: (code: string) => string;
}

const UMUnitsContext = createContext<UMUnitsContextType | undefined>(undefined);

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export function UMUnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UMUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatUMCode = useCallback((input: string): string => {
    const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ");
    if (/^UM \d+$/.test(cleaned)) return cleaned;
    if (/^\d+$/.test(cleaned)) return `UM ${cleaned}`;
    if (/^UM\d+$/.test(cleaned)) return cleaned.replace(/^UM/, "UM ");
    return cleaned;
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api("/api/um-units");
      if (!res.ok) {
        setError("Failed to load units");
        toast({ title: "Eroare", description: "Nu s-au putut încărca unitățile militare.", variant: "destructive" });
        return;
      }
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load UM units:", err);
      setError("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const refreshUnits = useCallback(() => loadUnits(), [loadUnits]);

  const addUnit = useCallback(
    async (code: string, name?: string): Promise<{ success: boolean; error?: string; unit?: UMUnit }> => {
      try {
        const formattedCode = formatUMCode(code);
        const existing = units.find((u) => u.code.toUpperCase() === formattedCode.toUpperCase());
        if (existing) {
          return { success: false, error: "Acest cod UM există deja." };
        }
        const res = await api("/api/um-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: formattedCode, name: name?.trim() || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { success: false, error: data.error || "Failed to add" };
        }
        const unit = await res.json();
        await refreshUnits();
        AuditLogger.log({
          user,
          actionType: "UPDATE_VALUE_LIST",
          module: "settings",
          entityType: "um_unit",
          entityId: unit.id,
          summary: `Adăugat UM: ${formattedCode}`,
          metadata: { code: formattedCode, name },
        });
        toast({ title: "UM adăugat", description: `${formattedCode} a fost adăugat cu succes.` });
        return { success: true, unit };
      } catch (err) {
        console.error("Error adding UM unit:", err);
        return { success: false, error: "Eroare la adăugarea UM-ului" };
      }
    },
    [units, formatUMCode, refreshUnits, toast, user]
  );

  const updateUnit = useCallback(
    async (id: string, updates: Partial<UMUnit>): Promise<boolean> => {
      try {
        const res = await api(`/api/um-units/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          toast({ title: "Eroare", description: "Nu s-a putut actualiza UM-ul.", variant: "destructive" });
          return false;
        }
        await refreshUnits();
        AuditLogger.log({
          user,
          actionType: "UPDATE_VALUE_LIST",
          module: "settings",
          entityType: "um_unit",
          entityId: id,
          summary: "Actualizat UM",
          metadata: updates,
        });
        toast({ title: "UM actualizat", description: "Modificările au fost salvate." });
        return true;
      } catch (err) {
        console.error("Error updating UM unit:", err);
        return false;
      }
    },
    [refreshUnits, toast, user]
  );

  const deleteUnit = useCallback(
    async (id: string): Promise<boolean> => {
      const unit = units.find((u) => u.id === id);
      if (!unit) return false;
      try {
        const res = await api(`/api/um-units/${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast({ title: "Eroare", description: "Nu s-a putut șterge UM-ul.", variant: "destructive" });
          return false;
        }
        await refreshUnits();
        AuditLogger.log({
          user,
          actionType: "UPDATE_VALUE_LIST",
          module: "settings",
          entityType: "um_unit",
          entityId: id,
          summary: `Șters UM: ${unit.code}`,
          metadata: { code: unit.code },
        });
        toast({ title: "UM șters", description: `${unit.code} a fost șters.` });
        return true;
      } catch (err) {
        console.error("Error deleting UM unit:", err);
        return false;
      }
    },
    [units, refreshUnits, toast, user]
  );

  const toggleUnitStatus = useCallback(
    async (id: string): Promise<boolean> => {
      const unit = units.find((u) => u.id === id);
      if (!unit) return false;
      return updateUnit(id, { is_active: !unit.is_active });
    },
    [units, updateUnit]
  );

  const getUnitDisplay = useCallback(
    (code: string): string => {
      const unit = units.find((u) => u.code === code);
      if (unit?.name) return `${unit.code} — ${unit.name}`;
      return code;
    },
    [units]
  );

  return (
    <UMUnitsContext.Provider
      value={{
        units,
        loading,
        error,
        refreshUnits,
        addUnit,
        updateUnit,
        deleteUnit,
        toggleUnitStatus,
        formatUMCode,
        getUnitDisplay,
      }}
    >
      {children}
    </UMUnitsContext.Provider>
  );
}

export function useUMUnits() {
  const context = useContext(UMUnitsContext);
  if (context === undefined) {
    throw new Error("useUMUnits must be used within a UMUnitsProvider");
  }
  return context;
}
