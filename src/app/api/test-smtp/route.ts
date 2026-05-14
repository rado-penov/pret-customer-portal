export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const config = {
    host: process.env.SMTP_HOST ?? "(not set)",
    port: process.env.SMTP_PORT ?? "(not set)",
    user: process.env.SMTP_USER ?? "(not set)",
    passSet: !!process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "(not set)",
  };

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ ok: false, error: "SMTP env vars not set", config });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transporter.verify();
    return NextResponse.json({ ok: true, message: "SMTP connection verified successfully", config });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, config }, { status: 500 });
  }
}
