"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { MemberGroup } from "@/types";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";

interface MemberGroupsContextType {
  memberGroups: MemberGroup[];
  isLoading: boolean;
  error: string | null;
  getMemberGroups: (memberId: string) => MemberGroup[];
  getGroupMembers: (groupId: string) => MemberGroup[];
  addMemberToGroup: (memberId: string, groupId: string, notes?: string) => Promise<void>;
  removeMemberFromGroup: (memberId: string, groupId: string) => Promise<void>;
  addMemberToGroups: (memberId: string, groupIds: string[]) => Promise<void>;
  removeMemberFromGroups: (memberId: string, groupIds: string[]) => Promise<void>;
  bulkAddMembersToGroup: (groupId: string, memberIds: string[], mode: "append" | "replace") => Promise<void>;
  bulkRemoveMembersFromGroup: (groupId: string, memberIds: string[]) => Promise<void>;
  refreshMemberGroups: () => Promise<void>;
}

const MemberGroupsContext = createContext<MemberGroupsContextType | null>(null);

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export function MemberGroupsProvider({ children }: { children: ReactNode }) {
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMemberGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api("/api/member-groups");
      if (!res.ok) {
        setError("Failed to load member groups");
        return;
      }
      const data = await res.json();
      setMemberGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch member groups:", err);
      setError("Failed to load member groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberGroups();
  }, [fetchMemberGroups]);

  const getMemberGroups = (memberId: string) =>
    memberGroups.filter((mg) => mg.member_id === memberId);
  const getGroupMembers = (groupId: string) =>
    memberGroups.filter((mg) => mg.group_id === groupId);

  const addMemberToGroup = async (memberId: string, groupId: string, notes?: string) => {
    const exists = memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId);
    if (exists) return;
    const res = await api("/api/member-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, groupId, notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to add member to group");
    }
    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru adăugat în grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_added" },
    });
    await fetchMemberGroups();
  };

  const removeMemberFromGroup = async (memberId: string, groupId: string) => {
    const res = await api(
      `/api/member-groups?memberId=${encodeURIComponent(memberId)}&groupId=${encodeURIComponent(groupId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to remove member from group");
    }
    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `Membru eliminat din grup WhatsApp: ${groupId}`,
      metadata: { groupId, action: "group_member_removed" },
    });
    await fetchMemberGroups();
  };

  const addMemberToGroups = async (memberId: string, groupIds: string[]) => {
    const toAdd = groupIds.filter(
      (groupId) => !memberGroups.some((mg) => mg.member_id === memberId && mg.group_id === groupId)
    );
    if (toAdd.length === 0) return;
    const res = await api("/api/member-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, groupIds: toAdd }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to add member to groups");
    }
    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "member",
      entityId: memberId,
      summary: `${toAdd.length} grupuri WhatsApp adăugate`,
      metadata: { groupIds: toAdd, action: "groups_added", count: toAdd.length },
    });
    await fetchMemberGroups();
  };

  const removeMemberFromGroups = async (memberId: string, groupIds: string[]) => {
    for (const groupId of groupIds) {
      await api(
        `/api/member-groups?memberId=${encodeURIComponent(memberId)}&groupId=${encodeURIComponent(groupId)}`,
        { method: "DELETE" }
      );
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
      });
      await fetchMemberGroups();
    }
  };

  const bulkAddMembersToGroup = async (
    groupId: string,
    memberIds: string[],
    mode: "append" | "replace"
  ) => {
    if (!groupId || !memberIds?.length) {
      throw new Error("Invalid parameters: groupId and memberIds are required");
    }
    const res = await api("/api/member-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulkGroupId: groupId, memberIds, mode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to add members to group");
    }
    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "group",
      entityId: groupId,
      summary: `Import masiv: ${memberIds.length} membri adăugați în grup (${mode})`,
      metadata: { groupId, action: "bulk_import_members", count: memberIds.length, mode },
    });
    await fetchMemberGroups();
  };

  const bulkRemoveMembersFromGroup = async (groupId: string, memberIds: string[]) => {
    if (memberIds.length === 0) return;
    const res = await api(
      `/api/member-groups?bulkGroupId=${encodeURIComponent(groupId)}&bulkMemberIds=${encodeURIComponent(JSON.stringify(memberIds))}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to remove members from group");
    }
    AuditLogger.log({
      user,
      actionType: "UPDATE_MEMBER",
      module: "members",
      entityType: "group",
      entityId: groupId,
      summary: `${memberIds.length} membri eliminați din grup`,
      metadata: { groupId, action: "bulk_remove_members", count: memberIds.length },
    });
    await fetchMemberGroups();
  };

  const refreshMemberGroups = () => fetchMemberGroups();

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
  );
}

export function useMemberGroups() {
  const context = useContext(MemberGroupsContext);
  if (!context) {
    throw new Error("useMemberGroups must be used within MemberGroupsProvider");
  }
  return context;
}
