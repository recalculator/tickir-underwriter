import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import { downloadFile, hasS3Config } from "@/lib/s3";

type ValidationResult = {
  doc_type_match: boolean;
  quality_ok: boolean;
  issues: string[];
  confidence: number;
  borrower_message: string | null;
};

async function readFileBytes(s3Key: string): Promise<Buffer> {
  if (hasS3Config()) {
    return downloadFile(s3Key);
  }
  return fs.readFile(s3Key);
}

function isImageContentType(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

function mediaTypeFromFilename(filename: string): "image/jpeg" | "image/png" {
  return filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

export async function validateDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      deal: {
        include: {
          documentChecklist: { where: { docType: { equals: undefined } } },
        },
      },
    },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "VALIDATING" },
  });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "VALID", aiNotes: "Validation skipped (no API key)", validatedAt: new Date() },
    });
    await prisma.documentChecklist.updateMany({
      where: { dealId: document.dealId, docType: document.docType },
      data: { validated: true },
    });
    await prisma.activityLog.create({
      data: {
        dealId: document.dealId,
        bankId: document.bankId,
        userId: document.deal.bankerId,
        actionType: "DOCUMENT_VALIDATED",
        metadataJson: { documentId, status: "VALID", skipped: true },
      },
    });
    return;
  }

  try {
    const fileBytes = await readFileBytes(document.s3Key);
    const isImage = isImageContentType(document.originalFilename);

    type MessageParam = Parameters<typeof anthropic.messages.create>[0]["messages"][0];
    let messageContent: MessageParam["content"];

    if (isImage) {
      const base64 = fileBytes.toString("base64");
      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaTypeFromFilename(document.originalFilename),
            data: base64,
          },
        },
        {
          type: "text",
          text: `You are reviewing a document uploaded for a commercial loan application. The expected document type is: ${document.docType}. Review this document and return ONLY a JSON object: { "doc_type_match": boolean, "quality_ok": boolean, "issues": string[], "confidence": number, "borrower_message": string | null }. The borrower_message should be null if the document is acceptable, or a clear plain-English message if there's an issue.`,
        },
      ];
    } else {
      const textContent = fileBytes.toString("utf-8").slice(0, 12000);
      messageContent = `You are reviewing a document uploaded for a commercial loan application. The expected document type is: ${document.docType}. Here is the document content (first portion):\n\n${textContent}\n\nReturn ONLY a JSON object: { "doc_type_match": boolean, "quality_ok": boolean, "issues": string[], "confidence": number, "borrower_message": string | null }. The borrower_message should be null if the document is acceptable, or a clear plain-English message if there's an issue.`;
    }

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: messageContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const result: ValidationResult = JSON.parse(jsonMatch[0]);
    const isValid =
      result.doc_type_match && result.quality_ok && result.issues.length === 0;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: isValid ? "VALID" : "INVALID",
        aiNotes: result.borrower_message,
        validatedAt: new Date(),
      },
    });

    if (isValid) {
      await prisma.documentChecklist.updateMany({
        where: { dealId: document.dealId, docType: document.docType },
        data: { validated: true },
      });
    }

    await prisma.activityLog.create({
      data: {
        dealId: document.dealId,
        bankId: document.bankId,
        userId: document.deal.bankerId,
        actionType: "DOCUMENT_VALIDATED",
        metadataJson: {
          documentId,
          status: isValid ? "VALID" : "INVALID",
          confidence: result.confidence,
          issues: result.issues,
        },
      },
    });
  } catch (err) {
    console.error(`[validation] Error validating document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "INVALID",
        aiNotes: "Validation failed due to a system error. Please re-upload your document.",
      },
    });
  }
}
