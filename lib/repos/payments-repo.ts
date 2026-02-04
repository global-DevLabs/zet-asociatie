import { dbQuery } from "@/lib/db";

export type PaymentRow = {
  id: number;
  payment_code: string;
  member_id: string;
  date: string;
  year: number | null;
  amount: string | number;
  method: string | null;
  status: string | null;
  payment_type: string | null;
  contribution_year: number | null;
  observations: string | null;
  source: string | null;
  receipt_number: string | null;
  legacy_payment_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export function rowToPayment(row: PaymentRow) {
  return {
    id: row.payment_code,
    memberId: row.member_id,
    date: row.date,
    year: row.year,
    amount: parseFloat(String(row.amount)),
    method: row.method,
    status: row.status,
    paymentType: row.payment_type,
    contributionYear: row.contribution_year ?? undefined,
    observations: row.observations ?? undefined,
    source: row.source ?? undefined,
    receiptNumber: row.receipt_number ?? undefined,
    legacyPaymentId: row.legacy_payment_id ?? undefined,
  };
}

export function paymentToDbRow(payment: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (payment.memberId !== undefined) row.member_id = payment.memberId;
  if (payment.date !== undefined) row.date = payment.date;
  if (payment.year !== undefined) row.year = payment.year;
  if (payment.amount !== undefined) row.amount = payment.amount;
  if (payment.method !== undefined) row.method = payment.method;
  if (payment.status !== undefined) row.status = payment.status;
  if (payment.paymentType !== undefined) row.payment_type = payment.paymentType;
  if (payment.contributionYear !== undefined) row.contribution_year = payment.contributionYear;
  if (payment.observations !== undefined) row.observations = payment.observations;
  if (payment.source !== undefined) row.source = payment.source;
  if (payment.receiptNumber !== undefined) row.receipt_number = payment.receiptNumber;
  if (payment.legacyPaymentId !== undefined) row.legacy_payment_id = payment.legacyPaymentId;
  return row;
}

export async function listPayments(): Promise<ReturnType<typeof rowToPayment>[]> {
  const { rows } = await dbQuery<PaymentRow>(
    `SELECT * FROM payments ORDER BY date DESC`
  );
  return rows.map(rowToPayment);
}

export async function getNextPaymentCode(): Promise<string> {
  const { rows } = await dbQuery<{ get_next_payment_code: string }>(
    "SELECT get_next_payment_code() AS get_next_payment_code"
  );
  return rows[0]?.get_next_payment_code ?? "P-000001";
}

export async function createPayment(
  paymentCode: string,
  data: Record<string, unknown>
): Promise<ReturnType<typeof rowToPayment>> {
  await dbQuery(
    `INSERT INTO payments (
      payment_code, member_id, date, year, amount, method, status, payment_type,
      contribution_year, observations, source, receipt_number, legacy_payment_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      paymentCode,
      data.member_id,
      data.date,
      data.year ?? null,
      data.amount,
      data.method ?? null,
      data.status ?? "Plătită",
      data.payment_type ?? null,
      data.contribution_year ?? null,
      data.observations ?? null,
      data.source ?? null,
      data.receipt_number ?? null,
      data.legacy_payment_id ?? null,
    ]
  );
  const { rows } = await dbQuery<PaymentRow>(
    "SELECT * FROM payments WHERE payment_code = $1",
    [paymentCode]
  );
  return rowToPayment(rows[0]);
}

export async function updatePayment(
  paymentCode: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const updates = paymentToDbRow(data);
  if (Object.keys(updates).length === 0) return true;
  const setClause = Object.keys(updates)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);
  const { rowCount } = await dbQuery(
    `UPDATE payments SET ${setClause}, updated_at = now() WHERE payment_code = $1`,
    [paymentCode, ...values]
  );
  return (rowCount ?? 0) > 0;
}

export async function deletePayment(paymentCode: string): Promise<boolean> {
  const { rowCount } = await dbQuery(
    "DELETE FROM payments WHERE payment_code = $1",
    [paymentCode]
  );
  return (rowCount ?? 0) > 0;
}
