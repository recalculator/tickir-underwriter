import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateMappingEditor } from "@/components/admin/TemplateMappingEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function TemplateMappingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const template = await prisma.spreadTemplate.findFirst({
    where: { id, bankId: session.user.bankId },
  });

  if (!template) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Edit cell mapping JSON</p>
      </div>
      <TemplateMappingEditor
        templateId={template.id}
        initialCellsJson={JSON.stringify(template.cellsJson, null, 2)}
      />
    </div>
  );
}
