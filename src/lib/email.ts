import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("[email] SMTP not configured. Would send to:", payload.to);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Tickir AI" <${smtpUser}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}
