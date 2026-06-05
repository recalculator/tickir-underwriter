import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = Record<string, never>;

export default async function TemplatesPage(_: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const templates = await prisma.spreadTemplate.findMany({
    where: { bankId: session.user.bankId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Spread Templates</h1>
        <Link
          href="/admin/templates/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-20 text-center">
          <p className="text-base font-medium text-gray-900">No templates yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first spread template.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
            >
              <span className="font-medium text-gray-900">{t.name}</span>
              <Link
                href={`/admin/templates/${t.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Edit Mapping
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
