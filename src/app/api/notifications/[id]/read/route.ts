import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, recipientId: session.user.id },
  });

  if (!notification) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Notification not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
    include: { deal: { select: { internalName: true, borrowerName: true } } },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}
