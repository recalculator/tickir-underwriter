import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const notesSchema = z.object({
  notes: z.string().max(5000, "Notes are too long"),
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
  const deal = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
    select: { bankerNotes: true, bankerNotesUpdatedAt: true },
  });

  if (!deal) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { bankerNotes: deal.bankerNotes, bankerNotesUpdatedAt: deal.bankerNotesUpdatedAt },
    error: null,
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
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

  const body = await req.json().catch(() => null);
  const parsed = notesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const bankerNotes = sanitizeString(parsed.data.notes);
  const updated = await prisma.deal.update({
    where: { id },
    data: { bankerNotes, bankerNotesUpdatedAt: new Date() },
    select: { bankerNotes: true, bankerNotesUpdatedAt: true },
  });

  await prisma.activityLog.create({
    data: {
      dealId: id,
      bankId: deal.bankId,
      userId: session.user.id,
      actionType: "BANKER_NOTES_UPDATED",
      metadataJson: {},
    },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}
