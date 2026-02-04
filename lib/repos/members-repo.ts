import { dbQuery } from "@/lib/db";

export type MemberRow = {
  id: string;
  member_code: string;
  status: string;
  rank: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  cnp: string | null;
  birthplace: string | null;
  unit: string | null;
  main_profile: string | null;
  retirement_year: number | null;
  retirement_decision_number: string | null;
  retirement_file_number: string | null;
  branch_enrollment_date: string | null;
  branch_withdrawal_date: string | null;
  years_of_service: number | null;
  branch_enrollment_year: number | null;
  branch_withdrawal_year: number | null;
  branch_withdrawal_reason: string | null;
  withdrawal_reason: string | null;
  withdrawal_year: number | null;
  provenance: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_group_ids: string[] | null;
  organization_involvement: string | null;
  magazine_contributions: string | null;
  branch_needs: string | null;
  foundation_needs: string | null;
  other_needs: string | null;
  car_member_status: string | null;
  foundation_member_status: string | null;
  foundation_role: string | null;
  has_current_workplace: string | null;
  current_workplace: string | null;
  other_observations: string | null;
  created_at: string;
  updated_at: string | null;
};

function rowToMember(row: MemberRow) {
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
    carMemberStatus: row.car_member_status ?? undefined,
    foundationMemberStatus: row.foundation_member_status ?? undefined,
    foundationRole: row.foundation_role ?? undefined,
    hasCurrentWorkplace: row.has_current_workplace ?? undefined,
    currentWorkplace: row.current_workplace || "",
    otherObservations: row.other_observations || "",
  };
}

export function memberToDbRow(member: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (member.status !== undefined) row.status = member.status;
  if (member.rank !== undefined) row.rank = member.rank;
  if (member.firstName !== undefined) row.first_name = member.firstName;
  if (member.lastName !== undefined) row.last_name = member.lastName;
  if (member.dateOfBirth !== undefined) row.date_of_birth = member.dateOfBirth || null;
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
  if (member.whatsappGroupIds !== undefined) row.whatsapp_group_ids = member.whatsappGroupIds;
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

export async function listMembers(): Promise<ReturnType<typeof rowToMember>[]> {
  const { rows } = await dbQuery<MemberRow>(
    `SELECT * FROM members ORDER BY last_name ASC, first_name ASC`
  );
  return rows.map(rowToMember);
}

export async function getMemberById(id: string): Promise<ReturnType<typeof rowToMember> | null> {
  const { rows } = await dbQuery<MemberRow>(`SELECT * FROM members WHERE id = $1`, [id]);
  return rows[0] ? rowToMember(rows[0]) : null;
}

export async function getNextMemberCode(): Promise<string> {
  const { rows } = await dbQuery<{ get_next_member_code: string }>(
    "SELECT get_next_member_code() AS get_next_member_code"
  );
  return rows[0]?.get_next_member_code ?? "00001";
}

export async function getNextMemberCodes(count: number): Promise<string[]> {
  const { rows } = await dbQuery<{ get_next_member_codes: string[] }>(
    "SELECT get_next_member_codes($1) AS get_next_member_codes",
    [count]
  );
  return rows[0]?.get_next_member_codes ?? [];
}

export async function createMember(
  memberCode: string,
  data: Record<string, unknown>
): Promise<ReturnType<typeof rowToMember>> {
  const client = await dbQuery(
    `INSERT INTO members (
      member_code, status, rank, first_name, last_name, date_of_birth, cnp, birthplace,
      unit, main_profile, retirement_year, retirement_decision_number, retirement_file_number,
      branch_enrollment_year, branch_withdrawal_year, branch_withdrawal_reason,
      withdrawal_reason, withdrawal_year, provenance, address, phone, email,
      whatsapp_group_ids, organization_involvement, magazine_contributions,
      branch_needs, foundation_needs, other_needs, car_member_status, foundation_member_status,
      foundation_role, has_current_workplace, current_workplace, other_observations
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
    ) RETURNING *`,
    [
      memberCode,
      (data.status as string) ?? "Activ",
      (data.rank as string) ?? null,
      (data.first_name as string) ?? "",
      (data.last_name as string) ?? "",
      (data.date_of_birth as string) || null,
      (data.cnp as string) || null,
      (data.birthplace as string) || null,
      (data.unit as string) || null,
      (data.main_profile as string) || null,
      (data.retirement_year as number) ?? null,
      (data.retirement_decision_number as string) || null,
      (data.retirement_file_number as string) || null,
      (data.branch_enrollment_year as number) ?? null,
      (data.branch_withdrawal_year as number) ?? null,
      (data.branch_withdrawal_reason as string) || null,
      (data.withdrawal_reason as string) || null,
      (data.withdrawal_year as number) ?? null,
      (data.provenance as string) || null,
      (data.address as string) || null,
      (data.phone as string) || null,
      (data.email as string) || null,
      (data.whatsapp_group_ids as string[]) ?? [],
      (data.organization_involvement as string) || null,
      (data.magazine_contributions as string) || null,
      (data.branch_needs as string) || null,
      (data.foundation_needs as string) || null,
      (data.other_needs as string) || null,
      (data.car_member_status as string) ?? null,
      (data.foundation_member_status as string) ?? null,
      (data.foundation_role as string) ?? null,
      (data.has_current_workplace as string) ?? null,
      (data.current_workplace as string) || null,
      (data.other_observations as string) || null,
    ]
  );
  const row = (client.rows[0] as unknown) as MemberRow;
  return rowToMember(row);
}

export async function updateMember(
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const updates = memberToDbRow(data);
  if (Object.keys(updates).length === 0) return true;
  const setClause = Object.keys(updates)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);
  const { rowCount } = await dbQuery(
    `UPDATE members SET ${setClause}, updated_at = now() WHERE id = $1`,
    [id, ...values]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteMember(id: string): Promise<boolean> {
  const { rowCount } = await dbQuery(`DELETE FROM members WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

/** Return member ids matching search query (ILIKE on name, member_code, etc.). */
export async function searchMemberIds(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const q = `%${query.trim().replace(/%/g, "\\%")}%`;
  const { rows } = await dbQuery<{ id: string }>(
    `SELECT id FROM members
     WHERE last_name ILIKE $1 OR first_name ILIKE $1 OR member_code ILIKE $1
        OR COALESCE(unit,'') ILIKE $1 OR COALESCE(email,'') ILIKE $1 OR COALESCE(phone,'') ILIKE $1
     ORDER BY last_name, first_name`,
    [q]
  );
  return rows.map((r) => r.id);
}
