import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const cellInputSchema = z.object({
  cell_ref: z.string(),
  label: z.string(),
});

const bodySchema = z.object({
  cells: z.array(cellInputSchema).min(1).max(100),
});

type EnrichedCell = {
  source_doc_type: string;
  source_form: string;
  source_line_item: string;
  extraction_instructions: string;
};

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
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

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { cells } = parsed.data;

  const prompt = `You are configuring a commercial bank loan spreading template. For each cell label below, suggest the most appropriate values for extracting that financial figure from borrower documents.

Available document types:
- BUSINESS_TAX_RETURN — IRS Form 1120, 1120-S, 1065, Schedule C, etc.
- PERSONAL_TAX_RETURN — IRS Form 1040 and schedules
- FINANCIAL_STATEMENT — CPA-prepared or internal income statement / balance sheet
- RENT_ROLL — property rent roll listing tenants, lease terms, and rent amounts
- OTHER — any other document type

Cell labels to enrich:
${cells.map((c) => `- ${c.cell_ref}: "${c.label}"`).join("\n")}

For each cell_ref, return an object with:
- source_doc_type: one of the document types above (all caps, underscored)
- source_form: the specific form, schedule, or section (e.g. "Schedule C", "Form 1120 Line 1", "Income Statement")
- source_line_item: the exact label as it typically appears in that document
- extraction_instructions: any note to help the AI find the right value (blank string if straightforward)

Return ONLY a JSON object mapping cell_ref strings to enriched objects. No other text.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    // Return unchanged cells when no API key
    const fallback = Object.fromEntries(
      cells.map((c) => [
        c.cell_ref,
        { source_doc_type: "FINANCIAL_STATEMENT", source_form: "", source_line_item: c.label, extraction_instructions: "" },
      ])
    );
    return NextResponse.json({ success: true, data: { enriched: fallback }, error: null });
  }

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No response from AI");

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    const enriched: Record<string, EnrichedCell> = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: { enriched }, error: null });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: err instanceof Error ? err.message : "AI enrichment failed" },
      { status: 500 }
    );
  }
}
