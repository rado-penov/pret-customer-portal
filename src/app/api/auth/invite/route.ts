export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { findContactByEmail } from "@/lib/netsuite/queries";
import { sendPortalInviteEmail } from "@/lib/email";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = (body.email ?? "").trim().toLowerCase();
  const incomingSecret: string = body.secret ?? "";

  if (!incomingSecret || incomingSecret !== process.env.PORTAL_INVITE_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const contact = await findContactByEmail(email);

    // Silently succeed if contact not found or portal not enabled — prevents enumeration
    if (!contact || contact.portalenabled !== "T") {
      return NextResponse.json({ success: true });
    }

    const name = `${contact.firstname} ${contact.lastname}`.trim() || "Customer";

    const token = await new SignJWT({
      email,
      contactId: contact.id,
      purpose: "password_reset",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const baseUrl = process.env.PORTAL_URL ?? "http://localhost:3000";
    const setPasswordUrl = `${baseUrl}/reset-password/confirm?token=${token}`;

    if (process.env.SMTP_HOST) {
      await sendPortalInviteEmail(email, name, setPasswordUrl);
    } else {
      console.log(`\n[INVITE] Set-password link for ${email} (SMTP not configured — not emailed):`);
      console.log(setPasswordUrl + "\n");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Portal invite error:", err);
    return NextResponse.json({ error: "An error occurred." }, { status: 500 });
  }
}
