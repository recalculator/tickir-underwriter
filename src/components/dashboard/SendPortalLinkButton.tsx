"use client";

type Props = { dealId: string };

export function SendPortalLinkButton({ dealId }: Props) {
  async function handleClick() {
    try {
      const res = await fetch(`/api/deals/${dealId}/portal-link`, { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        const url = data.data?.portalUrl ?? data.data?.url ?? "";
        if (url) await navigator.clipboard.writeText(url).catch(() => null);
        alert(`Portal link copied to clipboard:\n${url}`);
      }
    } catch {
      alert("Failed to generate portal link.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Send Portal Link
    </button>
  );
}
