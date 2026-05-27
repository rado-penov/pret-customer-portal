export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getConsolidatedInvoices } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const items = isDemoMode()
      ? await mockQueries.getConsolidatedInvoices()
      : await getConsolidatedInvoices(session.customerId);
    return NextResponse.json(items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Consolidated invoices error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
