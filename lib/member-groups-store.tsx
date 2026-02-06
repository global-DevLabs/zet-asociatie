"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { MemberGroup } from "@/types"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
import { memberGroupsApi, dbRowToMemberGroup } from "@/lib/db-adapter"
import { isTauri } from "@/lib/db"
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

export function MemberGroupsProvider({ children }: { children: ReactNode }) {
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchMemberGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await memberGroupsApi.fetchMemberGroups()
      setMemberGroups(data)
    } catch (err) {
      console.error("Failed to fetch member groups:", err)
      setError("Failed to load member groups")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMemberGroups()
  }, [fetchMemberGroups])

  useEffect(() => {
    if (isTauri()) return
    const supabase = createBrowserClient()
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
              prev.filter((mg) => !(mg.member_id === payload.old.member_id && mg.group_id === payload.old.group_id))
            )
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const getMemberGroups = (memberId: string) => {
    return memberGroups.filter((mg) => mg.member_id === memberId)
  }

  const getGroupMembers = (groupId: string) => {
    return memberGroups.filter((mg) => mg.group_id === groupId)
  }

  const addMemberToGroup = async (memberId: string, groupId: string, notes?: string) => {
    const exists = memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId)
    if (exists) return

    const ok = await memberGroupsApi.addMemberToGroup(memberId, groupId, user?.id, notes)
    if (!ok) throw new Error("Failed to add member to group")

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru adăugat în grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_added" },
    })

    await fetchMemberGroups()
  }

  const removeMemberFromGroup = async (memberId: string, groupId: string) => {
    const ok = await memberGroupsApi.removeMemberFromGroup(memberId, groupId)
    if (!ok) throw new Error("Failed to remove member from group")

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru eliminat din grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_removed" },
    })

    await fetchMemberGroups()
  }

  const addMemberToGroups = async (memberId: string, groupIds: string[]) => {
    const newGroupIds = groupIds.filter(
      (groupId) => !memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId)
    )
    if (newGroupIds.length === 0) return

    await memberGroupsApi.addMemberToGroups(memberId, newGroupIds, user?.id)

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `${newGroupIds.length} grupuri WhatsApp adăugate`,
      metadata: { groupIds: newGroupIds, action: "groups_added", count: newGroupIds.length },
    })

    await fetchMemberGroups()
  }

  const removeMemberFromGroups = async (memberId: string, groupIds: string[]) => {
    if (groupIds.length === 0) return

    await memberGroupsApi.removeMemberFromGroups(memberId, groupIds)

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `${groupIds.length} grupuri WhatsApp eliminate`,
      metadata: { groupIds, action: "groups_removed", count: groupIds.length },
    })

    await fetchMemberGroups()
  }

  const bulkAddMembersToGroup = async (groupId: string, memberIds: string[], mode: "append" | "replace") => {
    if (!groupId || !memberIds || memberIds.length === 0) {
      throw new Error("Invalid parameters: groupId and memberIds are required")
    }

    const newMemberIds =
      mode === "replace"
        ? memberIds.filter(Boolean)
        : memberIds.filter((id) => {
            const existing = memberGroups.some((mg) => mg.group_id === groupId && mg.member_id === id)
            return id && !existing
          })

    if (newMemberIds.length > 0 || mode === "replace") {
      await memberGroupsApi.bulkAddMembersToGroup(groupId, newMemberIds, mode, user?.id)

      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "group",
        entityId: groupId,
        summary: `Import masiv: ${newMemberIds.length} membri adăugați în grup (${mode})`,
        metadata: { groupId, action: "bulk_import_members", count: newMemberIds.length, mode },
      })
    }

    await fetchMemberGroups()
  }

  const bulkRemoveMembersFromGroup = async (groupId: string, memberIds: string[]) => {
    if (memberIds.length === 0) return

    await memberGroupsApi.bulkRemoveMembersFromGroup(groupId, memberIds)

    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "group",
      entityId: groupId,
      summary: `${memberIds.length} membri eliminați din grup`,
      metadata: { groupId, action: "bulk_remove_members", count: memberIds.length },
    })

    await fetchMemberGroups()
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
