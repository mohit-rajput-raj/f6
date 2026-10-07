"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Star,
  ArrowRight,
  Menu,
  X,
  LogOut,
  Sparkles,
  LayoutGrid,
  Zap,
  Cpu,
  HelpCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { ModeToggle } from "@repo/ui/components/themes/toogle";
import Image from "next/image";
import { Badge } from "@repo/ui/components/ui/badge";

export default function Header() {
  const router = useRouter();
  const { main_id } = useRouteAuthContextHook();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardUrl = main_id ? `/projects/${main_id}/projects` : "/projects";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-zinc-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/65 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: Brand Logo & Release Chip */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group select-none">
            <div className="relative size-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center p-1 shadow-sm group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.25)] transition-all overflow-hidden shrink-0">
              <Image
                src="/unixl-logo-symbol-nobg.png"
                alt="UNIXL Logo"
                width={28}
                height={28}
                className="object-contain size-6 group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-primary transition-colors">
                UNIXL
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 h-4.5 bg-white/[0.04] text-zinc-400 border-white/10 font-mono font-medium rounded-full"
              >
                v2.4
              </Badge>
            </div>
          </Link>
        </div>

        {/* Center: Clean SaaS Nav Items */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-400">
          <Link
            href="/#canvas-preview"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Interactive Canvas
          </Link>
          <Link
            href="/#features"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Capabilities
          </Link>
          <Link
            href="/#use-cases"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Solutions
          </Link>
          <Link
            href="/#architecture"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Architecture
          </Link>
          <Link
            href="/pricing"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] text-zinc-300 font-semibold transition-all relative"
          >
            Pricing
            <span className="absolute -top-0.5 right-1 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </Link>
          <Link
            href="/#faq"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-all"
          >
            FAQ
          </Link>
        </nav>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* GitHub Star Pill */}
          <a
            href="https://github.com/mohit-rajput-raj/f6"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all group"
          >
            <Star className="size-3 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-xs">Star</span>
            <span className="text-[10px] text-zinc-500 border-l border-white/10 pl-1.5 ml-0.5 font-mono">
              1.8k
            </span>
          </a>

          {/* Theme Mode Toggle */}
          <div className="hidden sm:block">
            <ModeToggle />
          </div>

          {/* User Auth state */}
          {isPending ? (
            <div className="w-20 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2">
              <Link href={dashboardUrl}>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 rounded-lg font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95 cursor-pointer"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>

              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="size-8 rounded-lg object-cover border border-white/10"
                />
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/auth/sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/sign-in">
                <Button
                  size="sm"
                  className="h-8 px-3.5 text-xs gap-1.5 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/[0.08] bg-zinc-950/95 backdrop-blur-2xl px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1 text-sm font-medium text-zinc-400">
            <Link
              href="/#canvas-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <LayoutGrid className="size-4 text-primary" />
              <span>Interactive Canvas</span>
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Zap className="size-4 text-amber-400" />
              <span>Capabilities</span>
            </Link>
            <Link
              href="/#use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Sparkles className="size-4 text-indigo-400" />
              <span>Solutions</span>
            </Link>
            <Link
              href="/#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Cpu className="size-4 text-emerald-400" />
              <span>Architecture</span>
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] text-zinc-200 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4 text-rose-400" />
                <span>Pricing</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                Plans
              </Badge>
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <HelpCircle className="size-4 text-cyan-400" />
              <span>FAQ</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <a
              href="https://github.com/mohit-rajput-raj/f6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg border border-white/10 bg-white/[0.03]"
            >
              <Star className="size-3 text-amber-400 fill-amber-400" />
              <span>Star on GitHub</span>
              <span className="text-[10px] text-zinc-500 font-mono ml-1">1.8k</span>
            </a>
            <ModeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
