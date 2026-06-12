import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { generateLendingAdvisory, recordLendingDecision } from "@/lib/lendingDecision";
import { errorStatus } from "@/lib/api-errors";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "DECLINE", "REFER_TO_COMMITTEE"]),
  notes: z.string().min(1, "Notes are required").max(10000, "Notes are too long"),
});

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const decision = await prisma.lendingDecision.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
  });

  if (!decision) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No lending decision record found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: decision, error: null });
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!apiLimiter(ip)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const deal = await prisma.deal.findFirst({ where: { id, bankId: session.user.bankId } });
  if (!deal) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const lockedSpread = await prisma.spread.findFirst({
    where: { dealId: id, lockedAt: { not: null } },
  });
  if (!lockedSpread) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "A locked spread is required before generating a lending advisory" },
      { status: 409 }
    );
  }

  try {
    const decisionId = await generateLendingAdvisory(id, session.user.id);
    return NextResponse.json({ success: true, data: { decisionId }, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Advisory generation failed" },
      { status: errorStatus(err) }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const deal = await prisma.deal.findFirst({ where: { id, bankId: session.user.bankId } });
  if (!deal) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    await recordLendingDecision(
      id,
      parsed.data.decision,
      sanitizeString(parsed.data.notes),
      session.user.id
    );
    return NextResponse.json({ success: true, data: { recorded: true }, error: null });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Failed to record decision" },
      { status: errorStatus(err) }
    );
  }
}
