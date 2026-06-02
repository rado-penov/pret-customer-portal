export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { getInvoiceDetail, getInvoicePdfFromNetsuite } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    let pdfBuffer: Buffer;
    let filename: string;

    if (isDemoMode()) {
      const invoice = await mockQueries.getInvoiceDetail(params.id);
      if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      const element = React.createElement(InvoicePDF, { invoice, companyName: session.companyName });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfBuffer = await renderToBuffer(element as any);
      filename = `${invoice.tranId.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;
    } else {
      // Fetch invoice detail only for the filename
      const invoice = await getInvoiceDetail(params.id, session.customerId);
      if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      filename = `${invoice.tranId.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;

      const buffer = await getInvoicePdfFromNetsuite(params.id);
      if (!buffer) return NextResponse.json({ error: "PDF could not be generated." }, { status: 500 });
      pdfBuffer = buffer;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
