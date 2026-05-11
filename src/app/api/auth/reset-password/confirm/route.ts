import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { updateContactPassword } from "@/lib/netsuite/queries";
import { isDemoMode } from "@/lib/mock";
import { setDemoPasswordHash } from "@/lib/mock/password-store";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).{8,}$/;

export async function POST(req: NextRequest) {
  const { token, password, confirmPassword } = await req.json();

  if (!token || !password || !confirmPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return NextResponse.json(
      { error: "Password does not meet the requirements" },
      { status: 400 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (payload.purpose !== "password_reset") {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    const email = payload.email as string;
    const contactId = payload.contactId as string;
    const hash = await bcrypt.hash(password, 12);

    if (isDemoMode()) {
      setDemoPasswordHash(hash);
      console.log(`\n[DEMO] Password updated for ${email} (contact: ${contactId})\n`);
    } else {
      await updateContactPassword(contactId, hash);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "ERR_JWT_EXPIRED") {
        return NextResponse.json(
          { error: "Reset link has expired. Please request a new one." },
          { status: 400 }
        );
      }
      if (code === "ERR_JWS_INVALID" || code === "ERR_JWT_INVALID") {
        return NextResponse.json({ error: "Invalid reset link" }, { status: 400 });
      }
    }
    console.error("Reset password confirm error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
