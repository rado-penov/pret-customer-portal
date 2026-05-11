import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/netsuite/queries";
import { isDemoMode, mockQueries } from "@/lib/mock";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const data = isDemoMode()
      ? await mockQueries.getDashboard()
      : await getDashboardData(session.customerId);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
