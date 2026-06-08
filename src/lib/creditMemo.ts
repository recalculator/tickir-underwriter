import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import { LOAN_TYPE_LABELS } from "@/lib/constants";

export const MEMO_SECTIONS = [
  "loanSummary",
  "borrowerOverview",
  "financialAnalysis",
  "riskFactors",
  "strengths",
  "recommendation",
] as const;

export type MemoSectionKey = (typeof MEMO_SECTIONS)[number];

export const MEMO_SECTION_LABELS: Record<MemoSectionKey, string> = {
  loanSummary: "Loan Summary",
  borrowerOverview: "Borrower Overview",
  financialAnalysis: "Financial Analysis",
  riskFactors: "Risk Factors",
  strengths: "Strengths",
  recommendation: "Recommendation",
};

export type MemoSection = {
  content: string;
  aiGenerated: boolean;
  generatedAt?: string | null;
  editedByUserId?: string | null;
  editedAt?: string | null;
};

export type MemoSectionsJson = Partial<Record<MemoSectionKey, MemoSection>>;

type SpreadCellSummary = {
  cellRef: string;
  label: string | null;
  value: string | null;
  correctedValue: string | null;
  confidenceTier: string;
  flagReason: string | null;
};

type MemoContext = {
  dealId: string;
  bankId: string;
  spreadId: string | null;
  borrowerName: string;
  loanType: string;
  loanAmount: string;
  internalName: string;
  cells: SpreadCellSummary[];
};

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function fallbackContent(section: MemoSectionKey): string {
  return `AI generation is unavailable — no ANTHROPIC_API_KEY is configured for this bank. Draft the "${MEMO_SECTION_LABELS[section]}" section manually, then save your edits.`;
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

async function buildMemoContext(dealId: string): Promise<MemoContext> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);

  const lockedSpread = await prisma.spread.findFirst({
    where: { dealId, lockedAt: { not: null } },
    orderBy: { lockedAt: "desc" },
    include: {
      spreadCells: true,
      template: true,
    },
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

  return {
    dealId: deal.id,
    bankId: deal.bankId,
    spreadId: lockedSpread?.id ?? null,
    borrowerName: deal.borrowerName,
    loanType: LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType,
    loanAmount: formatCurrency(deal.loanAmount.toString()),
    internalName: deal.internalName,
    cells,
  };
}

function buildSectionPrompt(section: MemoSectionKey, ctx: MemoContext): string {
  const header = `You are assisting a commercial loan underwriter by drafting one section of an internal credit memo.
You are NOT making any lending decision — you are producing a clear, professional draft for a human banker to review, edit, and finalize.

DEAL: ${ctx.internalName}
BORROWER: ${ctx.borrowerName}
LOAN TYPE: ${ctx.loanType}
REQUESTED AMOUNT: ${ctx.loanAmount}

SPREAD DATA (from the locked financial spread, cite specific cellRef/value/confidence when relevant):
${formatCellsTable(ctx.cells)}
`;

  const instructions: Record<MemoSectionKey, string> = {
    loanSummary:
      "Write a concise 2-4 sentence loan summary: borrower name, requested amount, loan type, and purpose (infer purpose from loan type if not stated). Keep it factual and neutral.",
    borrowerOverview:
      "Write a short borrower overview paragraph covering what can be reasonably inferred about the borrower's business and creditworthiness from the available information. If information is limited, say so plainly rather than speculating.",
    financialAnalysis:
      "Write a financial analysis section that walks through the key figures from the spread data above. Cite specific cellRef values and explicitly call out any RED or YELLOW confidence-tier cells or flagged figures that the banker should double check. Use clear paragraph form, not just a list.",
    riskFactors:
      "Identify 3-6 specific risk factors for this loan, grounded in the spread data and loan characteristics (e.g., low confidence figures, concentration risk, leverage, loan-to-value, industry/loan-type risk). Format as a short bulleted list, each with a one-sentence explanation.",
    strengths:
      "Identify 3-6 specific strengths or mitigating factors that support this loan, grounded in the spread data and loan characteristics. Format as a short bulleted list, each with a one-sentence explanation.",
    recommendation:
      "Write a balanced closing recommendation paragraph that weighs the strengths and risk factors above and suggests what the credit committee should focus on when making its decision. Do NOT issue a final approve/decline verdict yourself — frame this as guidance to inform the human decision-maker.",
  };

  return `${header}
TASK: ${instructions[section]}

Return ONLY the section text as plain prose/markdown (no JSON, no headings, no preamble like "Here is the section"). Keep it professional, concise, and grounded strictly in the information provided — never invent figures that aren't in the spread data.`;
}

async function generateSectionContent(section: MemoSectionKey, ctx: MemoContext): Promise<string> {
  const prompt = buildSectionPrompt(section, ctx);
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  return textBlock.text.trim();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function generateCreditMemo(dealId: string, userId: string): Promise<string> {
  const ctx = await buildMemoContext(dealId);
  if (!ctx.spreadId) {
    throw new Error("A locked spread is required before generating a credit memo");
  }

  const memo = await prisma.creditMemo.upsert({
    where: { dealId },
    create: { dealId, bankId: ctx.bankId, spreadId: ctx.spreadId, status: "GENERATING" },
    update: { status: "GENERATING", spreadId: ctx.spreadId },
  });

  let sectionsJson: MemoSectionsJson = {};

  if (!hasAnthropicKey()) {
    sectionsJson = Object.fromEntries(
      MEMO_SECTIONS.map((section) => [
        section,
        { content: fallbackContent(section), aiGenerated: true, generatedAt: nowIso() } satisfies MemoSection,
      ])
    );
  } else {
    const results = await Promise.allSettled(
      MEMO_SECTIONS.map((section) => generateSectionContent(section, ctx))
    );

    sectionsJson = Object.fromEntries(
      MEMO_SECTIONS.map((section, i) => {
        const result = results[i];
        const content =
          result.status === "fulfilled"
            ? result.value
            : `Could not generate this section automatically (${result.reason instanceof Error ? result.reason.message : "unknown error"}). Please draft it manually.`;
        return [section, { content, aiGenerated: true, generatedAt: nowIso() } satisfies MemoSection];
      })
    );
  }

  await prisma.creditMemo.update({
    where: { id: memo.id },
    data: {
      status: "DRAFT",
      sectionsJson: sectionsJson as object,
      generatedByUserId: userId,
      generatedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: ctx.bankId,
      userId,
      actionType: "CREDIT_MEMO_GENERATED",
      metadataJson: { spreadId: ctx.spreadId },
    },
  });

  return memo.id;
}

export async function regenerateMemoSection(
  dealId: string,
  section: MemoSectionKey,
  userId: string
): Promise<void> {
  const ctx = await buildMemoContext(dealId);
  if (!ctx.spreadId) {
    throw new Error("A locked spread is required before generating a credit memo");
  }

  const memo = await prisma.creditMemo.findUnique({ where: { dealId } });
  if (!memo) throw new Error("Credit memo not found — generate the memo first");

  const content = hasAnthropicKey()
    ? await generateSectionContent(section, ctx)
    : fallbackContent(section);

  const existing = (memo.sectionsJson as MemoSectionsJson) ?? {};
  const updated: MemoSectionsJson = {
    ...existing,
    [section]: { content, aiGenerated: true, generatedAt: nowIso(), editedByUserId: null, editedAt: null },
  };

  await prisma.creditMemo.update({
    where: { id: memo.id },
    data: { sectionsJson: updated as object },
  });

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: ctx.bankId,
      userId,
      actionType: "CREDIT_MEMO_SECTION_REGENERATED",
      metadataJson: { section },
    },
  });
}

export async function editMemoSection(
  dealId: string,
  section: MemoSectionKey,
  content: string,
  userId: string
): Promise<void> {
  const memo = await prisma.creditMemo.findUnique({ where: { dealId } });
  if (!memo) throw new Error("Credit memo not found — generate the memo first");

  const existing = (memo.sectionsJson as MemoSectionsJson) ?? {};
  const updated: MemoSectionsJson = {
    ...existing,
    [section]: { content, aiGenerated: false, editedByUserId: userId, editedAt: nowIso() },
  };

  await prisma.creditMemo.update({
    where: { id: memo.id },
    data: { sectionsJson: updated as object },
  });

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: memo.bankId,
      userId,
      actionType: "CREDIT_MEMO_SECTION_EDITED",
      metadataJson: { section },
    },
  });
}
