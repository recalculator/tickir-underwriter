import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import { LOAN_TYPE_LABELS } from "@/lib/constants";

export type AdvisoryRiskRating = "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
export type AdvisoryRecommendation = "APPROVE" | "DECLINE" | "REFER_TO_COMMITTEE";

type AdvisoryResult = {
  recommendation: AdvisoryRecommendation;
  confidence: number;
  risk_rating: AdvisoryRiskRating;
  rationale: string;
};

type SpreadCellSummary = {
  cellRef: string;
  label: string | null;
  value: string | null;
  correctedValue: string | null;
  confidenceTier: string;
  flagReason: string | null;
};

type AdvisoryContext = {
  dealId: string;
  bankId: string;
  spreadId: string | null;
  memoId: string | null;
  borrowerName: string;
  loanType: string;
  loanAmount: string;
  internalName: string;
  cells: SpreadCellSummary[];
};

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function formatCurrency(value: string): string {
  const num = Number(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatCellsTable(cells: SpreadCellSummary[]): string {
  if (cells.length === 0) return "(no spread cells available)";
  return cells
    .map((c) => {
      const value = c.correctedValue ?? c.value ?? "—";
      const flag = c.flagReason ? ` | flag: ${c.flagReason}` : "";
      return `- ${c.cellRef}${c.label ? ` (${c.label})` : ""}: ${value} [confidence: ${c.confidenceTier}]${flag}`;
    })
    .join("\n");
}

async function buildAdvisoryContext(dealId: string): Promise<AdvisoryContext> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);

  const lockedSpread = await prisma.spread.findFirst({
    where: { dealId, lockedAt: { not: null } },
    orderBy: { lockedAt: "desc" },
    include: { spreadCells: true, template: true },
  });

  const cellsJson = (lockedSpread?.template.cellsJson ?? {}) as Record<string, { label?: string }>;

  const cells: SpreadCellSummary[] = (lockedSpread?.spreadCells ?? []).map((cell) => ({
    cellRef: cell.cellRef,
    label: cellsJson[cell.cellRef]?.label ?? null,
    value: cell.value,
    correctedValue: cell.correctedValue,
    confidenceTier: cell.confidenceTier,
    flagReason: cell.flagReason,
  }));

  const memo = await prisma.creditMemo.findUnique({ where: { dealId }, select: { id: true } });

  return {
    dealId: deal.id,
    bankId: deal.bankId,
    spreadId: lockedSpread?.id ?? null,
    memoId: memo?.id ?? null,
    borrowerName: deal.borrowerName,
    loanType: LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType,
    loanAmount: formatCurrency(deal.loanAmount.toString()),
    internalName: deal.internalName,
    cells,
  };
}

function buildAdvisoryPrompt(ctx: AdvisoryContext): string {
  return `You are an AI assistant providing ADVISORY analysis to a human credit officer at a regional bank.

IMPORTANT: You are NOT making the lending decision. The human credit officer makes the final call — your job is solely to organize the available evidence, surface risks, and offer a structured opinion that helps them think it through faster. Always write your rationale in a way that reads as advisory input, not as a verdict (e.g., "the data suggests..." rather than "this loan is approved").

DEAL: ${ctx.internalName}
BORROWER: ${ctx.borrowerName}
LOAN TYPE: ${ctx.loanType}
REQUESTED AMOUNT: ${ctx.loanAmount}

SPREAD DATA (cite specific cellRef/value/confidence in your rationale):
${formatCellsTable(ctx.cells)}

TASK:
Based strictly on the information above, provide:
1. A recommendation: one of "APPROVE", "DECLINE", or "REFER_TO_COMMITTEE" (use REFER_TO_COMMITTEE when the evidence is mixed, incomplete, or the loan size/complexity warrants committee-level review)
2. Your confidence in that recommendation (0.0 to 1.0)
3. An overall risk rating: one of "LOW", "MODERATE", "ELEVATED", "HIGH"
4. A rationale (3-6 sentences) that cites specific cellRef values and explicitly flags any RED/YELLOW-confidence cells or missing data that should give the banker pause

Return ONLY this JSON (no other text):
{
  "recommendation": "APPROVE" | "DECLINE" | "REFER_TO_COMMITTEE",
  "confidence": <0.0 to 1.0>,
  "risk_rating": "LOW" | "MODERATE" | "ELEVATED" | "HIGH",
  "rationale": "<3-6 sentence advisory rationale citing specific spread data>"
}`;
}

function fallbackAdvisory(): AdvisoryResult {
  return {
    recommendation: "REFER_TO_COMMITTEE",
    confidence: 0,
    risk_rating: "MODERATE",
    rationale:
      "AI advisory is unavailable — no ANTHROPIC_API_KEY is configured for this bank. Please review the spread data manually and record your decision below.",
  };
}

async function callAdvisory(ctx: AdvisoryContext): Promise<AdvisoryResult> {
  const prompt = buildAdvisoryPrompt(ctx);
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 768,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract JSON from Claude response");
  return JSON.parse(jsonMatch[0]) as AdvisoryResult;
}

export async function generateLendingAdvisory(dealId: string, userId: string): Promise<string> {
  const ctx = await buildAdvisoryContext(dealId);
  if (!ctx.spreadId) {
    throw new Error("A locked spread is required before generating a lending advisory");
  }

  const result = hasAnthropicKey() ? await callAdvisory(ctx) : fallbackAdvisory();

  const decision = await prisma.lendingDecision.upsert({
    where: { dealId },
    create: {
      dealId,
      bankId: ctx.bankId,
      memoId: ctx.memoId,
      aiRecommendation: result.recommendation,
      aiConfidence: result.confidence,
      aiRiskRating: result.risk_rating,
      aiRationale: result.rationale,
      aiGeneratedAt: new Date(),
      aiGeneratedByUserId: userId,
    },
    update: {
      memoId: ctx.memoId,
      aiRecommendation: result.recommendation,
      aiConfidence: result.confidence,
      aiRiskRating: result.risk_rating,
      aiRationale: result.rationale,
      aiGeneratedAt: new Date(),
      aiGeneratedByUserId: userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: ctx.bankId,
      userId,
      actionType: "LENDING_ADVISORY_GENERATED",
      metadataJson: { recommendation: result.recommendation, riskRating: result.risk_rating },
    },
  });

  return decision.id;
}

export async function recordLendingDecision(
  dealId: string,
  decision: "APPROVE" | "DECLINE" | "REFER_TO_COMMITTEE",
  notes: string,
  userId: string
): Promise<void> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { bankId: true } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);

  await prisma.lendingDecision.upsert({
    where: { dealId },
    create: {
      dealId,
      bankId: deal.bankId,
      decision,
      decisionNotes: notes,
      decidedByUserId: userId,
      decidedAt: new Date(),
    },
    update: {
      decision,
      decisionNotes: notes,
      decidedByUserId: userId,
      decidedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: deal.bankId,
      userId,
      actionType: "LENDING_DECISION_RECORDED",
      metadataJson: { decision },
    },
  });
}
