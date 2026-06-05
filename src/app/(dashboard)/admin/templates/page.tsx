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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Spread Templates</h1>
        <Link
          href="/admin/templates/new"
          style={{
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px dashed var(--line)",
          background: "var(--panel)",
          padding: "80px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: 0 }}>No templates yet</p>
          <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-3)" }}>Create your first spread template.</p>
        </div>
      ) : (
        <ul className="space-y-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {templates.map((t) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "var(--r-lg)",
                border: "1px solid var(--line)",
                background: "var(--panel)",
                padding: "16px 20px",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--ink)", fontSize: 14 }}>{t.name}</span>
              <Link
                href={`/admin/templates/${t.id}`}
                style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
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
