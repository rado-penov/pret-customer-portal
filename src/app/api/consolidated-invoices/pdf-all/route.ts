export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/session";
import { getConsolidatedInvoices, getConsolidatedInvoicePdf } from "@/lib/netsuite/queries";
import { isDemoMode } from "@/lib/mock";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (isDemoMode()) {
    return NextResponse.json({ error: "PDF download not available in demo mode." }, { status: 501 });
  }

  try {
    const items = await getConsolidatedInvoices(session.customerId);

    if (items.length === 0) {
      return NextResponse.json({ error: "No consolidated invoices to download." }, { status: 404 });
    }

    const zip = new JSZip();

    await Promise.all(
      items.map(async (ci) => {
        try {
          const buffer = await getConsolidatedInvoicePdf(ci.id, session.customerId);
          if (!buffer) return;
          const filename = `${ci.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;
          zip.file(filename, buffer);
        } catch (err) {
          console.error(`PDF failed for consolidated invoice ${ci.name}:`, err);
        }
      })
    );

    const customerSlug = session.companyName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const today = new Date().toISOString().slice(0, 10);
    const zipName = `CI_invoices_${customerSlug}_${today}.zip`;

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    });
  } catch (err) {
    console.error("CI pdf-all error:", err);
    return NextResponse.json({ error: "Failed to generate ZIP." }, { status: 500 });
  }
}
