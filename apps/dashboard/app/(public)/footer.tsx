import React from "react";
import Link from "next/link";
import { Layers, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-500 py-12 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand & Status */}
          <div className="col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="size-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary shadow-xs group-hover:border-primary/60 transition-colors">
                <Layers className="size-3.5 text-primary" />
              </div>
              <span className="font-bold text-sm text-white tracking-tight font-mono">
                UNIXL
              </span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              The visual DAG platform for operational spreadsheet automation,
              multi-sheet reconciliations, and time-series analytics.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (v2.4)</span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-2.5">
            <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">
              Product
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#interactive-showcase" className="hover:text-zinc-200 transition-colors">
                  Visual Studio
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-zinc-200 transition-colors">
                  Desk Interface
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-zinc-200 transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-zinc-200 transition-colors">
                  Workspace Files
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-zinc-200 transition-colors">
                  Tutorial Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-2.5">
            <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">
              Solutions
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#use-cases" className="hover:text-zinc-200 transition-colors">
                  Education & Attendance
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className="hover:text-zinc-200 transition-colors">
                  Payroll & Timesheets
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className="hover:text-zinc-200 transition-colors">
                  Lead Deduplication
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className="hover:text-zinc-200 transition-colors">
                  Inventory Audits
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div className="space-y-2.5">
            <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">
              Resources
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/mohit-rajput-raj/f6"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 flex items-center gap-1 transition-colors"
                >
                  GitHub <ExternalLink className="size-2.5" />
                </a>
              </li>
              <li>
                <Link href="/help" className="hover:text-zinc-200 transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-zinc-200 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-zinc-200 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 font-mono">
          <span>
            © {new Date().getFullYear()} UNIXL Technologies Inc. All rights
            reserved.
          </span>
          <span>Engineered for precision data operations.</span>
        </div>
      </div>
    </footer>
  );
}
