import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import {
  listPayments,
  createPayment,
  getNextPaymentCode,
  paymentToDbRow,
} from "@/lib/repos/payments-repo";

export async function GET(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payments = await listPayments();
    return NextResponse.json(payments);
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const row = paymentToDbRow(body);
    const paymentCode = await getNextPaymentCode();
    const payment = await createPayment(paymentCode, row);
    return NextResponse.json(payment);
  } catch (err) {
    console.error("Create payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
