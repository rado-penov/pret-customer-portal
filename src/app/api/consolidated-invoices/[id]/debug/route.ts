export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { suiteQL } from "@/lib/netsuite/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const rows = await suiteQL<Record<string, unknown>>(`
      SELECT id,
             name,
             custrecord_nsts_ci_pdffile AS fileid,
             custrecord_nsts_ci_customer AS customerid
      FROM customrecord_nsts_ci_consolidate_invoice
      WHERE id = ${params.id}
        AND custrecord_nsts_ci_customer = ${session.customerId}
      FETCH FIRST 1 ROWS ONLY
    `);
    return NextResponse.json({ row: rows[0] ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
