import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const invoice = isDemoMode()
      ? await mockQueries.getInvoiceDetail(params.id)
      : await getInvoiceDetail(params.id, session.customerId);
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (err) {
    console.error("Invoice detail error:", err);
    return NextResponse.json({ error: "Failed to load invoice." }, { status: 500 });
  }
}
