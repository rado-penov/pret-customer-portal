export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

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

    const element = React.createElement(InvoicePDF, { invoice, companyName: session.companyName });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);

    const filename = `${invoice.tranId.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Invoice PDF error:", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
