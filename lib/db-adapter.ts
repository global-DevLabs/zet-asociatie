/**
 * Database adapter: Supabase (web) vs SQLite (Tauri).
 * Use this in stores to support both backends transparently.
 */

import type { Member, Payment, UMUnit, WhatsAppGroup, MemberGroup, Activity, ActivityType, ActivityParticipant, AuditLog, User } from "@/types";
import { isTauri, getDb, getNextMemberCode as dbGetNextMemberCode, getNextPaymentCode as dbGetNextPaymentCode } from "@/lib/db";
import { createBrowserClient } from "@/lib/supabase/client";
import { compareSync, hashSync } from "bcryptjs";

// ---------------------------------------------------------------------------
// Shared row mappers (snake_case <-> camelCase)
// ---------------------------------------------------------------------------

export function dbRowToMember(row: Record<string, unknown>): Member {
  const ids = row.whatsapp_group_ids;
  let whatsappGroupIds: string[] = [];
  if (Array.isArray(ids)) {
    whatsappGroupIds = ids as string[];
  } else if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);
      whatsappGroupIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      /* ignore */
    }
  }

  return {
    id: String(row.id ?? ""),
    memberCode: String(row.member_code ?? ""),
    status: (row.status as Member["status"]) || "Activ",
    rank: String(row.rank ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    dateOfBirth: String(row.date_of_birth ?? ""),
    cnp: row.cnp != null ? String(row.cnp) : undefined,
    birthplace: row.birthplace != null ? String(row.birthplace) : undefined,
    unit: String(row.unit ?? ""),
    mainProfile: String(row.main_profile ?? ""),
    retirementYear: row.retirement_year != null ? Number(row.retirement_year) : undefined,
    retirementDecisionNumber: row.retirement_decision_number != null ? String(row.retirement_decision_number) : undefined,
    retirementFileNumber: row.retirement_file_number != null ? String(row.retirement_file_number) : undefined,
    branchEnrollmentYear: row.branch_enrollment_year != null ? Number(row.branch_enrollment_year) : undefined,
    branchWithdrawalYear: row.branch_withdrawal_year != null ? Number(row.branch_withdrawal_year) : undefined,
    branchWithdrawalReason: row.branch_withdrawal_reason != null ? String(row.branch_withdrawal_reason) : undefined,
    withdrawalReason: row.withdrawal_reason != null ? (row.withdrawal_reason as Member["withdrawalReason"]) : undefined,
    withdrawalYear: row.withdrawal_year != null ? Number(row.withdrawal_year) : undefined,
    provenance: row.provenance != null ? (row.provenance as Member["provenance"]) : undefined,
    address: row.address != null ? String(row.address) : undefined,
    phone: row.phone != null ? String(row.phone) : undefined,
    email: row.email != null ? String(row.email) : undefined,
    whatsappGroupIds,
    organizationInvolvement: row.organization_involvement != null ? String(row.organization_involvement) : undefined,
    magazineContributions: row.magazine_contributions != null ? String(row.magazine_contributions) : undefined,
    branchNeeds: row.branch_needs != null ? String(row.branch_needs) : undefined,
    foundationNeeds: row.foundation_needs != null ? String(row.foundation_needs) : undefined,
    otherNeeds: row.other_needs != null ? String(row.other_needs) : undefined,
    carMemberStatus: row.car_member_status != null ? (row.car_member_status as Member["carMemberStatus"]) : undefined,
    foundationMemberStatus: row.foundation_member_status != null ? (row.foundation_member_status as Member["foundationMemberStatus"]) : undefined,
    foundationRole: row.foundation_role != null ? (row.foundation_role as Member["foundationRole"]) : undefined,
    hasCurrentWorkplace: row.has_current_workplace != null ? (row.has_current_workplace as Member["hasCurrentWorkplace"]) : undefined,
    currentWorkplace: row.current_workplace != null ? String(row.current_workplace) : undefined,
    otherObservations: row.other_observations != null ? String(row.other_observations) : undefined,
  };
}

function memberToDbRow(member: Partial<Member>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (member.status !== undefined) row.status = member.status;
  if (member.rank !== undefined) row.rank = member.rank;
  if (member.firstName !== undefined) row.first_name = member.firstName;
  if (member.lastName !== undefined) row.last_name = member.lastName;
  if (member.dateOfBirth !== undefined) row.date_of_birth = member.dateOfBirth ?? null;
  if (member.cnp !== undefined) row.cnp = member.cnp;
  if (member.birthplace !== undefined) row.birthplace = member.birthplace;
  if (member.unit !== undefined) row.unit = member.unit;
  if (member.mainProfile !== undefined) row.main_profile = member.mainProfile;
  if (member.retirementYear !== undefined) row.retirement_year = member.retirementYear;
  if (member.retirementDecisionNumber !== undefined) row.retirement_decision_number = member.retirementDecisionNumber;
  if (member.retirementFileNumber !== undefined) row.retirement_file_number = member.retirementFileNumber;
  if (member.branchEnrollmentYear !== undefined) row.branch_enrollment_year = member.branchEnrollmentYear;
  if (member.branchWithdrawalYear !== undefined) row.branch_withdrawal_year = member.branchWithdrawalYear;
  if (member.branchWithdrawalReason !== undefined) row.branch_withdrawal_reason = member.branchWithdrawalReason;
  if (member.withdrawalReason !== undefined) row.withdrawal_reason = member.withdrawalReason;
  if (member.withdrawalYear !== undefined) row.withdrawal_year = member.withdrawalYear;
  if (member.provenance !== undefined) row.provenance = member.provenance;
  if (member.address !== undefined) row.address = member.address;
  if (member.phone !== undefined) row.phone = member.phone;
  if (member.email !== undefined) row.email = member.email;
  if (member.whatsappGroupIds !== undefined) row.whatsapp_group_ids = JSON.stringify(member.whatsappGroupIds);
  if (member.organizationInvolvement !== undefined) row.organization_involvement = member.organizationInvolvement;
  if (member.magazineContributions !== undefined) row.magazine_contributions = member.magazineContributions;
  if (member.branchNeeds !== undefined) row.branch_needs = member.branchNeeds;
  if (member.foundationNeeds !== undefined) row.foundation_needs = member.foundationNeeds;
  if (member.otherNeeds !== undefined) row.other_needs = member.otherNeeds;
  if (member.carMemberStatus !== undefined) row.car_member_status = member.carMemberStatus;
  if (member.foundationMemberStatus !== undefined) row.foundation_member_status = member.foundationMemberStatus;
  if (member.foundationRole !== undefined) row.foundation_role = member.foundationRole;
  if (member.hasCurrentWorkplace !== undefined) row.has_current_workplace = member.hasCurrentWorkplace;
  if (member.currentWorkplace !== undefined) row.current_workplace = member.currentWorkplace;
  if (member.otherObservations !== undefined) row.other_observations = member.otherObservations;
  return row;
}

// ---------------------------------------------------------------------------
// Members API
// ---------------------------------------------------------------------------

export const membersApi = {
  async fetchMembers(): Promise<Member[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM members ORDER BY last_name ASC, first_name ASC")) as Record<string, unknown>[];
      return rows.map(dbRowToMember);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToMember(r as Record<string, unknown>));
  },

  async createMember(memberData: Omit<Member, "id" | "memberCode">): Promise<Member> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const memberCode = await dbGetNextMemberCode();
      if (!memberCode) throw new Error("Failed to generate member code");
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO members (
          id, member_code, status, rank, first_name, last_name, date_of_birth,
          cnp, birthplace, unit, main_profile, retirement_year, retirement_decision_number,
          retirement_file_number, branch_enrollment_year, branch_withdrawal_year,
          branch_withdrawal_reason, withdrawal_reason, withdrawal_year, provenance,
          address, phone, email, whatsapp_group_ids, organization_involvement,
          magazine_contributions, branch_needs, foundation_needs, other_needs,
          car_member_status, foundation_member_status, foundation_role,
          has_current_workplace, current_workplace, other_observations, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          memberCode,
          memberData.status ?? "Activ",
          memberData.rank ?? null,
          memberData.firstName ?? "",
          memberData.lastName ?? "",
          memberData.dateOfBirth ?? null,
          memberData.cnp ?? null,
          memberData.birthplace ?? null,
          memberData.unit ?? "",
          memberData.mainProfile ?? "",
          memberData.retirementYear ?? null,
          memberData.retirementDecisionNumber ?? null,
          memberData.retirementFileNumber ?? null,
          memberData.branchEnrollmentYear ?? null,
          memberData.branchWithdrawalYear ?? null,
          memberData.branchWithdrawalReason ?? null,
          memberData.withdrawalReason ?? null,
          memberData.withdrawalYear ?? null,
          memberData.provenance ?? null,
          memberData.address ?? null,
          memberData.phone ?? null,
          memberData.email ?? null,
          JSON.stringify(memberData.whatsappGroupIds ?? []),
          memberData.organizationInvolvement ?? null,
          memberData.magazineContributions ?? null,
          memberData.branchNeeds ?? null,
          memberData.foundationNeeds ?? null,
          memberData.otherNeeds ?? null,
          memberData.carMemberStatus ?? null,
          memberData.foundationMemberStatus ?? null,
          memberData.foundationRole ?? null,
          memberData.hasCurrentWorkplace ?? null,
          memberData.currentWorkplace ?? null,
          memberData.otherObservations ?? null,
          now,
          now,
        ]
      );

      const newMember: Member = {
        id,
        memberCode,
        status: memberData.status ?? "Activ",
        rank: memberData.rank ?? "",
        firstName: memberData.firstName ?? "",
        lastName: memberData.lastName ?? "",
        dateOfBirth: memberData.dateOfBirth ?? "",
        cnp: memberData.cnp,
        birthplace: memberData.birthplace,
        unit: memberData.unit ?? "",
        mainProfile: memberData.mainProfile ?? "",
        retirementYear: memberData.retirementYear,
        retirementDecisionNumber: memberData.retirementDecisionNumber,
        retirementFileNumber: memberData.retirementFileNumber,
        branchEnrollmentYear: memberData.branchEnrollmentYear,
        branchWithdrawalYear: memberData.branchWithdrawalYear,
        branchWithdrawalReason: memberData.branchWithdrawalReason,
        withdrawalReason: memberData.withdrawalReason,
        withdrawalYear: memberData.withdrawalYear,
        provenance: memberData.provenance,
        address: memberData.address,
        phone: memberData.phone,
        email: memberData.email,
        whatsappGroupIds: memberData.whatsappGroupIds ?? [],
        organizationInvolvement: memberData.organizationInvolvement,
        magazineContributions: memberData.magazineContributions,
        branchNeeds: memberData.branchNeeds,
        foundationNeeds: memberData.foundationNeeds,
        otherNeeds: memberData.otherNeeds,
        carMemberStatus: memberData.carMemberStatus,
        foundationMemberStatus: memberData.foundationMemberStatus,
        foundationRole: memberData.foundationRole,
        hasCurrentWorkplace: memberData.hasCurrentWorkplace,
        currentWorkplace: memberData.currentWorkplace,
        otherObservations: memberData.otherObservations,
      };
      return newMember;
    }

    const supabase = createBrowserClient();
    const { data: memberCode, error: codeError } = await supabase.rpc("get_next_member_code");
    if (codeError || !memberCode) throw new Error("Failed to generate member code");
    const dbRow = memberToDbRow(memberData) as Record<string, unknown>;
    dbRow.member_code = memberCode;
    const { data, error } = await supabase.from("members").insert(dbRow).select();
    if (error) throw new Error(error.message);
    const inserted = data?.[0];
    if (!inserted) throw new Error("Failed to retrieve created member");
    try {
      await supabase.rpc("refresh_member_search_index");
    } catch {
      /* ignore */
    }
    return dbRowToMember(inserted as Record<string, unknown>);
  },

  async updateMember(id: string, data: Partial<Member>): Promise<boolean> {
    const { memberCode: _, ...updateData } = data;
    const row = memberToDbRow(updateData);
    const now = new Date().toISOString();

    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      if (entries.length === 0) return true;
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = entries.map(([k, v]) => (k === "whatsapp_group_ids" && Array.isArray(v) ? JSON.stringify(v) : v));
      values.push(now, id);
      await db.execute(`UPDATE members SET ${setClause}, updated_at = ? WHERE id = ?`, values);
      return true;
    }

    row.updated_at = now;

    const supabase = createBrowserClient();
    const { error } = await supabase.from("members").update(row).eq("id", id);
    if (error) return false;
    try {
      await supabase.rpc("refresh_member_search_index");
    } catch {
      /* ignore */
    }
    return true;
  },

  async deleteMember(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM members WHERE id = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) return false;
    try {
      await supabase.rpc("refresh_member_search_index");
    } catch {
      /* ignore */
    }
    return true;
  },

  async getNextMemberCode(): Promise<string | null> {
    if (isTauri()) return dbGetNextMemberCode();
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("get_next_member_code");
    if (error || !data) return null;
    return data;
  },

  /** Import members locally (Tauri only). Returns count of successfully imported. */
  async importMembers(members: Partial<Member>[]): Promise<{ imported: number; error?: string }> {
    if (!isTauri() || !members?.length) return { imported: 0 };
    let imported = 0;
    for (const m of members) {
      try {
        const data: Omit<Member, "id" | "memberCode"> = {
          status: (m.status as Member["status"]) ?? "Activ",
          rank: m.rank ?? "",
          firstName: m.firstName ?? "",
          lastName: m.lastName ?? "",
          dateOfBirth: m.dateOfBirth ?? "",
          cnp: m.cnp,
          birthplace: m.birthplace,
          unit: m.unit ?? "",
          mainProfile: m.mainProfile ?? "",
          retirementYear: m.retirementYear,
          retirementDecisionNumber: m.retirementDecisionNumber,
          retirementFileNumber: m.retirementFileNumber,
          branchEnrollmentYear: m.branchEnrollmentYear,
          branchWithdrawalYear: m.branchWithdrawalYear,
          branchWithdrawalReason: m.branchWithdrawalReason,
          withdrawalReason: m.withdrawalReason,
          withdrawalYear: m.withdrawalYear,
          provenance: m.provenance,
          address: m.address,
          phone: m.phone,
          email: m.email,
          whatsappGroupIds: m.whatsappGroupIds ?? [],
          organizationInvolvement: m.organizationInvolvement,
          magazineContributions: m.magazineContributions,
          branchNeeds: m.branchNeeds,
          foundationNeeds: m.foundationNeeds,
          otherNeeds: m.otherNeeds,
          carMemberStatus: m.carMemberStatus,
          foundationMemberStatus: m.foundationMemberStatus,
          foundationRole: m.foundationRole,
          hasCurrentWorkplace: m.hasCurrentWorkplace,
          currentWorkplace: m.currentWorkplace,
          otherObservations: m.otherObservations,
        };
        await this.createMember(data);
        imported++;
      } catch (err) {
        console.error("Import member failed:", err);
        return { imported, error: (err as Error).message };
      }
    }
    return { imported };
  },
};

// ---------------------------------------------------------------------------
// Payments API
// ---------------------------------------------------------------------------

export function dbRowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.payment_code ?? row.id ?? ""),
    memberId: String(row.member_id ?? ""),
    date: String(row.date ?? ""),
    year: Number(row.year ?? 0),
    amount: parseFloat(String(row.amount ?? 0)),
    method: row.method as Payment["method"],
    status: row.status as Payment["status"],
    paymentType: row.payment_type as Payment["paymentType"],
    contributionYear: row.contribution_year != null ? Number(row.contribution_year) : undefined,
    observations: row.observations != null ? String(row.observations) : undefined,
    source: row.source != null ? String(row.source) : undefined,
    receiptNumber: row.receipt_number != null ? String(row.receipt_number) : undefined,
    legacyPaymentId: row.legacy_payment_id != null ? String(row.legacy_payment_id) : undefined,
  };
}

export const paymentsApi = {
  async fetchPayments(): Promise<Payment[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM payments ORDER BY date DESC")) as Record<string, unknown>[];
      return rows.map(dbRowToPayment);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("payments").select("*").order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToPayment(r as Record<string, unknown>));
  },

  async createPayment(paymentData: Omit<Payment, "id">): Promise<Payment> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const paymentCode = await dbGetNextPaymentCode();
      if (!paymentCode) throw new Error("Failed to generate payment code");
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO payments (payment_code, member_id, date, year, amount, method, status, payment_type, contribution_year, observations, source, receipt_number, legacy_payment_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentCode,
          paymentData.memberId,
          paymentData.date,
          paymentData.year,
          paymentData.amount,
          paymentData.method,
          paymentData.status,
          paymentData.paymentType,
          paymentData.contributionYear ?? null,
          paymentData.observations ?? null,
          paymentData.source ?? null,
          paymentData.receiptNumber ?? null,
          paymentData.legacyPaymentId ?? null,
          now,
          now,
        ]
      );
      return { ...paymentData, id: paymentCode };
    }

    const supabase = createBrowserClient();
    const { data: paymentCode, error: codeError } = await supabase.rpc("get_next_payment_code");
    if (codeError || !paymentCode) throw new Error("Failed to generate payment code");
    const row = {
      payment_code: paymentCode,
      member_id: paymentData.memberId,
      date: paymentData.date,
      year: paymentData.year,
      amount: paymentData.amount,
      method: paymentData.method,
      status: paymentData.status,
      payment_type: paymentData.paymentType,
      contribution_year: paymentData.contributionYear ?? null,
      observations: paymentData.observations ?? null,
      source: paymentData.source ?? null,
      receipt_number: paymentData.receiptNumber ?? null,
      legacy_payment_id: paymentData.legacyPaymentId ?? null,
    };
    const { data, error } = await supabase.from("payments").insert(row).select();
    if (error) throw new Error(error.message);
    const inserted = data?.[0];
    if (!inserted) throw new Error("Failed to retrieve created payment");
    return dbRowToPayment(inserted as Record<string, unknown>);
  },

  async updatePayment(id: string, data: Partial<Payment>): Promise<boolean> {
    const row: Record<string, unknown> = {};
    if (data.memberId !== undefined) row.member_id = data.memberId;
    if (data.date !== undefined) row.date = data.date;
    if (data.year !== undefined) row.year = data.year;
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.method !== undefined) row.method = data.method;
    if (data.status !== undefined) row.status = data.status;
    if (data.paymentType !== undefined) row.payment_type = data.paymentType;
    if (data.contributionYear !== undefined) row.contribution_year = data.contributionYear;
    if (data.observations !== undefined) row.observations = data.observations;
    if (data.source !== undefined) row.source = data.source;
    if (data.receiptNumber !== undefined) row.receipt_number = data.receiptNumber;
    if (data.legacyPaymentId !== undefined) row.legacy_payment_id = data.legacyPaymentId;
    const now = new Date().toISOString();
    row.updated_at = now;

    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      if (entries.length <= 1) return true; // only updated_at
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = entries.map(([, v]) => v);
      values.push(id);
      await db.execute(`UPDATE payments SET ${setClause} WHERE payment_code = ?`, values);
      return true;
    }

    const supabase = createBrowserClient();
    const { error } = await supabase.from("payments").update(row).eq("payment_code", id);
    return !error;
  },

  async deletePayment(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM payments WHERE payment_code = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("payments").delete().eq("payment_code", id);
    return !error;
  },
};

// ---------------------------------------------------------------------------
// UM Units API
// ---------------------------------------------------------------------------

function dbRowToUMUnit(row: Record<string, unknown>): UMUnit {
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    name: row.name != null ? String(row.name) : undefined,
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export const umUnitsApi = {
  async fetchUnits(): Promise<UMUnit[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM um_units WHERE is_active = 1 ORDER BY code ASC")) as Record<string, unknown>[];
      return rows.map(dbRowToUMUnit);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("um_units").select("*").eq("is_active", true).order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToUMUnit(r as Record<string, unknown>));
  },

  async addUnit(code: string, name?: string): Promise<UMUnit | null> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) return null;
      await db.execute(
        "INSERT INTO um_units (id, code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
        [id, code, name ?? null, now, now]
      );
      return { id, code, name, is_active: true, created_at: now, updated_at: now };
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("um_units").insert({ id, code, name: name ?? null, is_active: true }).select().single();
    if (error) return null;
    return dbRowToUMUnit(data as Record<string, unknown>);
  },

  async updateUnit(id: string, updates: Partial<UMUnit>): Promise<boolean> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.code !== undefined) row.code = updates.code;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.is_active !== undefined) row.is_active = updates.is_active ? 1 : 0;
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), id];
      await db.execute(`UPDATE um_units SET ${setClause} WHERE id = ?`, values);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("um_units").update(row).eq("id", id);
    return !error;
  },

  async deleteUnit(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM um_units WHERE id = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("um_units").delete().eq("id", id);
    return !error;
  },
};

// ---------------------------------------------------------------------------
// WhatsApp Groups API
// ---------------------------------------------------------------------------

export function dbRowToWhatsAppGroup(row: Record<string, unknown>): WhatsAppGroup {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : undefined,
    status: (row.status as WhatsAppGroup["status"]) ?? "Active",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    member_count: row.member_count != null ? Number(row.member_count) : undefined,
  };
}

export const whatsappGroupsApi = {
  async fetchGroups(): Promise<WhatsAppGroup[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM whatsapp_groups ORDER BY name ASC")) as Record<string, unknown>[];
      return rows.map(dbRowToWhatsAppGroup);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("whatsapp_groups").select("*").order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToWhatsAppGroup(r as Record<string, unknown>));
  },

  async getGroupMemberCounts(): Promise<Record<string, number>> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return {};
      const rows = (await db.select("SELECT group_id FROM whatsapp_group_members")) as { group_id: string }[];
      const counts: Record<string, number> = {};
      for (const r of rows) {
        counts[r.group_id] = (counts[r.group_id] ?? 0) + 1;
      }
      return counts;
    }
    const supabase = createBrowserClient();
    const { data } = await supabase.from("whatsapp_group_members").select("group_id");
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      counts[r.group_id] = (counts[r.group_id] ?? 0) + 1;
    }
    return counts;
  },

  async createGroup(groupData: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">): Promise<WhatsAppGroup> {
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = (await db.select("SELECT id FROM whatsapp_groups")) as { id: string }[];
      let maxNum = 0;
      for (const r of rows) {
        const m = r.id.match(/^wag-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      const id = `wag-${String(maxNum + 1).padStart(3, "0")}`;
      await db.execute(
        "INSERT INTO whatsapp_groups (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, groupData.name, groupData.description ?? null, groupData.status ?? "Active", now, now]
      );
      return { id, name: groupData.name, description: groupData.description, status: groupData.status ?? "Active", created_at: now, updated_at: now };
    }
    const supabase = createBrowserClient();
    const maxRows = await supabase.from("whatsapp_groups").select("id");
    let maxNum = 0;
    for (const r of maxRows.data ?? []) {
      const m = (r as { id: string }).id?.match(/^wag-(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    const id = `wag-${String(maxNum + 1).padStart(3, "0")}`;
    const { data, error } = await supabase.from("whatsapp_groups").insert({ id, ...groupData }).select().single();
    if (error) throw new Error(error.message);
    return dbRowToWhatsAppGroup(data as Record<string, unknown>);
  },

  async updateGroup(id: string, updates: Partial<WhatsAppGroup>): Promise<boolean> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.status !== undefined) row.status = updates.status;
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), id];
      await db.execute(`UPDATE whatsapp_groups SET ${setClause} WHERE id = ?`, values);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("whatsapp_groups").update(row).eq("id", id);
    return !error;
  },

  async deleteGroup(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM whatsapp_group_members WHERE group_id = ?", [id]);
      await db.execute("DELETE FROM whatsapp_groups WHERE id = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    await supabase.from("whatsapp_group_members").delete().eq("group_id", id);
    const { error } = await supabase.from("whatsapp_groups").delete().eq("id", id);
    return !error;
  },
};

// ---------------------------------------------------------------------------
// Member Groups (WhatsApp group memberships) API
// ---------------------------------------------------------------------------

export function dbRowToMemberGroup(row: Record<string, unknown>): MemberGroup {
  return {
    member_id: String(row.member_id ?? ""),
    group_id: String(row.group_id ?? ""),
    joined_at: String(row.joined_at ?? ""),
    added_by: row.added_by != null ? String(row.added_by) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
  };
}

export const memberGroupsApi = {
  async fetchMemberGroups(): Promise<MemberGroup[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM whatsapp_group_members")) as Record<string, unknown>[];
      return rows.map(dbRowToMemberGroup);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("whatsapp_group_members").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToMemberGroup(r as Record<string, unknown>));
  },

  async addMemberToGroup(memberId: string, groupId: string, addedBy?: string, notes?: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      try {
        await db.execute(
          "INSERT INTO whatsapp_group_members (member_id, group_id, joined_at, added_by, notes) VALUES (?, ?, ?, ?, ?)",
          [memberId, groupId, now, addedBy ?? null, notes ?? null]
        );
      } catch {
        return false; // duplicate
      }
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("whatsapp_group_members").insert({ member_id: memberId, group_id: groupId, added_by: addedBy, notes });
    return !error;
  },

  async addMemberToGroups(memberId: string, groupIds: string[], addedBy?: string): Promise<boolean> {
    for (const groupId of groupIds) {
      await this.addMemberToGroup(memberId, groupId, addedBy);
    }
    return true;
  },

  async removeMemberFromGroup(memberId: string, groupId: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM whatsapp_group_members WHERE member_id = ? AND group_id = ?", [memberId, groupId]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("whatsapp_group_members").delete().eq("member_id", memberId).eq("group_id", groupId);
    return !error;
  },

  async bulkAddMembersToGroup(groupId: string, memberIds: string[], mode: "append" | "replace", addedBy?: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      if (mode === "replace") {
        await db.execute("DELETE FROM whatsapp_group_members WHERE group_id = ?", [groupId]);
      }
      for (const memberId of memberIds) {
        try {
          await db.execute(
            "INSERT OR IGNORE INTO whatsapp_group_members (member_id, group_id, joined_at, added_by) VALUES (?, ?, ?, ?)",
            [memberId, groupId, now, addedBy ?? null]
          );
        } catch {
          /* ignore duplicates */
        }
      }
      return true;
    }
    const supabase = createBrowserClient();
    if (mode === "replace") {
      await supabase.from("whatsapp_group_members").delete().eq("group_id", groupId);
    }
    const rows = memberIds.map((member_id) => ({ member_id, group_id: groupId, added_by: addedBy }));
    const { error } = await supabase.from("whatsapp_group_members").insert(rows);
    return !error;
  },

  async removeMemberFromGroups(memberId: string, groupIds: string[]): Promise<boolean> {
    for (const groupId of groupIds) {
      await this.removeMemberFromGroup(memberId, groupId);
    }
    return true;
  },

  async bulkRemoveMembersFromGroup(groupId: string, memberIds: string[]): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      for (const memberId of memberIds) {
        await db.execute("DELETE FROM whatsapp_group_members WHERE group_id = ? AND member_id = ?", [groupId, memberId]);
      }
      return true;
    }
    const supabase = createBrowserClient();
    for (const memberId of memberIds) {
      await supabase.from("whatsapp_group_members").delete().eq("group_id", groupId).eq("member_id", memberId);
    }
    return true;
  },
};

// ---------------------------------------------------------------------------
// Activities API (activities, activity_types, activity_participants)
// ---------------------------------------------------------------------------

export function dbRowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id ?? ""),
    type_id: String(row.type_id ?? ""),
    title: row.title != null ? String(row.title) : undefined,
    date_from: String(row.date_from ?? ""),
    date_to: row.date_to != null ? String(row.date_to) : undefined,
    location: row.location != null ? String(row.location) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    status: (row.status as Activity["status"]) ?? "active",
    archived_at: row.archived_at != null ? String(row.archived_at) : undefined,
    archived_by: row.archived_by != null ? String(row.archived_by) : undefined,
    created_by: row.created_by != null ? String(row.created_by) : undefined,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    participants_count: row.participants_count != null ? Number(row.participants_count) : undefined,
  };
}

function activityToDbRow(activity: Partial<Activity>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (activity.type_id !== undefined) row.type_id = activity.type_id;
  if (activity.title !== undefined) row.title = activity.title ?? null;
  if (activity.date_from !== undefined) row.date_from = activity.date_from ?? null;
  if (activity.date_to !== undefined) row.date_to = activity.date_to ?? null;
  if (activity.location !== undefined) row.location = activity.location ?? null;
  if (activity.notes !== undefined) row.notes = activity.notes ?? null;
  if (activity.status !== undefined) row.status = activity.status;
  if (activity.archived_at !== undefined) row.archived_at = activity.archived_at ?? null;
  if (activity.archived_by !== undefined) row.archived_by = activity.archived_by ?? null;
  if (activity.created_by !== undefined) row.created_by = activity.created_by ?? null;
  return row;
}

export function dbRowToActivityType(row: Record<string, unknown>): ActivityType {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    category: row.category != null ? String(row.category) : undefined,
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function dbRowToActivityParticipant(row: Record<string, unknown>): ActivityParticipant {
  return {
    activity_id: String(row.activity_id ?? ""),
    member_id: String(row.member_id ?? ""),
    status: (row.status as ActivityParticipant["status"]) ?? "attended",
    note: row.note != null ? String(row.note) : undefined,
    created_at: String(row.created_at ?? ""),
  };
}

export const activitiesApi = {
  async fetchActivities(): Promise<Activity[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM activities ORDER BY date_from DESC")) as Record<string, unknown>[];
      return rows.map(dbRowToActivity);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("activities").select("*").order("date_from", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToActivity(r as Record<string, unknown>));
  },

  async fetchActivityTypes(): Promise<ActivityType[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM activity_types ORDER BY name ASC")) as Record<string, unknown>[];
      return rows.map(dbRowToActivityType);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("activity_types").select("*").order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToActivityType(r as Record<string, unknown>));
  },

  async fetchParticipants(): Promise<ActivityParticipant[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select("SELECT * FROM activity_participants")) as Record<string, unknown>[];
      return rows.map(dbRowToActivityParticipant);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("activity_participants").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToActivityParticipant(r as Record<string, unknown>));
  },

  async generateActivityId(): Promise<string> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return `ACT-${String(Date.now()).slice(-4).padStart(4, "0")}`;
      const rows = (await db.select("SELECT id FROM activities ORDER BY id DESC LIMIT 1")) as { id: string }[];
      let maxNum = 0;
      if (rows.length > 0) {
        const m = rows[0].id?.match(/^ACT-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      return `ACT-${String(maxNum + 1).padStart(4, "0")}`;
    }
    const supabase = createBrowserClient();
    const { data } = await supabase.from("activities").select("id").order("id", { ascending: false }).limit(1);
    let maxNum = 0;
    if (data?.length) {
      const m = (data[0] as { id: string }).id?.match(/^ACT-(\d+)$/);
      if (m) maxNum = parseInt(m[1], 10);
    }
    return `ACT-${String(maxNum + 1).padStart(4, "0")}`;
  },

  async createActivity(activityData: Omit<Activity, "id" | "created_at" | "updated_at" | "status">, createdBy?: string): Promise<Activity> {
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = await this.generateActivityId();
      const row = activityToDbRow(activityData);
      await db.execute(
        `INSERT INTO activities (id, type_id, title, date_from, date_to, location, notes, status, archived_at, archived_by, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
        [
          id,
          row.type_id ?? activityData.type_id,
          row.title ?? null,
          row.date_from ?? activityData.date_from,
          row.date_to ?? null,
          row.location ?? null,
          row.notes ?? null,
          null,
          null,
          createdBy ?? null,
          now,
          now,
        ]
      );
      return {
        ...activityData,
        id,
        status: "active",
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      } as Activity;
    }
    const supabase = createBrowserClient();
    const id = await this.generateActivityId();
    const dbRow = activityToDbRow(activityData) as Record<string, unknown>;
    dbRow.id = id;
    dbRow.status = "active";
    dbRow.created_by = createdBy ?? null;
    const { data, error } = await supabase.from("activities").insert(dbRow).select().single();
    if (error) throw new Error(error.message);
    return dbRowToActivity(data as Record<string, unknown>);
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<boolean> {
    const row = activityToDbRow(updates) as Record<string, unknown>;
    row.updated_at = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      if (entries.length <= 1) return true;
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), id];
      await db.execute(`UPDATE activities SET ${setClause} WHERE id = ?`, values);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activities").update(row).eq("id", id);
    return !error;
  },

  async deleteActivity(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM activity_participants WHERE activity_id = ?", [id]);
      await db.execute("DELETE FROM activities WHERE id = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    await supabase.from("activity_participants").delete().eq("activity_id", id);
    const { error } = await supabase.from("activities").delete().eq("id", id);
    return !error;
  },

  async archiveActivity(id: string, archivedBy?: string): Promise<boolean> {
    const now = new Date().toISOString();
    const row = { status: "archived" as const, archived_at: now, archived_by: archivedBy ?? null, updated_at: now };
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute(
        "UPDATE activities SET status = ?, archived_at = ?, archived_by = ?, updated_at = ? WHERE id = ?",
        [row.status, row.archived_at, row.archived_by, row.updated_at, id]
      );
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activities").update(row).eq("id", id);
    return !error;
  },

  async reactivateActivity(id: string): Promise<boolean> {
    const row = { status: "active" as const, archived_at: null, archived_by: null, updated_at: new Date().toISOString() };
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("UPDATE activities SET status = ?, archived_at = ?, archived_by = ?, updated_at = ? WHERE id = ?", [row.status, null, null, row.updated_at, id]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activities").update(row).eq("id", id);
    return !error;
  },

  async addParticipants(activityId: string, memberIds: string[], status: ActivityParticipant["status"] = "attended"): Promise<ActivityParticipant[]> {
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const added: ActivityParticipant[] = [];
      for (const memberId of memberIds) {
        try {
          await db.execute(
            "INSERT OR IGNORE INTO activity_participants (activity_id, member_id, status, created_at) VALUES (?, ?, ?, ?)",
            [activityId, memberId, status, now]
          );
          added.push({ activity_id: activityId, member_id: memberId, status, created_at: now });
        } catch {
          /* duplicate, skip */
        }
      }
      return added;
    }
    const supabase = createBrowserClient();
    const rows = memberIds.map((member_id) => ({ activity_id: activityId, member_id, status }));
    const { data, error } = await supabase.from("activity_participants").insert(rows).select();
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => dbRowToActivityParticipant(r as Record<string, unknown>));
  },

  async updateParticipant(activityId: string, memberId: string, updates: Partial<Pick<ActivityParticipant, "status" | "note">>): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const parts: string[] = [];
      const values: unknown[] = [];
      if (updates.status !== undefined) {
        parts.push("status = ?");
        values.push(updates.status);
      }
      if (updates.note !== undefined) {
        parts.push("note = ?");
        values.push(updates.note);
      }
      if (parts.length === 0) return true;
      values.push(activityId, memberId);
      await db.execute(`UPDATE activity_participants SET ${parts.join(", ")} WHERE activity_id = ? AND member_id = ?`, values);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activity_participants").update(updates).eq("activity_id", activityId).eq("member_id", memberId);
    return !error;
  },

  async removeParticipant(activityId: string, memberId: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM activity_participants WHERE activity_id = ? AND member_id = ?", [activityId, memberId]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activity_participants").delete().eq("activity_id", activityId).eq("member_id", memberId);
    return !error;
  },

  async createActivityType(typeData: Omit<ActivityType, "id" | "created_at" | "updated_at">): Promise<ActivityType> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (isTauri()) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute(
        "INSERT INTO activity_types (id, name, category, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, typeData.name, typeData.category ?? null, typeData.is_active ? 1 : 0, now, now]
      );
      return { id, ...typeData, created_at: now, updated_at: now };
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("activity_types").insert({ name: typeData.name, category: typeData.category, is_active: typeData.is_active }).select().single();
    if (error) throw new Error(error.message);
    return dbRowToActivityType(data as Record<string, unknown>);
  },

  async updateActivityType(id: string, updates: Partial<ActivityType>): Promise<boolean> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.is_active !== undefined) row.is_active = updates.is_active ? 1 : 0;
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      const entries = Object.entries(row).filter(([, v]) => v !== undefined);
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), id];
      await db.execute(`UPDATE activity_types SET ${setClause} WHERE id = ?`, values);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activity_types").update(row).eq("id", id);
    return !error;
  },

  async deleteActivityType(id: string): Promise<boolean> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      await db.execute("DELETE FROM activity_types WHERE id = ?", [id]);
      return true;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase.from("activity_types").delete().eq("id", id);
    return !error;
  },
};

// ---------------------------------------------------------------------------
// Audit Logs API
// ---------------------------------------------------------------------------

function dbRowToAuditLog(row: Record<string, unknown>): AuditLog {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata != null) {
    if (typeof row.metadata === "string") {
      try {
        metadata = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        metadata = undefined;
      }
    } else if (typeof row.metadata === "object") {
      metadata = row.metadata as Record<string, unknown>;
    }
  }
  return {
    id: String(row.id ?? ""),
    timestamp: String(row.timestamp ?? ""),
    actorUserId: String(row.actor_user_id ?? ""),
    actorName: String(row.actor_name ?? ""),
    actorRole: row.actor_role as AuditLog["actorRole"],
    actionType: row.action_type as AuditLog["actionType"],
    module: row.module as AuditLog["module"],
    entityType: row.entity_type != null ? String(row.entity_type) : undefined,
    entityId: row.entity_id != null ? String(row.entity_id) : undefined,
    entityCode: row.entity_code != null ? String(row.entity_code) : undefined,
    summary: String(row.summary ?? ""),
    metadata,
    userAgent: row.user_agent != null ? String(row.user_agent) : undefined,
    requestId: row.request_id != null ? String(row.request_id) : undefined,
    isError: Boolean(row.is_error),
  };
}

export const auditLogsApi = {
  async log(params: {
    id: string;
    actor_user_id: string;
    actor_name: string;
    actor_role: string;
    action_type: string;
    module: string;
    summary: string;
    entity_type?: string;
    entity_id?: string;
    entity_code?: string;
    metadata?: Record<string, unknown>;
    user_agent?: string;
    request_id?: string;
    is_error?: boolean;
  }): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const metadataStr = params.metadata ? JSON.stringify(params.metadata) : null;
    if (isTauri()) {
      const db = await getDb();
      if (!db) return false;
      try {
        await db.execute(
          `INSERT INTO audit_logs (id, timestamp, actor_user_id, actor_name, actor_role, action_type, module, entity_type, entity_id, entity_code, summary, metadata, user_agent, request_id, is_error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            params.id,
            timestamp,
            params.actor_user_id,
            params.actor_name,
            params.actor_role,
            params.action_type,
            params.module,
            params.entity_type ?? null,
            params.entity_id ?? null,
            params.entity_code ?? null,
            params.summary,
            metadataStr,
            params.user_agent ?? null,
            params.request_id ?? null,
            params.is_error ? 1 : 0,
          ]
        );
      } catch {
        return false;
      }
      return true;
    }
    const supabase = createBrowserClient();
    const row = {
      id: params.id,
      timestamp,
      actor_user_id: params.actor_user_id,
      actor_name: params.actor_name,
      actor_role: params.actor_role,
      action_type: params.action_type,
      module: params.module,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      entity_code: params.entity_code ?? null,
      summary: params.summary,
      metadata: params.metadata ?? null,
      user_agent: params.user_agent ?? null,
      request_id: params.request_id ?? null,
      is_error: params.is_error ?? false,
    };
    const { error } = await supabase.from("audit_logs").insert(row);
    return !error;
  },

  async getLogs(limit: number = 100): Promise<AuditLog[]> {
    if (isTauri()) {
      const db = await getDb();
      if (!db) return [];
      const rows = (await db.select(
        "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
        [limit]
      )) as Record<string, unknown>[];
      return rows.map(dbRowToAuditLog);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => dbRowToAuditLog(r as Record<string, unknown>));
  },
};

// ---------------------------------------------------------------------------
// Local Auth API (Tauri only - SQLite profiles + bcrypt)
// ---------------------------------------------------------------------------

const TAURI_AUTH_KEY = "tauri_auth_profile_id";
const DEFAULT_ADMIN_EMAIL = "admin@local";
const DEFAULT_ADMIN_PASSWORD = "admin123";

function profileRowToUser(row: Record<string, unknown>): User {
  const nameParts = (String(row.full_name ?? row.email ?? "").split(" ").filter(Boolean)) as string[];
  const firstName = nameParts[0] ?? String(row.email ?? "").split("@")[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    firstName,
    lastName,
    role: (row.role as User["role"]) ?? "viewer",
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export const authApi = {
  /** Persist logged-in profile id for Tauri session restore */
  setSessionProfileId(profileId: string | null): void {
    if (typeof window === "undefined") return;
    if (profileId) {
      localStorage.setItem(TAURI_AUTH_KEY, profileId);
    } else {
      localStorage.removeItem(TAURI_AUTH_KEY);
    }
  },

  /** Get persisted profile id (Tauri) */
  getSessionProfileId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TAURI_AUTH_KEY);
  },

  /** Seed default admin if no profiles exist. Call on Tauri init. */
  async seedDefaultAdminIfEmpty(): Promise<void> {
    if (!isTauri()) return;
    const db = await getDb();
    if (!db) return;
    const rows = (await db.select("SELECT id FROM profiles LIMIT 1")) as { id: string }[];
    if (rows.length > 0) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashSync(DEFAULT_ADMIN_PASSWORD, 10);
    await db.execute(
      `INSERT INTO profiles (id, email, full_name, role, is_active, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, DEFAULT_ADMIN_EMAIL, "Administrator", "admin", passwordHash, now, now]
    );
  },

  /** Fetch profile by email from SQLite (Tauri only) */
  async fetchProfileByEmail(email: string): Promise<User | null> {
    if (!isTauri()) return null;
    const db = await getDb();
    if (!db) return null;
    const emailNorm = email.trim().toLowerCase();
    const rows = (await db.select(
      "SELECT * FROM profiles WHERE LOWER(email) = ? AND is_active = 1",
      [emailNorm]
    )) as Record<string, unknown>[];
    if (rows.length === 0) return null;
    return profileRowToUser(rows[0]);
  },

  /** Fetch profile by id from SQLite (Tauri only) */
  async fetchProfileById(id: string): Promise<User | null> {
    if (!isTauri()) return null;
    const db = await getDb();
    if (!db) return null;
    const rows = (await db.select("SELECT * FROM profiles WHERE id = ? AND is_active = 1", [id])) as Record<
      string,
      unknown
    >[];
    if (rows.length === 0) return null;
    return profileRowToUser(rows[0]);
  },

  /** Get password hash for profile (Tauri only). Returns null if not found. */
  async getPasswordHashByEmail(email: string): Promise<string | null> {
    if (!isTauri()) return null;
    const db = await getDb();
    if (!db) return null;
    const emailNorm = email.trim().toLowerCase();
    const rows = (await db.select(
      "SELECT password_hash FROM profiles WHERE LOWER(email) = ? AND is_active = 1",
      [emailNorm]
    )) as { password_hash: string | null }[];
    if (rows.length === 0 || !rows[0].password_hash) return null;
    return rows[0].password_hash;
  },

  /** Login with email + password using local SQLite profiles (Tauri only) */
  async loginLocal(email: string, password: string): Promise<User | null> {
    if (!isTauri()) return null;
    await this.seedDefaultAdminIfEmpty();
    const hash = await this.getPasswordHashByEmail(email);
    if (!hash) return null;
    if (!compareSync(password, hash)) return null;
    return this.fetchProfileByEmail(email);
  },
};

// ---------------------------------------------------------------------------
// Profiles API (Tauri admin - manage local profiles)
// ---------------------------------------------------------------------------

export interface ProfileForAdmin {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
}

export const profilesApi = {
  async fetchProfiles(): Promise<ProfileForAdmin[]> {
    if (!isTauri()) return [];
    const db = await getDb();
    if (!db) return [];
    const rows = (await db.select(
      "SELECT id, email, full_name, role, is_active, created_at FROM profiles ORDER BY created_at DESC"
    )) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id ?? ""),
      email: String(r.email ?? ""),
      full_name: String(r.full_name ?? ""),
      role: (r.role as ProfileForAdmin["role"]) ?? "viewer",
      is_active: Boolean(r.is_active ?? true),
      created_at: String(r.created_at ?? ""),
    }));
  },

  async createProfile(data: {
    email: string;
    password: string;
    full_name?: string;
    role: "admin" | "editor" | "viewer";
  }): Promise<ProfileForAdmin> {
    if (!isTauri()) throw new Error("Profiles API only available in Tauri");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashSync(data.password, 10);
    const emailNorm = data.email.trim().toLowerCase();
    const fullName = data.full_name?.trim() || emailNorm.split("@")[0] || "User";

    await db.execute(
      `INSERT INTO profiles (id, email, full_name, role, is_active, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, emailNorm, fullName, data.role, passwordHash, now, now]
    );

    return {
      id,
      email: emailNorm,
      full_name: fullName,
      role: data.role,
      is_active: true,
      created_at: now,
    };
  },

  async updateProfile(
    id: string,
    updates: { role?: "admin" | "editor" | "viewer"; is_active?: boolean }
  ): Promise<boolean> {
    if (!isTauri()) return false;
    const db = await getDb();
    if (!db) return false;
    const parts: string[] = [];
    const values: unknown[] = [];
    if (updates.role !== undefined) {
      parts.push("role = ?");
      values.push(updates.role);
    }
    if (updates.is_active !== undefined) {
      parts.push("is_active = ?");
      values.push(updates.is_active ? 1 : 0);
    }
    if (parts.length === 0) return true;
    parts.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);
    await db.execute(`UPDATE profiles SET ${parts.join(", ")} WHERE id = ?`, values);
    return true;
  },
};
