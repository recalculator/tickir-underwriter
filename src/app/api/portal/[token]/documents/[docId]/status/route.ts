import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type DocumentStatusResult = {
  documentId: string;
  status: string;
  aiNotes: string | null;
};

async function getTokenRecord(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: { deal: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
): Promise<NextResponse<ApiResponse<DocumentStatusResult>>> {
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
    select: { id: true, status: true, aiNotes: true },
  });

  if (!document) {
    return NextResponse.json(
      { success: false, data: null, error: "Document not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { documentId: document.id, status: document.status, aiNotes: document.aiNotes },
    error: null,
  });
}
