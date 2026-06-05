"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <span className="text-sm text-gray-600">
              {session.user.name} ·{" "}
              <span className="font-medium text-gray-900 capitalize">
                {session.user.role?.toLowerCase().replace("_", " ")}
              </span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Sign out
            </button>
          </>
        )}
        {!session?.user && (
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
