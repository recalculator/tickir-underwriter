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

  if (!["ADMIN", "CREDIT_OFFICER"].includes(session.user.role)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Only credit officers or admins can finalize a credit memo" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const memo = await prisma.creditMemo.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
  });

  if (!memo) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Credit memo not found" },
      { status: 404 }
    );
  }

  if (memo.status === "FINALIZED") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "This memo is already finalized" },
      { status: 409 }
    );
  }

  if (memo.status === "GENERATING") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "This memo is still generating — please wait" },
      { status: 409 }
    );
  }

  const updated = await prisma.creditMemo.update({
    where: { id: memo.id },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedByUserId: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      dealId: id,
      bankId: session.user.bankId,
      userId: session.user.id,
      actionType: "CREDIT_MEMO_FINALIZED",
      metadataJson: {},
    },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}
