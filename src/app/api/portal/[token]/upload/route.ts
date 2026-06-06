import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildS3Key } from "@/lib/s3";
import { validateDocument } from "@/lib/validation";
import { runConsistencyCheck } from "@/lib/consistency-check";
import { sendEmail } from "@/lib/email";
import { portalUploadLimiter } from "@/lib/rate-limit";
import { sanitizeFilename } from "@/lib/sanitize";
import type { ApiResponse } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ACCEPTED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

type UploadResult = { documentId: string; status: "VALIDATING" };

function buildDocsReadyEmail({
  bankerName,
  dealName,
  borrowerName,
  dealUrl,
}: {
  bankerName: string;
  dealName: string;
  borrowerName: string;
  dealUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documents ready for review</title>
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
                    <span style="color:#f0f5f2;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Tickir AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 36px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;letter-spacing:-0.02em;">
                Hi ${bankerName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                All required documents for <strong>${dealName}</strong> have been submitted by
                <strong>${borrowerName}</strong> and passed AI validation. Your deal is ready for review.
              </p>

              <!-- Status badge -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:16px;background:#f0faf5;border-radius:8px;border-left:3px solid #3fcf8e;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:middle;">
                          <div style="width:24px;height:24px;border-radius:50%;background:#3fcf8e;text-align:center;line-height:24px;font-size:14px;color:#0d2a1f;">✓</div>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${dealName}</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#666;">All documents collected &amp; validated</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${dealUrl}"
                       style="display:inline-block;background:#3fcf8e;color:#0d2a1f;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:-0.01em;">
                      Review Deal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;word-break:break-all;">
                Or copy this link:<br/>
                <a href="${dealUrl}" style="color:#3fcf8e;">${dealUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f0f0f0;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999;">
                Sent by <strong>Tickir AI</strong> · Automated notification
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

async function getTokenRecord(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: { deal: true },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<ApiResponse<UploadResult>>> {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!portalUploadLimiter(ip)) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many uploads. Please try again later." },
      { status: 429 }
    );
  }

  const { token } = await params;
  const record = await getTokenRecord(token);

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const docType = formData.get("docType");

  if (!(file instanceof File) || typeof docType !== "string" || !docType) {
    return NextResponse.json(
      { success: false, data: null, error: "Missing file or docType" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, data: null, error: "File exceeds 50 MB limit" },
      { status: 413 }
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXT.has(ext)) {
    return NextResponse.json(
      { success: false, data: null, error: "File type not accepted. Use PDF, JPG, or PNG." },
      { status: 415 }
    );
  }

  try {
    const { deal } = record;
    const buffer = Buffer.from(await file.arrayBuffer());

    const s3Key = buildS3Key(deal.bankId, deal.id, file.name);

    const document = await prisma.document.create({
      data: {
        dealId: deal.id,
        bankId: deal.bankId,
        docType,
        s3Key,
        originalFilename: sanitizeFilename(file.name),
        fileSize: file.size,
        status: "PENDING",
      },
    });

    await prisma.documentChecklist.updateMany({
      where: { dealId: deal.id, docType },
      data: { uploaded: true },
    });

    await prisma.activityLog.create({
      data: {
        dealId: deal.id,
        bankId: deal.bankId,
        userId: deal.bankerId,
        actionType: "DOCUMENT_UPLOADED",
        metadataJson: { docType, documentId: document.id, filename: file.name },
      },
    });

    validateDocument(document.id, buffer, s3Key, file.type)
      .then(async () => {
        const checklist = await prisma.documentChecklist.findMany({
          where: { dealId: deal.id, required: true },
        });
        const allValidated = checklist.length > 0 && checklist.every((item) => item.validated);

        if (allValidated) {
          await prisma.notification.create({
            data: {
              bankId: deal.bankId,
              recipientType: "BANKER",
              recipientId: deal.bankerId,
              dealId: deal.id,
              channel: "IN_APP",
              template: `All documents collected for ${deal.internalName}`,
              read: false,
            },
          });

          const banker = await prisma.user.findUnique({
            where: { id: deal.bankerId },
            select: { email: true, name: true },
          });

          if (banker?.email) {
            const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
            const dealUrl = `${baseUrl}/deals/${deal.id}`;
            sendEmail({
              to: banker.email,
              subject: `All documents received for ${deal.internalName}`,
              html: buildDocsReadyEmail({
                bankerName: banker.name ?? "there",
                dealName: deal.internalName,
                borrowerName: deal.borrowerName,
                dealUrl,
              }),
            }).catch((err) => {
              console.error("[upload] Failed to email banker:", err);
            });
          }

          runConsistencyCheck(deal.id).catch((err) => {
            console.error(`[runConsistencyCheck] Failed for ${deal.id}:`, err);
          });
        }
      })
      .catch((err) => {
        console.error(`[validateDocument] Failed for ${document.id}:`, err);
      });

    return NextResponse.json(
      { success: true, data: { documentId: document.id, status: "VALIDATING" }, error: null },
      { status: 201 }
    );
  } catch (err) {
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json(
      { success: false, data: null, error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
