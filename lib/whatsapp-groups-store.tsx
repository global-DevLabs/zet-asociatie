"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { WhatsAppGroup } from "@/types"
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

// Helper to convert database row to WhatsAppGroup type
function dbRowToGroup(row: any): WhatsAppGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status || "Active",
    created_at: row.created_at,
    updated_at: row.updated_at,
    member_count: row.member_count,
  }
}

export function WhatsAppGroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  // Fetch all groups from Supabase
  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error fetching WhatsApp groups:", {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        })
        setError(fetchError.message)
        return
      }

      const mappedGroups = (data || []).map(dbRowToGroup)
      setGroups(mappedGroups)

      // Fetch member counts
      const { data: countData } = await supabase
        .from("whatsapp_group_members")
        .select("group_id")

      if (countData) {
        const counts: Record<string, number> = {}
        for (const row of countData) {
          counts[row.group_id] = (counts[row.group_id] || 0) + 1
        }
        setMemberCounts(counts)
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp groups:", err)
      setError("Failed to load WhatsApp groups")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-groups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_groups" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newGroup = dbRowToGroup(payload.new)
            setGroups((prev) => [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === "UPDATE") {
            const updatedGroup = dbRowToGroup(payload.new)
            setGroups((prev) =>
              prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
            )
          } else if (payload.eventType === "DELETE") {
            setGroups((prev) => prev.filter((g) => g.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const generateGroupId = () => {
    const maxNum = groups.reduce((max, group) => {
      const match = group.id.match(/^wag-(\d+)$/)
      if (match) {
        const num = Number.parseInt(match[1], 10)
        return num > max ? num : max
      }
      return max
    }, 0)
    return `wag-${String(maxNum + 1).padStart(3, "0")}`
  }

  const createGroup = async (groupData: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">): Promise<WhatsAppGroup> => {
    const newId = generateGroupId()

    const { data, error: insertError } = await supabase
      .from("whatsapp_groups")
      .insert({
        id: newId,
        name: groupData.name,
        description: groupData.description,
        status: groupData.status || "Active",
      })
      .select()

    // Check for actual insert failure
    if (insertError) {
      console.error("Failed to create WhatsApp group:", insertError)
      throw new Error(insertError.message || "Failed to create group")
    }

    // Get the inserted group (data is an array)
    const insertedData = data && data.length > 0 ? data[0] : null
    
    if (!insertedData) {
      console.error("No data returned after group insert")
      throw new Error("Failed to retrieve created group data")
    }

    const newGroup = dbRowToGroup(insertedData)
    
    // Manually add to local state to immediately show in list
    setGroups((prev) => [newGroup, ...prev])

    return newGroup
  }

  const updateGroup = async (id: string, updates: Partial<WhatsAppGroup>): Promise<void> => {
    const { error: updateError } = await supabase
      .from("whatsapp_groups")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to update WhatsApp group:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      throw new Error(updateError.message || "Failed to update group")
    }
    
    // Refresh groups to update the UI
    await fetchGroups()
  }

  const deleteGroup = async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from("whatsapp_groups")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Failed to delete WhatsApp group:", {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      })
      throw new Error(deleteError.message || "Failed to delete group")
    }
    
    // Manually update local state to immediately reflect the deletion
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
