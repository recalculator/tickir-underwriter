import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const TOKEN_EXPIRY_DAYS = 14;

type PortalLinkResult = { portalUrl: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PortalLinkResult>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: dealId } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, bankId: session.user.bankId },
    include: { bank: true },
  });

  if (!deal) {
    return NextResponse.json(
      { success: false, data: null, error: "Deal not found" },
      { status: 404 }
    );
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  await prisma.borrowerToken.create({
    data: { dealId, tokenHash, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const portalUrl = `${baseUrl}/portal/${rawToken}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: `LendFlow <noreply@${deal.bank.subdomain}.lendflow.app>`,
        to: deal.borrowerEmail,
        subject: `Document upload link for your loan application`,
        html: `<p>Hello ${deal.borrowerName},</p><p>Please use the link below to upload your documents:</p><p><a href="${portalUrl}">${portalUrl}</a></p><p>This link expires in ${TOKEN_EXPIRY_DAYS} days.</p>`,
      });
    } catch (err) {
      console.error("Failed to send portal email:", err);
    }
  } else {
    console.warn(`[portal-link] No RESEND_API_KEY set. Portal URL: ${portalUrl}`);
  }

  return NextResponse.json({ success: true, data: { portalUrl }, error: null });
}
