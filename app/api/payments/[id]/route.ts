import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";
import {
  updatePayment,
  deletePayment,
  paymentToDbRow,
  rowToPayment,
  type PaymentRow,
} from "@/lib/repos/payments-repo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentCode } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const row = paymentToDbRow(body);
    const ok = await updatePayment(paymentCode, row);
    if (!ok) {
      return NextResponse.json({ error: "Not found or no change" }, { status: 404 });
    }
    const { rows } = await dbQuery<PaymentRow>(
      "SELECT * FROM payments WHERE payment_code = $1",
      [paymentCode]
    );
    return NextResponse.json(rows[0] ? rowToPayment(rows[0]) : { id: paymentCode });
  } catch (err) {
    console.error("Update payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentCode } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ok = await deletePayment(paymentCode);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
