import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PortalUploadClient } from "./PortalUploadClient";

type Props = {
  params: Promise<{ token: string }>;
};

async function validateToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: {
      deal: {
        include: {
          bank: true,
          documentChecklist: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const record = await validateToken(token);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="mt-2 text-sm text-gray-600">
            This document upload link has expired or is invalid. Please contact your banker to
            request a new link.
          </p>
        </div>
      </div>
    );
  }

  const { deal } = record;
  const checklist = deal.documentChecklist;
  const validated = checklist.filter((c) => c.validated).length;
  const total = checklist.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <span className="text-lg font-bold text-blue-600">LendFlow</span>
            <span className="ml-2 text-sm text-gray-500">— {deal.bank.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{deal.borrowerName}</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            {deal.loanType.replace(/_/g, " ").toLowerCase()}
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 flex justify-between text-sm font-medium">
            <span className="text-gray-700">Documents validated</span>
            <span className="text-gray-900">
              {validated} of {total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: total > 0 ? `${Math.round((validated / total) * 100)}%` : "0%" }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {checklist.map((item) => (
            <PortalUploadClient
              key={item.id}
              token={token}
              checklistItem={{
                id: item.id,
                docType: item.docType,
                label: item.label,
                description: item.description,
                required: item.required,
                uploaded: item.uploaded,
                validated: item.validated,
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
