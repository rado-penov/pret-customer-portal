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

    const baseUrl = process.env.PORTAL_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password/confirm?token=${token}`;

    if (isDemoMode() || !process.env.SMTP_HOST) {
      console.log("\n[DEV] Password reset link (SMTP not configured — not emailed):");
      console.log(resetUrl + "\n");
    } else {
      await sendPasswordResetEmail(email, name, resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password request error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
