"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { MemberGroup } from "@/types"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
import { createBrowserClient } from "@/lib/supabase/client"

interface MemberGroupsContextType {
  memberGroups: MemberGroup[]
  isLoading: boolean
  error: string | null
  getMemberGroups: (memberId: string) => MemberGroup[]
  getGroupMembers: (groupId: string) => MemberGroup[]
  addMemberToGroup: (memberId: string, groupId: string, notes?: string) => Promise<void>
  removeMemberFromGroup: (memberId: string, groupId: string) => Promise<void>
  addMemberToGroups: (memberId: string, groupIds: string[]) => Promise<void>
  removeMemberFromGroups: (memberId: string, groupIds: string[]) => Promise<void>
  bulkAddMembersToGroup: (groupId: string, memberIds: string[], mode: "append" | "replace") => Promise<void>
  bulkRemoveMembersFromGroup: (groupId: string, memberIds: string[]) => Promise<void>
  refreshMemberGroups: () => Promise<void>
}

const MemberGroupsContext = createContext<MemberGroupsContextType | null>(null)

// Helper to convert database row to MemberGroup type
function dbRowToMemberGroup(row: any): MemberGroup {
  return {
    member_id: row.member_id,
    group_id: row.group_id,
    joined_at: row.joined_at,
    added_by: row.added_by,
    notes: row.notes,
  }
}

export function MemberGroupsProvider({ children }: { children: ReactNode }) {
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createBrowserClient()

  // Fetch all member-group relationships from Supabase
  const fetchMemberGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("whatsapp_group_members")
        .select("*")

      if (fetchError) {
        console.error("Error fetching member groups:", fetchError)
        setError(fetchError.message)
        return
      }

      const mappedGroups = (data || []).map(dbRowToMemberGroup)
      setMemberGroups(mappedGroups)
    } catch (err) {
      console.error("Failed to fetch member groups:", err)
      setError("Failed to load member groups")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    fetchMemberGroups()
  }, [fetchMemberGroups])

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("member-groups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_group_members" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newGroup = dbRowToMemberGroup(payload.new)
            setMemberGroups((prev) => [...prev, newGroup])
          } else if (payload.eventType === "DELETE") {
            setMemberGroups((prev) =>
              prev.filter(
                (mg) =>
                  !(mg.member_id === payload.old.member_id && mg.group_id === payload.old.group_id)
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getMemberGroups = (memberId: string) => {
    return memberGroups.filter((mg) => mg.member_id === memberId)
  }

  const getGroupMembers = (groupId: string) => {
    return memberGroups.filter((mg) => mg.group_id === groupId)
  }

  const addMemberToGroup = async (memberId: string, groupId: string, notes?: string) => {
    // Check if already exists
    const exists = memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId)
    if (exists) return

    const { error: insertError } = await supabase
      .from("whatsapp_group_members")
      .insert({
        member_id: memberId,
        group_id: groupId,
        added_by: user?.id,
        notes,
      })

    if (insertError) {
      console.error("Failed to add member to group:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      })
      throw new Error(insertError.message || "Failed to add member to group")
    }

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru adăugat în grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_added" },
    })
    
    // Refresh member groups to update the UI
    await fetchMemberGroups()
  }

  const removeMemberFromGroup = async (memberId: string, groupId: string) => {
    const { error: deleteError } = await supabase
      .from("whatsapp_group_members")
      .delete()
      .eq("member_id", memberId)
      .eq("group_id", groupId)

    if (deleteError) {
      console.error("Failed to remove member from group:", {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      })
      throw new Error(deleteError.message || "Failed to remove member from group")
    }

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru eliminat din grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_removed" },
    })
    
    // Refresh member groups to update the UI
    await fetchMemberGroups()
  }

  const addMemberToGroups = async (memberId: string, groupIds: string[]) => {
    const newMemberships = groupIds
      .filter((groupId) => !memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId))
      .map((groupId) => ({
        member_id: memberId,
        group_id: groupId,
        added_by: user?.id,
      }))

    if (newMemberships.length > 0) {
      const { error: insertError } = await supabase
        .from("whatsapp_group_members")
        .insert(newMemberships)

      if (insertError) {
        console.error("Failed to add member to groups:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        throw new Error(insertError.message || "Failed to add member to groups")
      }

      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "member",
        entityId: memberId,
        summary: `${newMemberships.length} grupuri WhatsApp adăugate`,
        metadata: { groupIds, action: "groups_added", count: newMemberships.length },
      })
      
      // Refresh member groups to update the UI
      await fetchMemberGroups()
    }
  }

  const removeMemberFromGroups = async (memberId: string, groupIds: string[]) => {
    for (const groupId of groupIds) {
      await supabase
        .from("whatsapp_group_members")
        .delete()
        .eq("member_id", memberId)
        .eq("group_id", groupId)
    }

    if (groupIds.length > 0) {
      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "member",
        entityId: memberId,
        summary: `${groupIds.length} grupuri WhatsApp eliminate`,
        metadata: { groupIds, action: "groups_removed", count: groupIds.length },
      })
      
      // Refresh member groups to update the UI
      await fetchMemberGroups()
    }
  }

  const bulkAddMembersToGroup = async (groupId: string, memberIds: string[], mode: "append" | "replace") => {
    if (!groupId || !memberIds || memberIds.length === 0) {
      throw new Error("Invalid parameters: groupId and memberIds are required")
    }

    if (mode === "replace") {
      // Remove all existing members first
      await supabase
        .from("whatsapp_group_members")
        .delete()
        .eq("group_id", groupId)
    }

    // Add new members (avoiding duplicates)
    const existingIds = new Set(memberGroups.filter((mg) => mg.group_id === groupId).map((mg) => mg.member_id))
    const newMemberships = memberIds
      .filter((memberId) => memberId && (mode === "replace" || !existingIds.has(memberId)))
      .map((memberId) => ({
        member_id: memberId,
        group_id: groupId,
        added_by: user?.id || null,
      }))

    if (newMemberships.length > 0) {
      const { error: insertError } = await supabase
        .from("whatsapp_group_members")
        .insert(newMemberships)

      if (insertError) {
        console.error("Failed to bulk add members to group:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        throw new Error(insertError.message || "Failed to add members to group")
      }

      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "group",
        entityId: groupId,
        summary: `Import masiv: ${newMemberships.length} membri adăugați în grup (${mode})`,
        metadata: {
          groupId,
          action: "bulk_import_members",
          count: newMemberships.length,
          mode,
          memberIds: memberIds.slice(0, 10), // Log first 10 IDs only
        },
      })
    }
    
    // Refresh member groups to update the UI
    await fetchMemberGroups()
  }

  const bulkRemoveMembersFromGroup = async (groupId: string, memberIds: string[]) => {
    for (const memberId of memberIds) {
      await supabase
        .from("whatsapp_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("member_id", memberId)
    }

    if (memberIds.length > 0) {
      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "group",
        entityId: groupId,
        summary: `${memberIds.length} membri eliminați din grup`,
        metadata: {
          groupId,
          action: "bulk_remove_members",
          count: memberIds.length,
        },
      })
      
      // Refresh member groups to update the UI
      await fetchMemberGroups()
    }
  }

  const refreshMemberGroups = async () => {
    await fetchMemberGroups()
  }

  return (
    <MemberGroupsContext.Provider
      value={{
        memberGroups,
        isLoading,
        error,
        getMemberGroups,
        getGroupMembers,
        addMemberToGroup,
        removeMemberFromGroup,
        addMemberToGroups,
        removeMemberFromGroups,
        bulkAddMembersToGroup,
        bulkRemoveMembersFromGroup,
        refreshMemberGroups,
      }}
    >
      {children}
    </MemberGroupsContext.Provider>
  )
}

export function useMemberGroups() {
  const context = useContext(MemberGroupsContext)
  if (!context) {
    throw new Error("useMemberGroups must be used within MemberGroupsProvider")
  }
  return context
}
