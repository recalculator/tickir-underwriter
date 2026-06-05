import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string; ref: string }> };

const patchSchema = z.object({
  correctedValue: z.string(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, ref } = await params;

  const spread = await prisma.spread.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, lockedAt: true },
  });

  if (!spread) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No spread found" },
      { status: 404 }
    );
  }

  if (spread.lockedAt) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Spread is locked" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.spreadCell.update({
    where: { spreadId_cellRef: { spreadId: spread.id, cellRef: ref } },
    data: {
      correctedValue: parsed.data.correctedValue,
      correctedByUserId: session.user.id,
      correctedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}
