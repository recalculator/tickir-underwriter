import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import {
  DEAL_STAGES,
  DOC_TYPES_BY_LOAN_TYPE,
  DOC_TYPE_LABELS,
  LOAN_TYPES,
} from "@/lib/constants";
import type { ApiResponse, PaginatedResponse, DealListItem } from "@/types";
import type { Deal } from "@prisma/client";

const createDealSchema = z.object({
  borrowerName: z.string().min(1, "Borrower name is required"),
  borrowerEmail: z.string().email("Invalid borrower email"),
  borrowerPhone: z.string().optional(),
  loanType: z.enum(LOAN_TYPES),
  loanAmount: z.number().positive("Loan amount must be positive"),
  internalName: z.string().min(1, "Internal name is required"),
});

const listDealsQuerySchema = z.object({
  stage: z.enum(DEAL_STAGES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function getDaysInStage(deal: Deal): number {
  const now = new Date();
  const diff = now.getTime() - deal.updatedAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<PaginatedResponse<DealListItem> | ApiResponse<null>>> {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!apiLimiter(ip)) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const queryResult = listDealsQuerySchema.safeParse({
    stage: searchParams.get("stage") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 20,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, data: null, error: queryResult.error.message },
      { status: 400 }
    );
  }

  const { stage, page, limit } = queryResult.data;
  const skip = (page - 1) * limit;

  const where = {
    bankId: session.user.bankId,
    ...(stage ? { stage } : {}),
    ...(session.user.role === "BANKER" ? { bankerId: session.user.id } : {}),
  };

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        documentChecklist: { select: { required: true, uploaded: true } },
        activityLogs: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  const items: DealListItem[] = deals.map((deal) => ({
    id: deal.id,
    borrowerName: deal.borrowerName,
    loanType: deal.loanType,
    loanAmount: Number(deal.loanAmount),
    stage: deal.stage,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    internalName: deal.internalName,
    documentsUploaded: deal.documentChecklist.filter((d) => d.uploaded).length,
    documentsRequired: deal.documentChecklist.filter((d) => d.required).length,
    lastActivityAt: deal.activityLogs[0]?.createdAt ?? null,
    daysInStage: getDaysInStage(deal),
  }));

  return NextResponse.json({
    success: true,
    data: items,
    error: null,
    meta: { total, page, limit },
  });
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<Deal>>> {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!apiLimiter(ip)) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
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

  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.message },
      { status: 422 }
    );
  }

  const {
    borrowerEmail,
    borrowerPhone,
    loanType,
    loanAmount,
  } = parsed.data;

  const borrowerName = sanitizeString(parsed.data.borrowerName);
  const internalName = sanitizeString(parsed.data.internalName);

  const docTypes = DOC_TYPES_BY_LOAN_TYPE[loanType];
  const checklistItems = docTypes.map((docType) => ({
    docType,
    bankId: session.user.bankId,
    label: DOC_TYPE_LABELS[docType] ?? docType,
    description: null,
    required: true,
    uploaded: false,
    validated: false,
  }));

  const deal = await prisma.deal.create({
    data: {
      bankId: session.user.bankId,
      bankerId: session.user.id,
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      loanType,
      loanAmount,
      internalName,
      stage: "DOCUMENT_COLLECTION",
      documentChecklist: {
        create: checklistItems,
      },
      activityLogs: {
        create: {
          bankId: session.user.bankId,
          userId: session.user.id,
          actionType: "DEAL_CREATED",
          metadataJson: { loanType, loanAmount },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: deal, error: null }, { status: 201 });
}
