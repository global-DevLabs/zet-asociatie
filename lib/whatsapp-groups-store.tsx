"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { WhatsAppGroup } from "@/types"
import { whatsappGroupsApi, dbRowToWhatsAppGroup } from "@/lib/db-adapter"
import { isTauri } from "@/lib/db"
import { createBrowserClient } from "@/lib/supabase/client"

interface WhatsAppGroupsContextType {
  groups: WhatsAppGroup[]
  isLoading: boolean
  error: string | null
  createGroup: (group: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">) => Promise<WhatsAppGroup>
  updateGroup: (id: string, updates: Partial<WhatsAppGroup>) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  getGroupById: (id: string) => WhatsAppGroup | undefined
  refreshGroups: () => Promise<void>
  getGroupMemberCount: (groupId: string) => number
}

const WhatsAppGroupsContext = createContext<WhatsAppGroupsContextType | null>(null)

export function WhatsAppGroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [groupData, counts] = await Promise.all([whatsappGroupsApi.fetchGroups(), whatsappGroupsApi.getGroupMemberCounts()])
      setGroups(groupData)
      setMemberCounts(counts)
    } catch (err) {
      console.error("Failed to fetch WhatsApp groups:", err)
      setError("Failed to load WhatsApp groups")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (isTauri()) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel("whatsapp-groups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_groups" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newGroup = dbRowToWhatsAppGroup(payload.new)
            setGroups((prev) => [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === "UPDATE") {
            const updatedGroup = dbRowToWhatsAppGroup(payload.new)
            setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)))
          } else if (payload.eventType === "DELETE") {
            setGroups((prev) => prev.filter((g) => g.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const createGroup = async (groupData: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">): Promise<WhatsAppGroup> => {
    const newGroup = await whatsappGroupsApi.createGroup(groupData)
    setGroups((prev) => [newGroup, ...prev])
    return newGroup
  }

  const updateGroup = async (id: string, updates: Partial<WhatsAppGroup>): Promise<void> => {
    const ok = await whatsappGroupsApi.updateGroup(id, updates)
    if (!ok) throw new Error("Failed to update group")
    await fetchGroups()
  }

  const deleteGroup = async (id: string): Promise<void> => {
    const ok = await whatsappGroupsApi.deleteGroup(id)
    if (!ok) throw new Error("Failed to delete group")
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const getGroupById = (id: string) => {
    return groups.find((group) => group.id === id)
  }

  const refreshGroups = async () => {
    await fetchGroups()
  }

  const getGroupMemberCount = (groupId: string) => {
    return memberCounts[groupId] || 0
  }

  return (
    <WhatsAppGroupsContext.Provider
      value={{
        groups,
        isLoading,
        error,
        createGroup,
        updateGroup,
        deleteGroup,
        getGroupById,
        refreshGroups,
        getGroupMemberCount,
      }}
    >
      {children}
    </WhatsAppGroupsContext.Provider>
  )
}

export function useWhatsAppGroups() {
  const context = useContext(WhatsAppGroupsContext)
  if (!context) {
    throw new Error("useWhatsAppGroups must be used within WhatsAppGroupsProvider")
  }
  return context
}
