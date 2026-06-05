import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { buildS3Key, uploadFile, hasS3Config } from "@/lib/s3";
import { validateDocument } from "@/lib/validation";
import { runConsistencyCheck } from "@/lib/consistency-check";
import type { ApiResponse } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ACCEPTED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

type UploadResult = { documentId: string; status: "VALIDATING" };

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

  const { deal } = record;
  const buffer = Buffer.from(await file.arrayBuffer());

  let s3Key: string;
  let aiNotesPrefix: string | null = null;

  if (hasS3Config()) {
    s3Key = buildS3Key(deal.bankId, deal.id, file.name);
    await uploadFile(s3Key, buffer, file.type);
  } else {
    const tmpFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tmpPath = path.join("/tmp", tmpFilename);
    await fs.writeFile(tmpPath, buffer);
    s3Key = tmpPath;
    aiNotesPrefix = `[Saved to /tmp — no S3 config] `;
    console.warn(`[portal-upload] No S3 config. Saved to ${tmpPath}`);
  }

  const document = await prisma.document.create({
    data: {
      dealId: deal.id,
      bankId: deal.bankId,
      docType,
      s3Key,
      originalFilename: file.name,
      fileSize: file.size,
      status: "PENDING",
      aiNotes: aiNotesPrefix,
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

  validateDocument(document.id)
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
}
