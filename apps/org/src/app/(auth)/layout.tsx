"use client";

import React from "react";
import Link from "next/link";
import { ModeToggle } from "@repo/ui/components/themes/toogle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-black text-xs shadow-sm">
            UX
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
              UNIXL
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Org
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
          <ModeToggle />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center py-10">
        {children}
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-neutral-400">
        © 2025 UNIXL Technologies. Enterprise Zero-Trust Governance.
      </div>
    </div>
  );
}
