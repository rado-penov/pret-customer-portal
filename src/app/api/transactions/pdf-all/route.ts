export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/session";
import { getTransactions, getTransactionDetail } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { TRANSACTION_TYPE_LABELS } from "@/types";

const PDF_SUPPORTED_TYPES = new Set(["CustInvc", "CustCred"]);

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const transactions = isDemoMode()
      ? await mockQueries.getTransactions({})
      : await getTransactions(session.customerId, {});

    const supported = transactions.filter((t) => PDF_SUPPORTED_TYPES.has(t.type));

    if (supported.length === 0) {
      return NextResponse.json({ error: "No downloadable transactions found." }, { status: 404 });
    }

    const zip = new JSZip();

    await Promise.all(
      supported.map(async (t) => {
        const detail = isDemoMode()
          ? await mockQueries.getTransactionDetail(t.id)
          : await getTransactionDetail(t.id, session.customerId);

        if (!detail) return;

        const typeLabel = TRANSACTION_TYPE_LABELS[detail.type] ?? "Document";
        const element = React.createElement(InvoicePDF, {
          invoice: detail,
          companyName: session.companyName,
          typeLabel,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = await renderToBuffer(element as any);

        const filename = `${detail.tranId.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;
        zip.file(filename, buffer);
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
    console.error("Transactions PDF-all error:", err);
    return NextResponse.json({ error: "Failed to generate ZIP." }, { status: 500 });
  }
}
