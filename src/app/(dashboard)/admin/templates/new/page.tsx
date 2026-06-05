import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NewTemplateForm } from "@/components/admin/NewTemplateForm";

export default async function NewTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Template</h1>
      <NewTemplateForm />
    </div>
  );
}
