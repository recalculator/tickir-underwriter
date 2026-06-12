import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { MEMO_SECTIONS, editMemoSection, regenerateMemoSection, type MemoSectionsJson } from "@/lib/creditMemo";
import { errorStatus } from "@/lib/api-errors";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string; section: string }> };

const editSchema = z.object({
  content: z.string().min(1, "Content is required").max(20000, "Content is too long"),
});

const regenerateSchema = z.object({
  force: z.boolean().optional().default(false),
});

function isMemoSection(value: string): value is (typeof MEMO_SECTIONS)[number] {
  return (MEMO_SECTIONS as readonly string[]).includes(value);
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, section } = await params;
  if (!isMemoSection(section)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Invalid memo section" },
      { status: 400 }
    );
  }

  const deal = await prisma.deal.findFirst({ where: { id, bankId: session.user.bankId } });
  if (!deal) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const memo = await prisma.creditMemo.findUnique({ where: { dealId: id } });
  if (!memo) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Credit memo not found — generate it first" },
      { status: 404 }
    );
  }
  if (memo.status === "FINALIZED") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "This memo has been finalized and can no longer be edited" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    await editMemoSection(id, section, sanitizeString(parsed.data.content), session.user.id);
    return NextResponse.json({ success: true, data: { section }, error: null });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Failed to save section" },
      { status: 500 }
    );
  }
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

  const { id, section } = await params;
  if (!isMemoSection(section)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Invalid memo section" },
      { status: 400 }
    );
  }

  const deal = await prisma.deal.findFirst({ where: { id, bankId: session.user.bankId } });
  if (!deal) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const memo = await prisma.creditMemo.findUnique({ where: { dealId: id } });
  if (!memo) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Credit memo not found — generate it first" },
      { status: 404 }
    );
  }
  if (memo.status === "FINALIZED") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "This memo has been finalized and can no longer be regenerated" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = regenerateSchema.safeParse(body ?? {});
  const force = parsed.success ? parsed.data.force : false;

  const sections = (memo.sectionsJson as MemoSectionsJson) ?? {};
  const existingSection = sections[section];
  if (existingSection && existingSection.aiGenerated === false && !force) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "This section has manual edits. Confirm to overwrite with a regenerated draft." },
      { status: 409 }
    );
  }

  try {
    await regenerateMemoSection(id, section, session.user.id);
    return NextResponse.json({ success: true, data: { section }, error: null });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "Failed to regenerate section" },
      { status: errorStatus(err) }
    );
  }
}
