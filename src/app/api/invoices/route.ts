import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOpenInvoices } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const endDate = req.nextUrl.searchParams.get("endDate") ?? undefined;

  try {
    const invoices = isDemoMode()
      ? await mockQueries.getOpenInvoices(endDate)
      : await getOpenInvoices(session.customerId, endDate);
    return NextResponse.json(invoices);
  } catch (err) {
    console.error("Invoices error:", err);
    return NextResponse.json({ error: "Failed to load invoices." }, { status: 500 });
  }
}
