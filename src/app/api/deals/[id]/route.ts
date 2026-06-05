import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEAL_STAGES, LOAN_TYPES } from "@/lib/constants";
import type { ApiResponse } from "@/types";
import type { Deal } from "@prisma/client";

const updateDealSchema = z.object({
  borrowerName: z.string().min(1).optional(),
  borrowerEmail: z.string().email().optional(),
  borrowerPhone: z.string().optional(),
  loanType: z.enum(LOAN_TYPES).optional(),
  loanAmount: z.number().positive().optional(),
  internalName: z.string().min(1).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Deal>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
    include: {
      banker: { select: { id: true, name: true, email: true, role: true } },
      documents: true,
      documentChecklist: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!deal) {
    return NextResponse.json(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: deal, error: null });
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Deal>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.message },
      { status: 422 }
    );
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: {
      ...parsed.data,
      activityLogs: parsed.data.stage
        ? {
            create: {
              bankId: session.user.bankId,
              userId: session.user.id,
              actionType: "STAGE_CHANGED",
              metadataJson: { from: existing.stage, to: parsed.data.stage },
            },
          }
        : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!["ADMIN", "CREDIT_OFFICER"].includes(session.user.role)) {
    return NextResponse.json(
      { success: false, data: null, error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  await prisma.deal.delete({ where: { id } });

  return NextResponse.json({ success: true, data: null, error: null });
}
