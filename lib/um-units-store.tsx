"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { UMUnit } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { AuditLogger } from "@/lib/audit-logger"

interface UMUnitsContextType {
  units: UMUnit[]
  loading: boolean
  error: string | null
  refreshUnits: () => Promise<void>
  addUnit: (code: string, name?: string) => Promise<{ success: boolean; error?: string; unit?: UMUnit }>
  updateUnit: (id: string, updates: Partial<UMUnit>) => Promise<boolean>
  deleteUnit: (id: string) => Promise<boolean>
  toggleUnitStatus: (id: string) => Promise<boolean>
  formatUMCode: (input: string) => string
  getUnitDisplay: (code: string) => string
}

const UMUnitsContext = createContext<UMUnitsContextType | undefined>(undefined)

export function UMUnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UMUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const { toast } = useToast()

  // Initialize Supabase client on mount
  useEffect(() => {
    try {
      const client = createBrowserClient()
      setSupabase(client)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize Supabase"
      setError(message)
      setLoading(false)
    }
  }, [])

  // Format UM code to standard format: "UM 0754"
  const formatUMCode = useCallback((input: string): string => {
    const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ")

    // If already in correct format
    if (/^UM \d+$/.test(cleaned)) {
      return cleaned
    }

    // If just the number: "0754" -> "UM 0754"
    if (/^\d+$/.test(cleaned)) {
      return `UM ${cleaned}`
    }

    // If "UM0754" -> "UM 0754"
    if (/^UM\d+$/.test(cleaned)) {
      return cleaned.replace(/^UM/, "UM ")
    }

    // Return as-is if not recognizable
    return cleaned
  }, [])

  const loadUnits = useCallback(async () => {
    if (!supabase) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("um_units")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true })

      if (fetchError) {
        console.error(" Failed to load UM units:", fetchError)
        setError(fetchError.message)
        toast({
          title: "Eroare",
          description: "Nu s-au putut încărca unitățile militare.",
          variant: "destructive",
        })
        return
      }

      setUnits(data || [])
    } catch (err) {
      console.error(" Error loading UM units:", err)
      setError("Failed to load units")
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  const refreshUnits = useCallback(async () => {
    await loadUnits()
  }, [loadUnits])

  const addUnit = useCallback(
    async (code: string, name?: string): Promise<{ success: boolean; error?: string; unit?: UMUnit }> => {
      if (!supabase) {
        return {
          success: false,
          error: "Supabase client not initialized",
        }
      }
      try {
        const formattedCode = formatUMCode(code)

        // Check for duplicates
        const existing = units.find((u) => u.code.toUpperCase() === formattedCode.toUpperCase())
        if (existing) {
          return {
            success: false,
            error: "Acest cod UM există deja.",
          }
        }

        const newUnit = {
          code: formattedCode,
          name: name?.trim() || null,
          is_active: true,
        }

        const { data, error: insertError } = await supabase.from("um_units").insert(newUnit).select().single()

        if (insertError) {
          console.error(" Failed to add UM unit:", insertError)
          return {
            success: false,
            error: insertError.message,
          }
        }

        await refreshUnits()

        // Audit log
        AuditLogger.log({
          user: null, // TODO: Get current user from auth context
          actionType: "create",
          module: "settings",
          entityType: "um_unit",
          entityId: data.id,
          summary: `Adăugat UM: ${formattedCode}`,
          metadata: { code: formattedCode, name },
        })

        toast({
          title: "UM adăugat",
          description: `${formattedCode} a fost adăugat cu succes.`,
        })

        return {
          success: true,
          unit: data,
        }
      } catch (err) {
        console.error(" Error adding UM unit:", err)
        return {
          success: false,
          error: "Eroare la adăugarea UM-ului",
        }
      }
    },
    [supabase, units, formatUMCode, refreshUnits, toast],
  )

  const updateUnit = useCallback(
    async (id: string, updates: Partial<UMUnit>): Promise<boolean> => {
      if (!supabase) return false
      try {
        const { error: updateError } = await supabase.from("um_units").update(updates).eq("id", id)

        if (updateError) {
          console.error(" Failed to update UM unit:", updateError)
          toast({
            title: "Eroare",
            description: "Nu s-a putut actualiza UM-ul.",
            variant: "destructive",
          })
          return false
        }

        await refreshUnits()

        // Audit log
        AuditLogger.log({
          user: null, // TODO: Get current user from auth context
          actionType: "update",
          module: "settings",
          entityType: "um_unit",
          entityId: id,
          summary: `Actualizat UM`,
          metadata: updates,
        })

        toast({
          title: "UM actualizat",
          description: "Modificările au fost salvate.",
        })

        return true
      } catch (err) {
        console.error(" Error updating UM unit:", err)
        return false
      }
    },
    [supabase, refreshUnits, toast],
  )

  const deleteUnit = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false
      try {
        const unit = units.find((u) => u.id === id)
        if (!unit) return false

        const { error: deleteError } = await supabase.from("um_units").delete().eq("id", id)

        if (deleteError) {
          console.error(" Failed to delete UM unit:", deleteError)
          toast({
            title: "Eroare",
            description: "Nu s-a putut șterge UM-ul.",
            variant: "destructive",
          })
          return false
        }

        await refreshUnits()

        // Audit log
        AuditLogger.log({
          user: null, // TODO: Get current user from auth context
          actionType: "delete",
          module: "settings",
          entityType: "um_unit",
          entityId: id,
          summary: `Șters UM: ${unit.code}`,
          metadata: { code: unit.code },
        })

        toast({
          title: "UM șters",
          description: `${unit.code} a fost șters.`,
        })

        return true
      } catch (err) {
        console.error(" Error deleting UM unit:", err)
        return false
      }
    },
    [supabase, units, refreshUnits, toast],
  )

  const toggleUnitStatus = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const unit = units.find((u) => u.id === id)
        if (!unit) return false

        return await updateUnit(id, { is_active: !unit.is_active })
      } catch (err) {
        console.error(" Error toggling UM unit status:", err)
        return false
      }
    },
    [units, updateUnit],
  )

  const getUnitDisplay = useCallback(
    (code: string): string => {
      const unit = units.find((u) => u.code === code)
      if (unit?.name) {
        return `${unit.code} — ${unit.name}`
      }
      return code
    },
    [units],
  )

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
  )
}

export function useUMUnits() {
  const context = useContext(UMUnitsContext)
  if (context === undefined) {
    throw new Error("useUMUnits must be used within a UMUnitsProvider")
  }
  return context
}
