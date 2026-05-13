export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createPayment } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import type { PaymentRequest } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body: PaymentRequest = await req.json();

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
  }
  if (!body.invoiceIds?.length) {
    return NextResponse.json({ error: "At least one invoice must be selected." }, { status: 400 });
  }

  try {
    const result = isDemoMode()
      ? await mockQueries.createPayment(body.amount, body.invoiceIds)
      : await createPayment(session.customerId, body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Payment error:", err);
    return NextResponse.json({ error: "Failed to create payment." }, { status: 500 });
  }
}
