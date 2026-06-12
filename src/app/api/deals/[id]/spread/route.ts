import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runSpreading } from "@/lib/spreading";
import { errorStatus } from "@/lib/api-errors";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const postSchema = z.object({
  templateId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const spreadId = await runSpreading(id, parsed.data.templateId);
    return NextResponse.json({ success: true, data: { spreadId }, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Spreading failed" },
      { status: errorStatus(err) }
    );
  }
}

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
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
    include: { spreadCells: true, template: { select: { name: true } } },
  });

  if (!spread) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No spread found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: spread, error: null });
}
