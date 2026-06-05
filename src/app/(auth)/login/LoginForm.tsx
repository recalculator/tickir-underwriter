"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TickrLogo } from "@/components/TickrLogo";

function BrandMark() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <TickrLogo size={40} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Tickr AI</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: 2 }}>AI CREDIT OS</div>
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
      <div style={{ width: "100%", maxWidth: 420 }}>
        <BrandMark />

        <div style={{
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--line-2)",
          background: "var(--panel)",
          padding: 28,
          boxShadow: "var(--shadow)",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            Sign in to your account
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--ink-4)" }}>Bank staff sign in below</p>

          {justRegistered && (
            <div style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--accent-glow)",
              border: "1px solid var(--accent-deep)",
              fontSize: 13,
              color: "var(--accent)",
            }}>
              Account created! Please sign in.
            </div>
          )}

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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="you@yourbank.com"
              />
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>

          <div style={{
            marginTop: 18,
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            background: "var(--panel-2)",
            fontSize: 12,
            color: "var(--ink-4)",
          }}>
            Are you a borrower? Check your email for the secure upload link your banker sent you. No login needed.
          </div>
        </div>
      </div>
    </div>
  );
}
