import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import { downloadFile } from "@/lib/s3";

type ValidationResult = {
  has_required_info: boolean;
  missing_fields: string[];
  borrower_message: string | null;
};

function isImageFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

function mediaTypeFromFilename(filename: string): "image/jpeg" | "image/png" {
  return filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

async function extractPdfText(fileBytes: Buffer): Promise<string> {
  const parser = new PDFParse({ data: fileBytes });
  const result = await parser.getText();
  return result.text ?? "";
}

function buildValidationPrompt(label: string, description: string | null): string {
  const requirement = description
    ? `What the banker needs: ${description}`
    : `Document type: ${label}`;

  return `You are reviewing a document submitted for a commercial loan application. Your job is to verify the document contains the specific information the banker requires — not to judge whether it is a "real" document.

${requirement}

Carefully check whether the document provides all the required information listed above. Focus on completeness: are all the specific data points, figures, or details the banker needs actually present?

Return ONLY a JSON object with this exact shape:
{ "has_required_info": boolean, "missing_fields": string[], "borrower_message": string | null }

- has_required_info: true only if the document clearly contains everything described above
- missing_fields: list the specific pieces of information that appear absent or unreadable (empty array if nothing is missing)
- borrower_message: null if the document is complete; otherwise a plain-English message telling the borrower exactly what is missing or needs to be resubmitted`;
}

// File is expected to already be in storage before this is called.
// fileBytes is optional — if omitted, the file is downloaded from s3Key.
export async function validateDocument(
  documentId: string,
  s3Key: string,
  fileBytes?: Buffer,
): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { deal: true },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  const checklistItem = await prisma.documentChecklist.findFirst({
    where: { dealId: document.dealId, docType: document.docType },
  });

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
    const buffer = fileBytes ?? await downloadFile(s3Key);
    const isImage = isImageFilename(document.originalFilename);
    const isPdf = document.originalFilename.toLowerCase().endsWith(".pdf");

    const label = checklistItem?.label ?? document.docType;
    const description = checklistItem?.description ?? null;
    const validationPrompt = buildValidationPrompt(label, description);

    type MessageParam = Parameters<typeof anthropic.messages.create>[0]["messages"][0];
    let messageContent: MessageParam["content"];
    let extractedText: string | null = null;

    if (isImage) {
      const base64 = buffer.toString("base64");
      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaTypeFromFilename(document.originalFilename),
            data: base64,
          },
        },
        { type: "text", text: validationPrompt },
      ];
    } else if (isPdf) {
      let pdfText = "";
      try {
        pdfText = await extractPdfText(buffer);
      } catch (err) {
        console.warn(`[validation] PDF text extraction failed for ${documentId}:`, err);
      }

      if (pdfText.trim().length > 50) {
        extractedText = pdfText.slice(0, 15000);
        messageContent = `${validationPrompt}\n\nDocument content:\n\n${pdfText.slice(0, 12000)}`;
      } else {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: "INVALID",
            aiNotes:
              "Your document appears to be a scanned image without selectable text. " +
              "Please re-upload as a searchable PDF, or export directly from your software (e.g. download from IRS.gov, export from your accounting software, or use your bank's PDF statement download). " +
              "Photographed or scanned copies that have not been run through OCR cannot be verified.",
            validatedAt: new Date(),
          },
        });
        await prisma.activityLog.create({
          data: {
            dealId: document.dealId,
            bankId: document.bankId,
            userId: document.deal.bankerId,
            actionType: "DOCUMENT_VALIDATED",
            metadataJson: { documentId, status: "INVALID", reason: "scanned_pdf_no_text" },
          },
        });
        return;
      }
    } else {
      const textContent = buffer.toString("utf-8");
      extractedText = textContent.slice(0, 15000);
      messageContent = `${validationPrompt}\n\nDocument content:\n\n${textContent.slice(0, 12000)}`;
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
    const isValid = result.has_required_info && result.missing_fields.length === 0;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: isValid ? "VALID" : "INVALID",
        aiNotes: result.borrower_message,
        extractedText: extractedText ?? undefined,
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
          missingFields: result.missing_fields,
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
