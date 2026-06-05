import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const template = await prisma.spreadTemplate.findFirst({
    where: { id, bankId: session.user.bankId },
  });

  if (!template) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: template, error: null });
}

const updateSchema = z.object({
  cellsJson: z.record(z.string(), z.unknown()),
});

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const existing = await prisma.spreadTemplate.findFirst({
    where: { id, bankId: session.user.bankId },
  });

  if (!existing) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Template not found" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.spreadTemplate.update({
    where: { id },
    data: { cellsJson: parsed.data.cellsJson as object },
  });

  return NextResponse.json({ success: true, data: updated, error: null });
}
