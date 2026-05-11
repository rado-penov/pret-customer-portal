import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTransactions } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";
import type { TransactionFilter } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const filter: TransactionFilter = {
    startDate:   p.get("startDate")   ?? undefined,
    endDate:     p.get("endDate")     ?? undefined,
    type:        p.get("type")        ?? undefined,
    tranId:      p.get("tranId")      ?? undefined,
    otherRefNum: p.get("otherRefNum") ?? undefined,
  };

  try {
    const transactions = isDemoMode()
      ? await mockQueries.getTransactions(filter)
      : await getTransactions(session.customerId, filter);
    return NextResponse.json(transactions);
  } catch (err) {
    console.error("Transactions error:", err);
    return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
  }
}
