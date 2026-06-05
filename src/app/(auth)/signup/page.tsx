"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TickrLogo } from "@/components/TickrLogo";

type UserType = "banker" | "borrower";

function BrandMark() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <TickrLogo size={40} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Tickir AI</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: 2 }}>CREDIT OS</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--line-2)",
  background: "var(--panel-2)",
  color: "var(--ink)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-3)",
};

export default function SignupPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>("banker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    bankName: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to create account");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-deep)",
      padding: "0 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <BrandMark />

        <div style={{
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--line-2)",
          background: "var(--panel)",
          padding: 28,
          boxShadow: "var(--shadow)",
        }}>
          {/* User type selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            <button
              type="button"
              onClick={() => setUserType("banker")}
              style={{
                padding: "14px 12px",
                borderRadius: "var(--r-md)",
                border: `2px solid ${userType === "banker" ? "var(--accent)" : "var(--line-2)"}`,
                background: userType === "banker" ? "var(--accent-glow)" : "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                I&apos;m a Banker / Bank Staff
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-4)" }}>
                Create your bank&apos;s Tickir AI account
              </p>
            </button>

            <button
              type="button"
              onClick={() => setUserType("borrower")}
              style={{
                padding: "14px 12px",
                borderRadius: "var(--r-md)",
                border: `2px solid ${userType === "borrower" ? "var(--line-2)" : "var(--line)"}`,
                background: userType === "borrower" ? "var(--panel-2)" : "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Lock size={13} style={{ marginTop: 2, color: "var(--ink-4)", flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>I&apos;m a Borrower</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-4)" }}>
                    Your banker will send you a secure link. No account needed.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {userType === "borrower" ? (
            <div style={{
              padding: "14px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--accent-glow)",
              border: "1px solid var(--accent-deep)",
              fontSize: 13,
              color: "var(--ink-2)",
            }}>
              Your banker will email you a secure upload link. No account needed — just check your email.
            </div>
          ) : (
            <>
              <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                Create your account
              </h2>

              {error && (
                <div style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: "var(--r-md)",
                  background: "rgba(224,90,90,0.12)",
                  border: "1px solid rgba(224,90,90,0.3)",
                  fontSize: 13,
                  color: "var(--s-dec)",
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { id: "bankName", label: "Bank Name", type: "text", placeholder: "First National Bank", field: "bankName" as const },
                  { id: "name", label: "Your Name", type: "text", placeholder: "Jane Smith", field: "name" as const },
                  { id: "email", label: "Email", type: "email", placeholder: "jane@firstnational.com", field: "email" as const },
                  { id: "password", label: "Password", type: "password", placeholder: "••••••••", field: "password" as const },
                  { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "••••••••", field: "confirmPassword" as const },
                ].map(({ id, label, type, placeholder, field }) => (
                  <div key={id}>
                    <label htmlFor={id} style={labelStyle}>{label}</label>
                    <input
                      id={id}
                      type={type}
                      required
                      value={form[field]}
                      onChange={(e) => updateField(field, e.target.value)}
                      style={inputStyle}
                      placeholder={placeholder}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    marginTop: 4,
                  }}
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
