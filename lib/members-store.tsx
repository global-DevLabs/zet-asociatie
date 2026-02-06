"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Member } from "@/types";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";
import { membersApi, dbRowToMember } from "@/lib/db-adapter";
import { isTauri } from "@/lib/db";
import { createBrowserClient } from "@/lib/supabase/client";

interface MembersContextType {
  members: Member[];
  loading: boolean;
  error: string | null;
  getMember: (id: string) => Member | undefined;
  getMemberByCode: (code: string) => Member | undefined;
  createMember: (member: Omit<Member, "id" | "memberCode">) => Promise<Member>;
  updateMember: (id: string, data: Partial<Member>) => Promise<boolean>;
  deleteMember: (id: string) => Promise<boolean>;
  refreshMembers: () => Promise<void>;
  searchMembers: (query: string) => Member[];
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch all members (Supabase or SQLite via adapter)
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await membersApi.fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Subscribe to Supabase realtime (skip when in Tauri - no realtime)
  useEffect(() => {
    if (isTauri()) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("members-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        payload => {
          if (payload.eventType === "INSERT") {
            const newMember = dbRowToMember(payload.new);
            setMembers(prev => [...prev, newMember]);
          } else if (payload.eventType === "UPDATE") {
            const updatedMember = dbRowToMember(payload.new);
            setMembers(prev =>
              prev.map(m => (m.id === updatedMember.id ? updatedMember : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMembers(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMember = (id: string) => {
    return members.find(m => m.id === id);
  };

  const getMemberByCode = (code: string) => {
    // Normalize the search code for comparison
    const searchCode = code.trim().toUpperCase();
    return members.find(m => {
      if (!m.memberCode) return false;
      const memberCode = m.memberCode.toUpperCase();
      // Match exact code or numeric part
      return (
        memberCode === searchCode ||
        memberCode.replace(/^M-0*/, "") === searchCode.replace(/^M-0*/, "")
      );
    });
  };

  const searchMembers = (query: string): Member[] => {
    if (!query) return members;

    const normalizedQuery = query.toLowerCase().trim();

    return members.filter(m => {
      // Search by member code
      if (m.memberCode?.toLowerCase().includes(normalizedQuery)) return true;

      // Search by name
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      if (fullName.includes(normalizedQuery)) return true;

      // Search by other fields
      if (m.rank?.toLowerCase().includes(normalizedQuery)) return true;
      if (m.unit?.toLowerCase().includes(normalizedQuery)) return true;
      if (m.email?.toLowerCase().includes(normalizedQuery)) return true;
      if (m.phone?.includes(query)) return true;

      return false;
    });
  };

  const createMember = async (
    memberData: Omit<Member, "id" | "memberCode">
  ): Promise<Member> => {
    try {
      const newMember = await membersApi.createMember(memberData);

      // Manually add to local state to immediately show in list
      setMembers(prev => [newMember, ...prev]);

      AuditLogger.log({
        user,
        actionType: "CREATE_MEMBER",
        module: "members",
        entityType: "member",
        entityId: newMember.id,
        entityCode: newMember.memberCode,
        summary: `Membru nou creat: ${newMember.firstName} ${newMember.lastName} (${newMember.memberCode})`,
        metadata: {
          rank: newMember.rank,
          unit: newMember.unit,
          enrollmentYear: newMember.branchEnrollmentYear,
        },
      });

      return newMember;
    } catch (error) {
      console.error("Error creating member:", error);
      throw error;
    }
  };

  const updateMember = async (
    id: string,
    data: Partial<Member>
  ): Promise<boolean> => {
    try {
      const oldMember = getMember(id);

      const ok = await membersApi.updateMember(id, data);
      if (!ok) return false;

      await fetchMembers();

      if (oldMember) {
        const changedFields = Object.keys(data).filter(
          key => key !== "memberCode"
        );

        AuditLogger.log({
          user,
          actionType: "UPDATE_MEMBER",
          module: "members",
          entityType: "member",
          entityId: id,
          entityCode: oldMember.memberCode,
          summary: `Membru actualizat: ${oldMember.firstName} ${oldMember.lastName} (${oldMember.memberCode})`,
          metadata: {
            changedFields,
            updates: data,
          },
        });
      }

      return true;
    } catch (error) {
      console.error("Error updating member:", error);
      return false;
    }
  };

  const deleteMember = async (id: string): Promise<boolean> => {
    try {
      const member = getMember(id);

      const ok = await membersApi.deleteMember(id);
      if (!ok) return false;

      await fetchMembers();

      if (member) {
        AuditLogger.log({
          user,
          actionType: "DELETE_MEMBER",
          module: "members",
          entityType: "member",
          entityId: id,
          entityCode: member.memberCode,
          summary: `Membru șters: ${member.firstName} ${member.lastName} (${member.memberCode})`,
          metadata: {
            deletedMember: {
              name: `${member.firstName} ${member.lastName}`,
              rank: member.rank,
              unit: member.unit,
            },
          },
        });
      }

      return true;
    } catch (error) {
      console.error("Error deleting member:", error);
      return false;
    }
  };

  const refreshMembers = async () => {
    await fetchMembers();
  };

  return (
    <MembersContext.Provider
      value={{
        members,
        loading,
        error,
        getMember,
        getMemberByCode,
        createMember,
        updateMember,
        deleteMember,
        refreshMembers,
        searchMembers,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (context === undefined) {
    throw new Error("useMembers must be used within a MembersProvider");
  }
  return context;
}
