import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const spread = await prisma.spread.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, lockedAt: true, dealId: true, deal: { select: { bankId: true, bankerId: true } } },
  });

  if (!spread) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No spread found" },
      { status: 404 }
    );
  }

  if (spread.lockedAt) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Spread is already locked" },
      { status: 409 }
    );
  }

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.spread.update({
      where: { id: spread.id },
      data: { lockedAt: now, lockedByUserId: session.user.id },
    }),
    prisma.activityLog.create({
      data: {
        dealId: id,
        bankId: spread.deal.bankId,
        userId: session.user.id,
        actionType: "SPREAD_LOCKED",
        metadataJson: { spreadId: spread.id },
      },
    }),
  ]);

  return NextResponse.json({ success: true, data: updated, error: null });
}
