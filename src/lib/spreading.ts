import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";

type CellDef = {
  cell_type?: string;
  label?: string;
  cell_ref?: string;
  source_doc_type?: string;
  source_form?: string;
  source_line_item?: string;
  year_offset?: number;
  extraction_instructions?: string;
};

type ExtractionResult = {
  value: number | null;
  confidence: number;
  source_doc: string;
  source_page: number | null;
  source_line: string;
  formula_explanation: string;
  flag_reason: string | null;
};

function confidenceTier(confidence: number): "GREEN" | "YELLOW" | "RED" {
  if (confidence >= 0.9) return "GREEN";
  if (confidence >= 0.7) return "YELLOW";
  return "RED";
}

export async function runSpreading(dealId: string, templateId: string): Promise<string> {
  const [template, documents, deal] = await Promise.all([
    prisma.spreadTemplate.findUnique({ where: { id: templateId } }),
    prisma.document.findMany({ where: { dealId, status: "VALID" } }),
    prisma.deal.findUnique({ where: { id: dealId } }),
  ]);

  if (!template) throw new Error(`Template ${templateId} not found`);
  if (!deal) throw new Error(`Deal ${dealId} not found`);

  const spread = await prisma.spread.create({
    data: {
      dealId,
      bankId: deal.bankId,
      templateId,
    },
  });

  const cellsJson = template.cellsJson as Record<string, CellDef>;
  const cellEntries = Object.entries(cellsJson).filter(
    ([, cell]) => (cell.cell_type ?? "input") === "input"
  );

  for (const [cellRef, cell] of cellEntries) {
    const matchingDoc = documents.find(
      (d) => !cell.source_doc_type || d.docType === cell.source_doc_type
    );

    const docText = matchingDoc?.aiNotes ?? "(no document text available)";

    const prompt = `You are a commercial loan underwriter extracting financial data.
CELL TO FILL: ${cell.label ?? cellRef} (${cellRef})
SOURCE DOCUMENT TYPE: ${cell.source_doc_type ?? "any"}
SPECIFIC FORM/SECTION: ${cell.source_form ?? "any"}
LINE ITEM: ${cell.source_line_item ?? "any"}
YEAR REQUIRED: ${cell.year_offset ?? 0} (0=current, -1=prior year)
ADDITIONAL INSTRUCTIONS: ${cell.extraction_instructions ?? "none"}
DOCUMENT TEXT: ${docText}
Return ONLY JSON: { "value": number | null, "confidence": number, "source_doc": string, "source_page": number | null, "source_line": string, "formula_explanation": string, "flag_reason": string | null }`;

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not extract JSON from Claude response");

      const result: ExtractionResult = JSON.parse(jsonMatch[0]);
      const tier = confidenceTier(result.confidence);

      await prisma.spreadCell.create({
        data: {
          spreadId: spread.id,
          bankId: deal.bankId,
          cellRef,
          value: result.value !== null ? String(result.value) : null,
          confidence: result.confidence,
          confidenceTier: tier,
          sourceDoc: result.source_doc,
          sourcePage: result.source_page,
          formulaExplanation: result.formula_explanation,
          flagReason: result.flag_reason,
        },
      });
    } catch (err) {
      await prisma.spreadCell.create({
        data: {
          spreadId: spread.id,
          bankId: deal.bankId,
          cellRef,
          value: null,
          confidence: 0,
          confidenceTier: "RED",
          flagReason: err instanceof Error ? err.message : "Extraction failed",
        },
      });
    }
  }

  return spread.id;
}
