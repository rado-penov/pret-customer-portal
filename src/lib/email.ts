import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

export async function sendPortalInviteEmail(
  to: string,
  name: string,
  setPasswordUrl: string
): Promise<void> {
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"Pret Customer Portal" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "Welcome to the Pret Customer Portal",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#711323;padding:24px;text-align:center;">
          <p style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:2px;">PRET A MANGER</p>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Customer Portal</p>
        </div>
        <div style="padding:32px;background:#FAF9FA;border:1px solid #e5e0e1;border-top:none;">
          <h2 style="color:#372F31;margin:0 0 12px;font-size:20px;">You've been granted portal access</h2>
          <p style="color:#575354;margin:0 0 24px;line-height:1.6;">
            Hi ${name},<br><br>
            Your account has been set up on the Pret Customer Portal, where you can view your invoices, transactions, and account balance.<br><br>
            Click the button below to set your password and get started.
          </p>
          <a href="${setPasswordUrl}"
             style="display:inline-block;background:#711323;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
            Set Your Password
          </a>
          <p style="color:#575354;margin:24px 0 0;font-size:12px;line-height:1.6;">
            This link expires in <strong>1 hour</strong>. If you weren't expecting this email, please contact us.
          </p>
        </div>
        <div style="padding:16px;text-align:center;">
          <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} Pret A Manger. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hi ${name},\n\nYour account has been set up on the Pret Customer Portal.\n\nSet your password here:\n${setPasswordUrl}\n\nThis link expires in 1 hour.\n\n© ${new Date().getFullYear()} Pret A Manger`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"Pret Customer Portal" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "Reset your Pret Customer Portal password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#711323;padding:24px;text-align:center;">
          <p style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:2px;">PRET A MANGER</p>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Customer Portal</p>
        </div>
        <div style="padding:32px;background:#FAF9FA;border:1px solid #e5e0e1;border-top:none;">
          <h2 style="color:#372F31;margin:0 0 12px;font-size:20px;">Password reset request</h2>
          <p style="color:#575354;margin:0 0 24px;line-height:1.6;">
            Hi ${name},<br><br>
            We received a request to reset your password. Click the button below to create a new one.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#711323;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
            Reset Password
          </a>
          <p style="color:#575354;margin:24px 0 0;font-size:12px;line-height:1.6;">
            This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="padding:16px;text-align:center;">
          <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} Pret A Manger. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hi ${name},\n\nWe received a request to reset your Pret Customer Portal password.\n\nReset your password here:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n© ${new Date().getFullYear()} Pret A Manger`,
  });
}
