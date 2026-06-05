import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const markAllRead = req.nextUrl.searchParams.get("markAllRead") === "true";

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { recipientId: session.user.id, read: false },
      data: { read: true },
    });
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { deal: { select: { internalName: true, borrowerName: true } } },
  });

  return NextResponse.json({ success: true, data: notifications, error: null });
}
