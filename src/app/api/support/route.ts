export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/mock";

const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateRef(companyName: string): string {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(2);
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  const dd  = String(now.getDate()).padStart(2, "0");
  const hh  = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${yy}${mm}${dd}${hh}${min}-${slug}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = (formData.get("subject") as string ?? "").trim();
  const message = (formData.get("message") as string ?? "").trim();
  const files   = formData.getAll("files") as File[];

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Total attachment size exceeds 15 MB." }, { status: 400 });
  }

  const attachments = await Promise.all(
    files.filter((f) => f.size > 0).map(async (f) => ({
      filename: f.name,
      content:  Buffer.from(await f.arrayBuffer()),
    }))
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });

  const ref = generateRef(session.companyName);
  const from = `"Pret Customer Portal" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`;
  const supportEmail = "radoslav.penov@nsnexus.co.uk"; // TODO: change to credit.control@pret.com for production
  const emailSubject = `[${ref}] ${subject} — ${session.companyName}`;

  const supportHtml = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#711323;padding:24px;">
        <p style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:2px;">PRET A MANGER</p>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Customer Portal — Support Request</p>
      </div>
      <div style="padding:32px;background:#FAF9FA;border:1px solid #e5e0e1;border-top:none;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:6px 0;color:#575354;font-size:12px;width:100px;">Reference</td><td style="padding:6px 0;color:#372F31;font-size:13px;font-weight:600;font-family:monospace;">${ref}</td></tr>
          <tr><td style="padding:6px 0;color:#575354;font-size:12px;">From</td><td style="padding:6px 0;color:#372F31;font-size:13px;font-weight:600;">${escapeHtml(session.name)}</td></tr>
          <tr><td style="padding:6px 0;color:#575354;font-size:12px;">Email</td><td style="padding:6px 0;color:#372F31;font-size:13px;">${escapeHtml(session.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#575354;font-size:12px;">Company</td><td style="padding:6px 0;color:#372F31;font-size:13px;">${escapeHtml(session.companyName)}</td></tr>
          <tr><td style="padding:6px 0;color:#575354;font-size:12px;">Subject</td><td style="padding:6px 0;color:#372F31;font-size:13px;font-weight:600;">${escapeHtml(subject)}</td></tr>
        </table>
        <div style="border-top:1px solid #e5e0e1;padding-top:20px;">
          <p style="color:#575354;font-size:12px;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="color:#372F31;font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
        </div>
        ${attachments.length > 0 ? `<p style="color:#575354;font-size:12px;margin:20px 0 0;">${attachments.length} attachment${attachments.length !== 1 ? "s" : ""} included.</p>` : ""}
      </div>
      <div style="padding:16px;text-align:center;">
        <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} Pret A Manger. All rights reserved.</p>
      </div>
    </div>
  `;

  if (isDemoMode()) {
    console.log(`\n[DEV] Support request — ref: ${ref}`);
    console.log(`  To: ${supportEmail}`);
    console.log(`  Subject: ${emailSubject}`);
    console.log(`  From: ${session.name} <${session.email}>`);
    console.log(`  Message: ${message.slice(0, 100)}${message.length > 100 ? "…" : ""}\n`);
    return NextResponse.json({ success: true, ref });
  }

  // Send to support team
  await transporter.sendMail({
    from,
    to:      supportEmail,
    replyTo: `"${session.name}" <${session.email}>`,
    subject: emailSubject,
    html:    supportHtml,
    text:    `Support request from ${session.name} (${session.email}) at ${session.companyName}\n\nRef: ${ref}\nSubject: ${subject}\n\n${message}`,
    attachments,
  });

  // Send confirmation to the user
  await transporter.sendMail({
    from,
    to:      session.email,
    subject: `We've received your message — ${ref}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#711323;padding:24px;text-align:center;">
          <p style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:2px;">PRET A MANGER</p>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Customer Portal</p>
        </div>
        <div style="padding:32px;background:#FAF9FA;border:1px solid #e5e0e1;border-top:none;">
          <h2 style="color:#372F31;margin:0 0 12px;font-size:20px;">We've received your message</h2>
          <p style="color:#575354;margin:0 0 20px;line-height:1.6;">
            Hi ${escapeHtml(session.name)},<br><br>
            Thank you for contacting us. Our team will review your message and get back to you as soon as possible.
          </p>
          <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e5e0e1;border-radius:4px;">
            <tr><td style="padding:10px 14px;color:#575354;font-size:12px;border-bottom:1px solid #e5e0e1;">Reference</td><td style="padding:10px 14px;color:#372F31;font-size:13px;font-weight:600;font-family:monospace;border-bottom:1px solid #e5e0e1;">${ref}</td></tr>
            <tr><td style="padding:10px 14px;color:#575354;font-size:12px;">Subject</td><td style="padding:10px 14px;color:#372F31;font-size:13px;">${escapeHtml(subject)}</td></tr>
          </table>
          <p style="color:#575354;margin:24px 0 0;font-size:12px;line-height:1.6;">
            Please quote your reference number <strong>${ref}</strong> in any follow-up correspondence.
          </p>
        </div>
        <div style="padding:16px;text-align:center;">
          <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} Pret A Manger. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hi ${session.name},\n\nThank you for contacting us. We've received your message and will get back to you shortly.\n\nReference: ${ref}\nSubject: ${subject}\n\nPlease quote your reference number in any follow-up correspondence.\n\n© ${new Date().getFullYear()} Pret A Manger`,
  });

  return NextResponse.json({ success: true, ref });
}
