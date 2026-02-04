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

// Helper to convert database row to Member type
function dbRowToMember(row: any): Member {
  return {
    id: row.id,
    memberCode: row.member_code,
    status: row.status || "Activ",
    rank: row.rank || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    dateOfBirth: row.date_of_birth || "",
    cnp: row.cnp || "",
    birthplace: row.birthplace || "",
    unit: row.unit || "",
    mainProfile: row.main_profile || "",
    retirementYear: row.retirement_year,
    retirementDecisionNumber: row.retirement_decision_number || "",
    retirementFileNumber: row.retirement_file_number || "",
    branchEnrollmentYear: row.branch_enrollment_year,
    branchWithdrawalYear: row.branch_withdrawal_year,
    branchWithdrawalReason: row.branch_withdrawal_reason || "",
    withdrawalReason: row.withdrawal_reason || "",
    withdrawalYear: row.withdrawal_year,
    provenance: row.provenance || "",
    address: row.address || "",
    phone: row.phone || "",
    email: row.email || "",
    whatsappGroupIds: row.whatsapp_group_ids || [],
    organizationInvolvement: row.organization_involvement || "",
    magazineContributions: row.magazine_contributions || "",
    branchNeeds: row.branch_needs || "",
    foundationNeeds: row.foundation_needs || "",
    otherNeeds: row.other_needs || "",
    carMemberStatus: row.car_member_status || undefined,
    foundationMemberStatus: row.foundation_member_status || undefined,
    foundationRole: row.foundation_role || undefined,
    hasCurrentWorkplace: row.has_current_workplace || undefined,
    currentWorkplace: row.current_workplace || "",
    otherObservations: row.other_observations || "",
  };
}

// Helper to convert Member to database row format
function memberToDbRow(member: Partial<Member>): Record<string, any> {
  const row: Record<string, any> = {};

  if (member.status !== undefined) row.status = member.status;
  if (member.rank !== undefined) row.rank = member.rank;
  if (member.firstName !== undefined) row.first_name = member.firstName;
  if (member.lastName !== undefined) row.last_name = member.lastName;
  if (member.dateOfBirth !== undefined)
    row.date_of_birth = member.dateOfBirth || null;
  if (member.cnp !== undefined) row.cnp = member.cnp;
  if (member.birthplace !== undefined) row.birthplace = member.birthplace;
  if (member.unit !== undefined) row.unit = member.unit;
  if (member.mainProfile !== undefined) row.main_profile = member.mainProfile;
  if (member.retirementYear !== undefined)
    row.retirement_year = member.retirementYear;
  if (member.retirementDecisionNumber !== undefined)
    row.retirement_decision_number = member.retirementDecisionNumber;
  if (member.retirementFileNumber !== undefined)
    row.retirement_file_number = member.retirementFileNumber;
  if (member.branchEnrollmentYear !== undefined)
    row.branch_enrollment_year = member.branchEnrollmentYear;
  if (member.branchWithdrawalYear !== undefined)
    row.branch_withdrawal_year = member.branchWithdrawalYear;
  if (member.branchWithdrawalReason !== undefined)
    row.branch_withdrawal_reason = member.branchWithdrawalReason;
  if (member.withdrawalReason !== undefined)
    row.withdrawal_reason = member.withdrawalReason;
  if (member.withdrawalYear !== undefined)
    row.withdrawal_year = member.withdrawalYear;
  if (member.provenance !== undefined) row.provenance = member.provenance;
  if (member.address !== undefined) row.address = member.address;
  if (member.phone !== undefined) row.phone = member.phone;
  if (member.email !== undefined) row.email = member.email;
  if (member.whatsappGroupIds !== undefined)
    row.whatsapp_group_ids = member.whatsappGroupIds;
  if (member.organizationInvolvement !== undefined)
    row.organization_involvement = member.organizationInvolvement;
  if (member.magazineContributions !== undefined)
    row.magazine_contributions = member.magazineContributions;
  if (member.branchNeeds !== undefined) row.branch_needs = member.branchNeeds;
  if (member.foundationNeeds !== undefined)
    row.foundation_needs = member.foundationNeeds;
  if (member.otherNeeds !== undefined) row.other_needs = member.otherNeeds;
  if (member.carMemberStatus !== undefined)
    row.car_member_status = member.carMemberStatus;
  if (member.foundationMemberStatus !== undefined)
    row.foundation_member_status = member.foundationMemberStatus;
  if (member.foundationRole !== undefined)
    row.foundation_role = member.foundationRole;
  if (member.hasCurrentWorkplace !== undefined)
    row.has_current_workplace = member.hasCurrentWorkplace;
  if (member.currentWorkplace !== undefined)
    row.current_workplace = member.currentWorkplace;
  if (member.otherObservations !== undefined)
    row.other_observations = member.otherObservations;

  return row;
}

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createBrowserClient();

  // Fetch all members from Supabase
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("members")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (fetchError) {
        console.error("Error fetching members:", fetchError);
        setError(fetchError.message);
        return;
      }

      const mappedMembers = (data || []).map(dbRowToMember);
      setMembers(mappedMembers);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Subscribe to realtime changes
  useEffect(() => {
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
  }, [supabase]);

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
      // Get next member code from Supabase
      const { data: memberCode, error: codeError } = await supabase.rpc(
        "get_next_member_code"
      );

      if (codeError || !memberCode) {
        console.error("Failed to generate member code:", codeError);
        throw new Error("Failed to generate member code");
      }

      // Convert to database format
      const dbRow = memberToDbRow(memberData);
      dbRow.member_code = memberCode;

      // Insert into Supabase
      const { data, error: insertError } = await supabase
        .from("members")
        .insert(dbRow)
        .select();

      // Check for actual insert failure
      if (insertError) {
        console.error("Failed to create member:", insertError);
        throw new Error(insertError.message || "Failed to create member");
      }

      // Get the inserted member (data is an array)
      const insertedData = data && data.length > 0 ? data[0] : null;
      
      if (!insertedData) {
        console.error("No data returned after member insert");
        throw new Error("Failed to retrieve created member data");
      }

      const newMember = dbRowToMember(insertedData);

      // Manually add to local state to immediately show in list
      // (ensures it appears even if navigation happens before realtime subscription processes)
      setMembers(prev => [newMember, ...prev]);

      // Refresh search index (ignore errors)
      try {
        await supabase.rpc("refresh_member_search_index");
      } catch (error) {
        console.error("Failed to refresh search index:", error);
      }

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

      // Don't allow changing memberCode
      const { memberCode: _, ...updateData } = data;
      const dbRow = memberToDbRow(updateData);
      dbRow.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("members")
        .update(dbRow)
        .eq("id", id);

      if (updateError) {
        console.error("Failed to update member:", updateError);
        return false;
      }

      // Refresh search index (ignore errors)
      try {
        await supabase.rpc("refresh_member_search_index");
      } catch (error) {
        console.error("Failed to refresh search index:", error);
      }

      // Refresh the members list to show updated data
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

      const { error: deleteError } = await supabase
        .from("members")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Failed to delete member:", deleteError);
        return false;
      }

      // Refresh search index (ignore errors)
      try {
        await supabase.rpc("refresh_member_search_index");
      } catch (error) {
        console.error("Failed to refresh search index:", error);
      }

      // Refresh the members list to show updated data
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
