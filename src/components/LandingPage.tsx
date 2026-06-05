"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function handlePortalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) {
      router.push(`/portal/${trimmed}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-blue-600">LendFlow</h1>
        <p className="mt-3 text-lg text-gray-600">Commercial lending, done right.</p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">I work at a bank</h2>
          <p className="mt-2 text-sm text-gray-500">
            Access the LendFlow dashboard to manage deals and borrowers.
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">I&apos;m a borrower</h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter your upload code to access your secure document portal.
          </p>
          <form onSubmit={handlePortalSubmit} className="mt-6 space-y-3">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your upload code"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go to my portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
