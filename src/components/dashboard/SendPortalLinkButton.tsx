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
      style={{
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line-2)",
        background: "var(--panel-2)",
        color: "var(--ink-2)",
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Send Portal Link
    </button>
  );
}
