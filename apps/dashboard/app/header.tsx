"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Layers,
  Star,
  ArrowRight,
  Menu,
  X,
  Workflow,
  Sparkles,
  Github,
  BookOpen,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ModeToggle } from "@repo/ui/components/themes/toogle";

export default function Header() {
  const router = useRouter();
  const { main_id } = useRouteAuthContextHook();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardUrl = main_id ? `/projects/${main_id}/projects` : "/projects";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: Brand Logo & Release Chip */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-primary shadow-sm group-hover:border-primary/60 transition-colors">
              <Layers className="size-4 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">
              UNIXL
            </span>
          </Link>

          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] px-2 py-0.5 bg-muted/60 text-muted-foreground border-border font-mono font-normal"
          >
            v2.4
          </Badge>
        </div>

        {/* Center: Clean SaaS Nav Items */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a
            href="#canvas-preview"
            className="hover:text-foreground transition-colors"
          >
            Interactive Canvas
          </a>
          <a
            href="#features"
            className="hover:text-foreground transition-colors"
          >
            Capabilities
          </a>
          <a
            href="#use-cases"
            className="hover:text-foreground transition-colors"
          >
            Solutions
          </a>
          <a
            href="#architecture"
            className="hover:text-foreground transition-colors"
          >
            Architecture
          </a>
          <a
            href="#faq"
            className="hover:text-foreground transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          {/* <ModeToggle/> */}

          {/* GitHub Star Pill */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border/80 bg-card hover:bg-muted/60 transition-colors"
          >
            <Star className="size-3 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-foreground">Star</span>
            <span className="text-[10px] opacity-70 border-l pl-1.5 ml-0.5 border-border">1.8k</span>
          </a>

          {isPending ? (
            <div className="w-20 h-8 rounded-md bg-muted/40 animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2">
              <Link href={dashboardUrl}>
                <Button size="sm" className="h-8 px-3 text-xs gap-1.5 shadow-sm">
                  <span>Dashboard</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/auth/sign-in">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/sign-in">
                <Button size="sm" className="h-8 px-3.5 text-xs gap-1 shadow-sm">
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
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground border border-border"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2.5 text-xs font-medium text-muted-foreground">
            <a
              href="#canvas-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Interactive Canvas
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Capabilities
            </a>
            <a
              href="#use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Solutions
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              Architecture
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-foreground"
            >
              FAQ
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

