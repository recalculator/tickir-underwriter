import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import { downloadFile, hasS3Config } from "@/lib/s3";

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

type DocumentRecord = {
  id: string;
  s3Key: string;
  originalFilename: string;
  docType: string;
  extractedText?: string | null;
};

function confidenceTier(confidence: number): "GREEN" | "YELLOW" | "RED" {
  if (confidence >= 0.9) return "GREEN";
  if (confidence >= 0.7) return "YELLOW";
  return "RED";
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function isImageFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

function mediaTypeFromFilename(filename: string): "image/jpeg" | "image/png" {
  return filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

async function readFileBytes(s3Key: string): Promise<Buffer> {
  if (hasS3Config()) {
    return downloadFile(s3Key);
  }
  const localPath = path.join(process.cwd(), ".local-uploads", s3Key);
  return fs.readFile(localPath);
}

export async function extractDocumentText(document: {
  s3Key: string;
  originalFilename: string;
  docType: string;
}): Promise<string> {
  try {
    if (isImageFilename(document.originalFilename)) {
      return `[Image document: ${document.docType}. File: ${document.originalFilename}]`;
    }

    const buffer = await readFileBytes(document.s3Key);

    if (isPdfFilename(document.originalFilename)) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const data = await parser.getText();
      return data.text.slice(0, 15000);
    }

    // For other text-like files, decode as UTF-8
    return buffer.toString("utf-8").slice(0, 15000);
  } catch {
    return "(could not extract text from document)";
  }
}

function yearLabel(yearOffset: number | undefined): string {
  if (yearOffset === 0 || yearOffset === undefined) return "Most recent fiscal year";
  if (yearOffset === -1) return "Prior year (1 year ago)";
  if (yearOffset === -2) return "2 years ago";
  return `Year offset ${yearOffset}`;
}

function buildTextPrompt(cell: CellDef, cellRef: string, extractedText: string): string {
  return `You are a commercial loan underwriter extracting a specific financial figure.

FIELD: ${cell.label ?? cellRef} (cell ${cellRef})
DOCUMENT TYPE: ${cell.source_doc_type ?? "any"}
SECTION/FORM: ${cell.source_form ?? "any"}
EXACT LINE ITEM: ${cell.source_line_item ?? "any"}
YEAR: ${yearLabel(cell.year_offset)}
SPECIAL INSTRUCTIONS: ${cell.extraction_instructions ?? "none"}

DOCUMENT TEXT:
${extractedText}

Find the exact dollar amount for "${cell.source_line_item ?? cell.label ?? cellRef}".
- If found directly: return high confidence (0.90+)
- If calculated from related lines: return medium confidence (0.70-0.89) and explain the calculation
- If not found: return null value with confidence 0 and explain why

Return ONLY this JSON (no other text):
{
  "value": <number in dollars, no commas, or null>,
  "confidence": <0.0 to 1.0>,
  "source_doc": "<filename or doc type>",
  "source_page": <page number or null>,
  "source_line": "<exact label as it appears in the document>",
  "formula_explanation": "<step-by-step if calculated, empty string if direct>",
  "flag_reason": "<null if confident, or explanation of uncertainty>"
}`;
}

type ImageCacheEntry = { base64: string; mediaType: "image/jpeg" | "image/png" };

async function extractCellWithClaude(
  cell: CellDef,
  cellRef: string,
  matchingDoc: DocumentRecord | undefined,
  docTextCache: Map<string, string>,
  imageCache: Map<string, ImageCacheEntry>
): Promise<ExtractionResult> {
  let response;

  if (!matchingDoc) {
    const prompt = buildTextPrompt(cell, cellRef, "(no matching document uploaded)");
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
  } else if (isImageFilename(matchingDoc.originalFilename)) {
    const cached = imageCache.get(matchingDoc.id);
    if (!cached) throw new Error("Image not pre-cached");
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: cached.mediaType, data: cached.base64 } },
            {
              type: "text",
              text: `You are a commercial loan underwriter extracting a specific financial figure from this document image.

FIELD: ${cell.label ?? cellRef} (cell ${cellRef})
DOCUMENT TYPE: ${cell.source_doc_type ?? "any"}
SECTION/FORM: ${cell.source_form ?? "any"}
EXACT LINE ITEM: ${cell.source_line_item ?? "any"}
YEAR: ${yearLabel(cell.year_offset)}
SPECIAL INSTRUCTIONS: ${cell.extraction_instructions ?? "none"}

Find the exact dollar amount for "${cell.source_line_item ?? cell.label ?? cellRef}".
Return ONLY this JSON (no other text):
{
  "value": <number in dollars, no commas, or null>,
  "confidence": <0.0 to 1.0>,
  "source_doc": "<filename or doc type>",
  "source_page": <page number or null>,
  "source_line": "<exact label as it appears in the document>",
  "formula_explanation": "<step-by-step if calculated, empty string if direct>",
  "flag_reason": "<null if confident, or explanation of uncertainty>"
}`,
            },
          ],
        },
      ],
    });
  } else {
    const docText = docTextCache.get(matchingDoc.id) ?? "(no document text available)";
    const prompt = buildTextPrompt(cell, cellRef, docText);
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract JSON from Claude response");
  return JSON.parse(jsonMatch[0]) as ExtractionResult;
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
    data: { dealId, bankId: deal.bankId, templateId },
  });

  const cellsJson = template.cellsJson as Record<string, CellDef>;
  const cellEntries = Object.entries(cellsJson).filter(
    ([, cell]) => (cell.cell_type ?? "input") === "input"
  );

  if (!hasAnthropicKey()) {
    await Promise.all(
      cellEntries.map(([cellRef, cell]) =>
        prisma.spreadCell.create({
          data: {
            spreadId: spread.id,
            bankId: deal.bankId,
            cellRef,
            value: null,
            confidence: 0.95,
            confidenceTier: "GREEN",
            sourceDoc: cell.source_doc_type ?? null,
            sourcePage: null,
            formulaExplanation: null,
            flagReason: null,
          },
        })
      )
    );
    return spread.id;
  }

  // Pre-cache extracted text and image buffers for all documents
  const docTextCache = new Map<string, string>();
  const imageCache = new Map<string, ImageCacheEntry>();

  await Promise.all(
    (documents as DocumentRecord[]).map(async (doc) => {
      if (isImageFilename(doc.originalFilename)) {
        const buffer = await readFileBytes(doc.s3Key);
        imageCache.set(doc.id, {
          base64: buffer.toString("base64"),
          mediaType: mediaTypeFromFilename(doc.originalFilename),
        });
      } else {
        const text = doc.extractedText ?? await extractDocumentText(doc);
        docTextCache.set(doc.id, text);
        if (!doc.extractedText) {
          await prisma.document.update({ where: { id: doc.id }, data: { extractedText: text } });
        }
      }
    })
  );

  // Process all cells in parallel
  await Promise.allSettled(
    cellEntries.map(async ([cellRef, cell]) => {
      const matchingDoc = (documents as DocumentRecord[]).find(
        (d) => !cell.source_doc_type || d.docType === cell.source_doc_type
      );
      try {
        const result = await extractCellWithClaude(cell, cellRef, matchingDoc, docTextCache, imageCache);
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
            sourceLine: result.source_line ?? null,
            formulaExplanation: result.formula_explanation || null,
            flagReason: result.flag_reason ?? null,
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
    })
  );

  return spread.id;
}
