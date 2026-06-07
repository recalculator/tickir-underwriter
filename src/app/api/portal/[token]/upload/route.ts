import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildS3Key, generateUploadUrl } from "@/lib/s3";
import { portalUploadLimiter } from "@/lib/rate-limit";
import { sanitizeFilename } from "@/lib/sanitize";
import type { ApiResponse } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ACCEPTED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

type InitiateResult = {
  documentId: string;
  // Presigned URL for direct-to-storage upload. null means use the local
  // upload endpoint PUT /api/portal/[token]/upload/[docId] instead.
  uploadUrl: string | null;
  // The resolved content type the client must use when doing the PUT.
  contentType: string;
};

function resolveContentType(contentType: string, filename: string): string {
  if (contentType && ACCEPTED_TYPES.has(contentType)) return contentType;
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
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
): Promise<NextResponse<ApiResponse<InitiateResult>>> {
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

  let body: { docType?: unknown; filename?: unknown; contentType?: unknown; fileSize?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { docType, filename, contentType: rawContentType, fileSize } = body;

  if (typeof docType !== "string" || !docType) {
    return NextResponse.json(
      { success: false, data: null, error: "Missing docType" },
      { status: 400 }
    );
  }

  if (typeof filename !== "string" || !filename) {
    return NextResponse.json(
      { success: false, data: null, error: "Missing filename" },
      { status: 400 }
    );
  }

  if (typeof fileSize !== "number" || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, data: null, error: "File exceeds 50 MB limit" },
      { status: 413 }
    );
  }

  const contentType = resolveContentType(typeof rawContentType === "string" ? rawContentType : "", filename);
  const ext = path.extname(filename).toLowerCase();
  if (!ACCEPTED_TYPES.has(contentType) && !ACCEPTED_EXT.has(ext)) {
    return NextResponse.json(
      { success: false, data: null, error: "File type not accepted. Use PDF, JPG, or PNG." },
      { status: 415 }
    );
  }

  try {
    const { deal } = record;
    const s3Key = buildS3Key(deal.bankId, deal.id, filename);

    const document = await prisma.document.create({
      data: {
        dealId: deal.id,
        bankId: deal.bankId,
        docType,
        s3Key,
        originalFilename: sanitizeFilename(filename),
        fileSize,
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
        metadataJson: { docType, documentId: document.id, filename },
      },
    });

    const uploadUrl = await generateUploadUrl(s3Key, contentType);

    return NextResponse.json(
      { success: true, data: { documentId: document.id, uploadUrl, contentType }, error: null },
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
