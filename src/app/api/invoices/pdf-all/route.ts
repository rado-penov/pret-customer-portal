export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/session";
import { getOpenInvoices, getInvoiceDetail, getInvoicePdfFromNetsuite } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const invoices = isDemoMode()
      ? await mockQueries.getOpenInvoices()
      : await getOpenInvoices(session.customerId);

    if (invoices.length === 0) {
      return NextResponse.json({ error: "No open invoices to download." }, { status: 404 });
    }

    const zip = new JSZip();

    await Promise.all(
      invoices.map(async (inv) => {
        try {
          let buffer: Buffer;

          if (isDemoMode()) {
            const detail = await mockQueries.getInvoiceDetail(inv.id);
            if (!detail) return;
            const element = React.createElement(InvoicePDF, { invoice: detail, companyName: session.companyName });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            buffer = await renderToBuffer(element as any);
          } else {
            const pdf = await getInvoicePdfFromNetsuite(inv.id);
            if (!pdf) return;
            buffer = pdf;
          }

          const filename = `${inv.tranId.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;
          zip.file(filename, buffer);
        } catch (err) {
          console.error(`PDF failed for invoice ${inv.tranId}:`, err);
          // Skip failed invoice — continue building ZIP with remaining
        }
      })
    );

    const now = new Date();
    const yy  = String(now.getFullYear()).slice(2);
    const mm  = String(now.getMonth() + 1).padStart(2, "0");
    const dd  = String(now.getDate()).padStart(2, "0");
    const zipName = `Pret${yy}${mm}${dd}.zip`;

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    });
  } catch (err) {
    console.error("Invoice PDF-all error:", err);
    return NextResponse.json({ error: "Failed to generate ZIP." }, { status: 500 });
  }
}
