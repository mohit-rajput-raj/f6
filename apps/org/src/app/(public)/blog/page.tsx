"use client";

import React from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconBook,
  IconCalendar,
  IconUser,
} from "@tabler/icons-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ModeToggle } from "@repo/ui/components/themes/toogle";

const ARTICLES = [
  {
    slug: "migrating-enterprise-pipelines-to-mastersheet",
    title: "Migrating Enterprise Pipelines to Zero-Trust MasterSheets",
    excerpt: "How distributed teams isolate telemetry data across departmental desks while maintaining cryptographic audit ledgers in realtime.",
    category: "Architecture",
    author: "Sarah Chen",
    role: "Chief Operations Officer",
    date: "March 15, 2025",
    readTime: "5 min read",
  },
  {
    slug: "algorithmic-settlement-desks-in-fintech",
    title: "Algorithmic Settlement Desks & Volatility Surface Sync",
    excerpt: "Deep-dive into Quantix Data Foundry's multi-tenant reconciliation matrix processing institutional feeds with IEEE-754 precision.",
    category: "Financial Engineering",
    author: "Alex Rivera",
    role: "Principal Data Architect",
    date: "March 8, 2025",
    readTime: "7 min read",
  },
  {
    slug: "clinical-genomic-reads-and-hipaa-compliance",
    title: "Clinical Genomic Reads and HIPAA Boundary Enforcement",
    excerpt: "Aether BioTech's approach to partitioning variant analysis desks and enforcing strict schema validation on transcriptomic datasets.",
    category: "Bioinformatics",
    author: "Dr. Marcus Vance",
    role: "Head of Research",
    date: "February 28, 2025",
    readTime: "6 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-black text-xs shadow-sm">
              UX
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                UNIXL
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Blog
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
              ← Home
            </Link>
            <ModeToggle />
            <Link href="/dashboard">
              <Button size="sm" className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                Launch Workspace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800/60 px-3 py-1 rounded-full">
            <IconBook className="size-3.5" />
            <span>UNIXL Engineering & Research</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
            Architecture, Protocols & Case Studies
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto leading-relaxed">
            Technical deep-dives on distributed desk pipelines, zero-trust schema normalization, and multi-tenant enterprise orchestration.
          </p>
        </div>

        {/* Article Cards */}
        <div className="space-y-6">
          {ARTICLES.map((article) => (
            <article
              key={article.slug}
              className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px]">
                  {article.category}
                </Badge>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <IconCalendar className="size-3" />
                    {article.date}
                  </span>
                  <span>·</span>
                  <span>{article.readTime}</span>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white hover:text-emerald-600 transition-colors cursor-pointer">
                {article.title}
              </h2>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {article.excerpt}
              </p>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-[10px]">
                    {article.author.charAt(0)}
                  </div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {article.author}
                  </span>
                  <span className="text-[11px] text-neutral-400">({article.role})</span>
                </div>

                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Read Article <IconArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 text-center text-xs text-neutral-400">
        © 2025 UNIXL Technologies. Published by Enterprise Engineering.
      </footer>
    </div>
  );
}
