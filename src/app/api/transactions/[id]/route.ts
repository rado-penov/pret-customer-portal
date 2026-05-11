import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTransactionDetail } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const detail = isDemoMode()
      ? await mockQueries.getTransactionDetail(params.id)
      : await getTransactionDetail(params.id, session.customerId);
    if (!detail) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    console.error("Transaction detail error:", err);
    return NextResponse.json({ error: "Failed to load transaction." }, { status: 500 });
  }
}
