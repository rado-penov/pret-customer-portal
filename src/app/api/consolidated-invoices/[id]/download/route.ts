export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getConsolidatedInvoicePdf } from "@/lib/netsuite/queries";
import { isDemoMode } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (isDemoMode()) {
    return NextResponse.json({ error: "PDF download not available in demo mode." }, { status: 501 });
  }

  try {
    const buffer = await getConsolidatedInvoicePdf(params.id, session.customerId);
    if (!buffer) return NextResponse.json({ error: "PDF not found." }, { status: 404 });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CI${params.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Consolidated invoice download error:", err);
    return NextResponse.json({ error: "Failed to download PDF." }, { status: 500 });
  }
}
