import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEAL_STAGES } from "@/lib/constants";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const TERMINAL_STAGES = new Set(["CLOSED", "DECLINED"]);

function nextStage(current: string): string | null {
  const idx = DEAL_STAGES.indexOf(current as (typeof DEAL_STAGES)[number]);
  if (idx === -1 || TERMINAL_STAGES.has(current)) return null;
  const next = DEAL_STAGES[idx + 1];
  return next ?? null;
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

  const next = nextStage(deal.stage);
  if (!next) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal is already at a terminal stage" },
      { status: 400 }
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.deal.update({
      where: { id },
      data: { stage: next as (typeof DEAL_STAGES)[number] },
    }),
    prisma.activityLog.create({
      data: {
        dealId: id,
        bankId: deal.bankId,
        userId: session.user.id,
        actionType: "STAGE_ADVANCED",
        metadataJson: { from: deal.stage, to: next },
      },
    }),
  ]);

  return NextResponse.json({ success: true, data: updated, error: null });
}
