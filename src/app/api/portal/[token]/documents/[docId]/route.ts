import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/s3";
import type { ApiResponse } from "@/types";

async function getTokenRecord(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: { deal: true },
  });
}

export async function DELETE(
  _req: NextRequest,
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
    await deleteFile(document.s3Key);
  } catch (err) {
    console.error(`[delete-document] Storage delete failed for ${docId}:`, err);
    // Continue — still remove the DB record even if storage delete fails
  }

  await prisma.document.delete({ where: { id: docId } });

  await prisma.documentChecklist.updateMany({
    where: { dealId: record.deal.id, docType: document.docType },
    data: { uploaded: false, validated: false },
  });

  return NextResponse.json({ success: true, data: null, error: null });
}
