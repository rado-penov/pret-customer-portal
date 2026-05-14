export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { findContactByEmail } from "@/lib/netsuite/queries";
import { sendPasswordResetEmail } from "@/lib/email";
import { isDemoMode, DEMO_USER } from "@/lib/mock";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    let name = "Customer";
    let contactId: string | null = null;

    if (isDemoMode()) {
      if (email === DEMO_USER.email.toLowerCase()) {
        name = DEMO_USER.name;
        contactId = DEMO_USER.contactId;
      }
    } else {
      const contact = await findContactByEmail(email);
      if (contact) {
        name = `${contact.firstname} ${contact.lastname}`.trim() || "Customer";
        contactId = contact.id;
      }
    }

    // Always return success to prevent email enumeration
    if (!contactId) {
      return NextResponse.json({ success: true });
    }

    const token = await new SignJWT({
      email,
      contactId,
      purpose: "password_reset",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    // Use PORTAL_URL if set, otherwise derive from the incoming request
    // (handles localhost, ngrok, and production automatically)
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
    const detectedOrigin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : req.nextUrl.origin;
    const baseUrl = process.env.PORTAL_URL ?? detectedOrigin;
    const resetUrl = `${baseUrl}/reset-password/confirm?token=${token}`;

    if (isDemoMode() || !process.env.SMTP_HOST) {
      console.log("\n[DEV] Password reset link (SMTP not configured — not emailed):");
      console.log(resetUrl + "\n");
    } else {
      await sendPasswordResetEmail(email, name, resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
