import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findContactByEmail } from "@/lib/netsuite/queries";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/mock";
import { getDemoPasswordHash } from "@/lib/mock/password-store";

const DEMO_PASSWORD = "Password123!";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Demo mode – bypass NetSuite entirely
  if (isDemoMode()) {
    if (email.toLowerCase() !== DEMO_USER.email.toLowerCase()) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    const overrideHash = getDemoPasswordHash();
    const passwordValid = overrideHash
      ? await bcrypt.compare(password, overrideHash)
      : password === DEMO_PASSWORD;
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    const token = await createSession(DEMO_USER);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(token, res);
    return res;
  }

  const contact = await findContactByEmail(email).catch(() => null);
  if (!contact) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  if (contact.portalenabled !== "T") {
    return NextResponse.json({ error: "Portal access not granted for this account." }, { status: 403 });
  }

  const pwdField = process.env.NS_CONTACT_PWD_FIELD!;
  const storedHash = contact[pwdField];
  if (!storedHash) {
    return NextResponse.json({ error: "Portal access not granted for this account." }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, storedHash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  const token = await createSession({
    contactId: contact.id,
    customerId: contact.company,
    email: contact.email,
    name: `${contact.firstname} ${contact.lastname}`.trim(),
    companyName: contact.companyname ?? "",
    currency: "GBP",
  });

  const res = NextResponse.json({ ok: true });
  setSessionCookie(token, res);
  return res;
}
