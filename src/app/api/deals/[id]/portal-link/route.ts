import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import type { ApiResponse } from "@/types";

const TOKEN_EXPIRY_DAYS = 14;

function buildPortalEmail({
  borrowerName,
  bankName,
  loanType,
  portalUrl,
  expiryDays,
}: {
  borrowerName: string;
  bankName: string;
  loanType: string;
  portalUrl: string;
  expiryDays: number;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Upload your documents</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#15181a;border-radius:12px 12px 0 0;padding:28px 36px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#3fcf8e;border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                    <span style="color:#0d2a1f;font-size:18px;font-weight:700;line-height:32px;">✓</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#f0f5f2;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Tickr AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 36px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;letter-spacing:-0.02em;">
                Hi ${borrowerName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                <strong>${bankName}</strong> needs a few documents to process your
                <strong style="text-transform:capitalize;">${loanType}</strong> loan application.
                The process is quick — just upload each document through your secure portal.
              </p>

              <!-- Steps -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;background:#f8faf8;border-radius:8px;border-left:3px solid #3fcf8e;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:top;">
                          <div style="width:22px;height:22px;border-radius:50%;background:#3fcf8e;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#0d2a1f;">1</div>
                        </td>
                        <td style="font-size:13.5px;color:#333;">Click the button below to open your secure upload portal</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background:#f8faf8;border-radius:8px;border-left:3px solid #3fcf8e;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:top;">
                          <div style="width:22px;height:22px;border-radius:50%;background:#3fcf8e;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#0d2a1f;">2</div>
                        </td>
                        <td style="font-size:13.5px;color:#333;">Upload each requested document — PDFs, JPGs, or PNGs accepted</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background:#f8faf8;border-radius:8px;border-left:3px solid #3fcf8e;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:top;">
                          <div style="width:22px;height:22px;border-radius:50%;background:#3fcf8e;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#0d2a1f;">3</div>
                        </td>
                        <td style="font-size:13.5px;color:#333;">Your banker will review and be in touch shortly</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}"
                       style="display:inline-block;background:#3fcf8e;color:#0d2a1f;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:-0.01em;">
                      Upload My Documents →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <p style="margin:0 0 16px;font-size:13px;color:#888;text-align:center;">
                This link expires in <strong>${expiryDays} days</strong>. No account or password needed.
              </p>

              <!-- Fallback URL -->
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;word-break:break-all;">
                If the button doesn't work, copy this link:<br/>
                <a href="${portalUrl}" style="color:#3fcf8e;">${portalUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f0f0f0;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999;">
                Sent by <strong>${bankName}</strong> via Tickr AI · This is a secure, time-limited link
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type PortalLinkResult = { portalUrl: string; smtpConfigured: boolean };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PortalLinkResult>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: dealId } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, bankId: session.user.bankId },
    include: { bank: true },
  });

  if (!deal) {
    return NextResponse.json(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const portalUrl = `${baseUrl}/portal/${rawToken}`;

  const emailSent = await sendEmail({
    to: deal.borrowerEmail,
    subject: `Action required: Upload your documents for ${deal.bank.name}`,
    html: buildPortalEmail({
      borrowerName: deal.borrowerName,
      bankName: deal.bank.name,
      loanType: deal.loanType.replace(/_/g, " ").toLowerCase(),
      portalUrl,
      expiryDays: TOKEN_EXPIRY_DAYS,
    }),
  });

  if (!emailSent) {
    return NextResponse.json(
      { success: false, data: null, error: "Failed to send email to borrower. Check your SMTP configuration and try again." },
      { status: 500 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  await prisma.borrowerToken.create({
    data: { dealId, tokenHash, expiresAt },
  });

  return NextResponse.json({ success: true, data: { portalUrl, smtpConfigured: true }, error: null });
}
