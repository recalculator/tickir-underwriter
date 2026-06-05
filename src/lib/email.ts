import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"LendFlow" <${smtpUser}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
    } catch (err) {
      console.error("[email] Failed to send email:", err);
    }
  } else {
    console.log(
      "[email] Would send to:",
      payload.to,
      "\nSubject:",
      payload.subject
    );
  }
}
