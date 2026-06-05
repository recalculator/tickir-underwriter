import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";

type ConsistencyIssue = {
  field: string;
  doc1: string;
  doc1Value: string;
  doc2: string;
  doc2Value: string;
  variancePct: number;
};

type ConsistencyResult = {
  hasIssues: boolean;
  issues: ConsistencyIssue[];
};

export async function runConsistencyCheck(dealId: string): Promise<void> {
  const documents = await prisma.document.findMany({
    where: { dealId, status: "VALID" },
    include: { deal: true },
  });

  if (documents.length < 2) {
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.warn(`[consistency-check] Skipping for deal ${dealId}: no API key`);
    return;
  }

  const deal = documents[0].deal;
  const snippets = documents
    .map((d, i) => `Document ${i + 1} (${d.docType}): ${d.aiNotes ?? "(no extracted text)"}`)
    .join("\n\n");

  const prompt = `You are a commercial loan underwriter. Review these financial documents for a loan application and identify any inconsistencies (>10% variance on key figures like revenue, net income, etc). Return ONLY JSON: { "hasIssues": boolean, "issues": Array<{ "field": string, "doc1": string, "doc1Value": string, "doc2": string, "doc2Value": string, "variancePct": number }> }

${snippets}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude in consistency check");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from consistency check response");
  }

  const result: ConsistencyResult = JSON.parse(jsonMatch[0]);

  await prisma.activityLog.create({
    data: {
      dealId,
      bankId: deal.bankId,
      userId: deal.bankerId,
      actionType: "CONSISTENCY_CHECK",
      metadataJson: { hasIssues: result.hasIssues, issues: result.issues },
    },
  });

  if (result.hasIssues) {
    await prisma.notification.create({
      data: {
        bankId: deal.bankId,
        recipientType: "BANKER",
        recipientId: deal.bankerId,
        dealId,
        channel: "IN_APP",
        template: `Consistency issues found in documents for deal: ${deal.internalName}`,
        read: false,
      },
    });
  }
}
