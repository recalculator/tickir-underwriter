import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadFile, hasS3Config, hasSupabaseStorageConfig } from "@/lib/s3";
import { validateDocument } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { runConsistencyCheck } from "@/lib/consistency-check";
import type { ApiResponse } from "@/types";

// Give after() callbacks enough time for Claude validation on Pro/Enterprise.
// Vercel Hobby caps this at 60 s automatically.
export const maxDuration = 300;

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

// PUT — receive raw file bytes for local-dev uploads (no cloud storage configured).
// When S3 or Supabase is configured, the client uploads directly via presigned URL
// and this endpoint is never called.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const { token, docId } = await params;
  const record = await getTokenRecord(token);

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (hasS3Config() || hasSupabaseStorageConfig()) {
    return NextResponse.json(
      { success: false, data: null, error: "Use the presigned URL to upload" },
      { status: 400 }
    );
  }

  const document = await prisma.document.findFirst({
    where: { id: docId, dealId: record.deal.id },
  });

  if (!document) {
    return NextResponse.json(
      { success: false, data: null, error: "Document not found" },
      { status: 404 }
    );
  }

  try {
    const buffer = Buffer.from(await req.arrayBuffer());
    const contentType = req.headers.get("content-type") ?? "application/octet-stream";
    await uploadFile(document.s3Key, buffer, contentType);
    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    console.error(`[upload-data] Failed to store file for ${docId}:`, err);
    return NextResponse.json(
      { success: false, data: null, error: "Failed to store file. Please try again." },
      { status: 500 }
    );
  }
}

// POST — called after the file has been uploaded to storage (cloud or local).
// Triggers validation and all post-validation logic via after() so Vercel
// keeps the function alive past the HTTP response.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
): Promise<NextResponse<ApiResponse<{ documentId: string; status: "VALIDATING" }>>> {
  const { token, docId } = await params;
  const record = await getTokenRecord(token);

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const document = await prisma.document.findFirst({
    where: { id: docId, dealId: record.deal.id },
    include: { deal: true },
  });

  if (!document) {
    return NextResponse.json(
      { success: false, data: null, error: "Document not found" },
      { status: 404 }
    );
  }

  const { deal, s3Key } = document;

  after(async () => {
    try {
      await validateDocument(docId, s3Key);

      const checklist = await prisma.documentChecklist.findMany({
        where: { dealId: deal.id, required: true },
      });
      const allValidated = checklist.length > 0 && checklist.every((item) => item.validated);

      if (!allValidated) return;

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
          console.error("[complete] Failed to email banker:", err);
        });
      }

      runConsistencyCheck(deal.id).catch((err) => {
        console.error(`[runConsistencyCheck] Failed for ${deal.id}:`, err);
      });
    } catch (err) {
      console.error(`[complete] Post-upload processing failed for ${docId}:`, err);
    }
  });

  return NextResponse.json(
    { success: true, data: { documentId: docId, status: "VALIDATING" }, error: null },
    { status: 202 }
  );
}
