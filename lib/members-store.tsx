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

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/api/members");
      if (!res.ok) {
        setError("Failed to load members");
        return;
      }
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const getMember = (id: string) => members.find((m) => m.id === id);

  const getMemberByCode = (code: string) => {
    const searchCode = code.trim().toUpperCase();
    return members.find((m) => {
      if (!m.memberCode) return false;
      const memberCode = m.memberCode.toUpperCase();
      return (
        memberCode === searchCode ||
        memberCode.replace(/^M-0*/, "") === searchCode.replace(/^M-0*/, "")
      );
    });
  };

  const searchMembers = (query: string): Member[] => {
    if (!query) return members;
    const normalizedQuery = query.toLowerCase().trim();
    return members.filter((m) => {
      if (m.memberCode?.toLowerCase().includes(normalizedQuery)) return true;
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      if (fullName.includes(normalizedQuery)) return true;
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
    const res = await api("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create member");
    }
    const newMember = await res.json();
    setMembers((prev) => [newMember, ...prev]);

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
  };

  const updateMember = async (
    id: string,
    data: Partial<Member>
  ): Promise<boolean> => {
    const oldMember = getMember(id);
    const { memberCode: _, ...updateData } = data;
    const res = await api(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) return false;
    await fetchMembers();
    if (oldMember) {
      AuditLogger.log({
        user,
        actionType: "UPDATE_MEMBER",
        module: "members",
        entityType: "member",
        entityId: id,
        entityCode: oldMember.memberCode,
        summary: `Membru actualizat: ${oldMember.firstName} ${oldMember.lastName} (${oldMember.memberCode})`,
        metadata: { changedFields: Object.keys(data), updates: data },
      });
    }
    return true;
  };

  const deleteMember = async (id: string): Promise<boolean> => {
    const member = getMember(id);
    const res = await api(`/api/members/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
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
  };

  const refreshMembers = () => fetchMembers();

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
