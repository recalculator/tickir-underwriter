import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter } from "@/lib/rate-limit";
import { generateCreditMemo } from "@/lib/creditMemo";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const memo = await prisma.creditMemo.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
  });

  if (!memo) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No credit memo found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: memo, error: null });
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
      { success: false, data: null, error: "A locked spread is required before generating a credit memo" },
      { status: 409 }
    );
  }

  try {
    const memoId = await generateCreditMemo(id, session.user.id);
    return NextResponse.json({ success: true, data: { memoId }, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Credit memo generation failed" },
      { status: 500 }
    );
  }
}
