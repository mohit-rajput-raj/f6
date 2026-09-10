"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "./header";
import {
  Layers,
  Workflow,
  Database,
  Sparkles,
  Save,
  FileSpreadsheet,
  Cpu,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Table2,
  Sliders,
  FolderTree,
  Star,
  Play,
  Pause,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Terminal,
  Activity,
  Boxes,
  Lock,
  ArrowUpRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  Globe,
  Server,
  Clock,
  BarChart3,
  FileText,
  RefreshCw,
  Eye,
  Check,
  Download,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { client } from "@/lib/orpc";

export default function Home() {
  const [activeNodeStep, setActiveNodeStep] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"dag" | "attendance" | "payroll" | "video">("dag");
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImageModalOpen(false);
      }
    };
    if (imageModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [imageModalOpen]);

  useEffect(() => {
    try {
      client.users.list().catch(() => {});
    } catch {}
  }, []);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-primary/25 selection:text-primary">
      <Header />

      {/* ─── Hero Section (MNC Enterprise Grade) ─── */}
      {/* <section className="relative pt-32 pb-16 sm:pt-38 sm:pb-24 overflow-hidden border-b border-zinc-800/80">
       
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35 [mask-image:radial-gradient(ellipse_65%_50%_at_50%_20%,black_70%,transparent_100%)]" />

        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-primary/10 blur-[140px] rounded-full pointer-events-none -z-10" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-7">
  
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-800 bg-zinc-900/90 text-zinc-300 shadow-sm hover:border-zinc-700 transition-colors cursor-pointer">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-zinc-100 font-mono">ENTERPRISE v2.4</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">Visual DAG Spreadsheet Orchestration Engine</span>
            <ArrowRight className="size-3 text-primary ml-0.5" />
          </div>

        
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            Automate complex spreadsheets with deterministic visual DAGs.
          </h1>

          
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
            Eliminate broken VLOOKUP formulas, repetitive copy-pasting, and fragile macros. UNIXL delivers
            deterministic multi-sheet reconciliation, automated time-series expansion, and audited data governance—backed
            by dedicated PostgreSQL row-level security.
          </p>

          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/auth/sign-in">
              <Button size="lg" className="h-11 px-7 text-sm font-semibold gap-2 shadow-sm cursor-pointer">
                <span>Deploy Free Workspace</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <a href="#interactive-showcase">
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-6 text-sm font-medium gap-2 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <Play className="size-3.5 fill-current opacity-70" />
                <span>Explore Interactive Studio</span>
              </Button>
            </a>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setImageModalOpen(true);
                handleResetZoom();
              }}
              className="h-11 px-5 text-sm font-medium gap-2 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            >
              <Maximize2 className="size-3.5 text-primary" />
              <span>Inspect Blueprint</span>
            </Button>
          </div>

          
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-4 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              Zero-token static schema discovery
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              SOC 2 Type II & HIPAA compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              High-precision Syncfusion engine
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              Managed Cloud or Self-Hosted
            </span>
          </div>
        </div>
      </section> */}
      <section className="relative pt-32 pb-16 sm:pt-38 sm:pb-24 overflow-hidden border-b border-zinc-800/80 bg-zinc-950">
  {/* Background Image Container with Overlay Gradients */}
  <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
    {/* Earth Horizon High-Res Aesthetic Image */}
    <img
      src="https://images.unsplash.com/photo-1649047198250-a8c29163c3eb?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      alt="Earth horizon background"
      className="w-full h-full object-cover object-center opacity-100 scale-105"
    />

    {/* Top/Bottom Dark Fade Gradients for smooth blending */}
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/60 to-zinc-950" />
    
    {/* Radial Overlay to focus text readability in the center */}
    <div className="absolute inset-0 " />
  </div>

  {/* Subtle grid pattern background */}
  <div className="absolute inset-0 z-[1] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 [mask-image:radial-gradient(ellipse_65%_50%_at_50%_20%,black_70%,transparent_100%)] pointer-events-none" />

  {/* Subtle ambient light glow */}
  <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-primary/15 blur-[140px] rounded-full pointer-events-none z-[1]" />

  <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-7">
    {/* Release Eyebrow Pill */}
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-800 bg-zinc-900/90 text-zinc-300 shadow-sm hover:border-zinc-700 transition-colors cursor-pointer backdrop-blur-sm">
      <span className="flex size-2 rounded-full bg-primary animate-pulse" />
      <span className="font-semibold text-zinc-100 font-mono">ENTERPRISE v2.4</span>
      <span className="text-zinc-600">/</span>
      <span className="text-zinc-400">Visual DAG Spreadsheet Orchestration Engine</span>
      <ArrowRight className="size-3 text-primary ml-0.5" />
    </div>

    {/* Master MNC Headline */}
    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-300 max-w-4xl mx-auto leading-[1.08]">
      Automate complex spreadsheets with deterministic visual DAGs.
    </h1>

    {/* Subtitle */}
    <p className="max-w-3xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
      Eliminate broken VLOOKUP formulas, repetitive copy-pasting, and fragile macros. UNIXL delivers
      deterministic multi-sheet reconciliation, automated time-series expansion, and audited data governance—backed
      by dedicated PostgreSQL row-level security.
    </p>

    {/* Action CTAs */}
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
      <Link href="/auth/sign-in">
        <Button size="lg" className="h-11 px-7 text-sm font-semibold gap-2 shadow-sm cursor-pointer">
          <span>Deploy Free Workspace</span>
          <ArrowRight className="size-4" />
        </Button>
      </Link>

      <a href="#interactive-showcase">
        <Button
          variant="outline"
          size="lg"
          className="h-11 px-6 text-sm font-medium gap-2 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 hover:text-white cursor-pointer backdrop-blur-sm"
        >
          <Play className="size-3.5 fill-current opacity-70" />
          <span>Explore Interactive Studio</span>
        </Button>
      </a>

      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          setImageModalOpen(true);
          handleResetZoom();
        }}
        className="h-11 px-5 text-sm font-medium gap-2 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer backdrop-blur-sm"
      >
        <Maximize2 className="size-3.5 text-primary" />
        <span>Inspect Blueprint</span>
      </Button>
    </div>

    {/* Enterprise Trust Telemetry Points */}
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-4 text-xs text-zinc-400 font-mono">
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="size-3.5 text-primary" />
        Zero-token static schema discovery
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="size-3.5 text-primary" />
        SOC 2 Type II & HIPAA compliant
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="size-3.5 text-primary" />
        High-precision Syncfusion engine
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="size-3.5 text-primary" />
        Managed Cloud or Self-Hosted
      </span>
    </div>
  </div>
</section>
      {/* ─── Enterprise Brand Trust Bar (Fortune 500 Style) ─── */}
      <section className="py-8 border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-5">
            Trusted by operations teams, universities & high-velocity logistics
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight text-zinc-300">
              <Building2 className="size-4 text-primary" />
              <span>VERTEX GLOBAL</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight text-zinc-300">
              <Globe className="size-4 text-primary" />
              <span>APEX SUPPLY CHAIN</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight text-zinc-300">
              <Server className="size-4 text-primary" />
              <span>NOVAPATH DATA</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight text-zinc-300">
              <Layers className="size-4 text-primary" />
              <span>STANFORD LABS / EDU</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight text-zinc-300">
              <ShieldCheck className="size-4 text-primary" />
              <span>METRICHEALTH SYSTEM</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Telemetry Stats Ribbon (MNC Metric Bar) ─── */}
      <section className="border-b border-zinc-800/80 bg-zinc-950/80 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">12.8M+</div>
              <div className="text-xs text-zinc-500 font-mono">Cells Reconciled Daily</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-primary">&lt; 14ms</div>
              <div className="text-xs text-zinc-500 font-mono">Zero-Token Schema Latency</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">99.99%</div>
              <div className="text-xs text-zinc-500 font-mono">Pipeline Execution SLA</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">100%</div>
              <div className="text-xs text-zinc-500 font-mono">Row-Level Audited Linage</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Interactive Section: Mission Control & DAG Studio ─── */}
      <section id="interactive-showcase" className="py-20 sm:py-28 border-b border-zinc-800/80 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
              Mission Control & Studio
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Data flows like packets across typed edges.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Experience the power of explicit visual pipelines. Watch packets stream through ingestion, column
              alignment, Gemini AI reconciliation, and atomic commit without touching raw formulas.
            </p>

            {/* Showcase View Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveShowcaseTab("dag")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeShowcaseTab === "dag"
                    ? "bg-zinc-800 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Interactive DAG Simulator
              </button>
              <button
                type="button"
                onClick={() => setActiveShowcaseTab("attendance")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeShowcaseTab === "attendance"
                    ? "bg-zinc-800 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Attendance Stacking Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveShowcaseTab("payroll")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeShowcaseTab === "payroll"
                    ? "bg-zinc-800 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Overtime & Timesheets
              </button>
              <button
                type="button"
                onClick={() => setActiveShowcaseTab("video")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeShowcaseTab === "video"
                    ? "bg-zinc-800 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Play className="size-3 fill-current text-primary" />
                Live Telemetry Video
              </button>
            </div>
          </div>

          {/* Tab 1: Live Interactive DAG Simulator */}
          {activeShowcaseTab === "dag" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Descriptive Step Trigger Controls */}
              <div className="lg:col-span-5 space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    Pipeline Execution Steps
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Deterministic 4-Stage Workflow
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Click through the pipeline stages below to observe how data schemas transform and propagate in memory.
                  </p>
                </div>

                {/* Step Selectors */}
                <div className="space-y-2.5">
                  {[
                    {
                      step: 0,
                      label: "01 / Ingestion & Desk Decoupling",
                      desc: "Field operators enter daily attendance or shift logs via simple desk forms without touching graph logic.",
                      stat: "91 Rows Loaded · Zero Code",
                    },
                    {
                      step: 1,
                      label: "02 / Column Alignment & Stacking",
                      desc: "AnalyticsStackNode matches primary keys and expands new date columns side-by-side automatically.",
                      stat: "Zero-Formula Date Matrix",
                    },
                    {
                      step: 2,
                      label: "03 / AI Alignment & Reconcile",
                      desc: "Gemini AI counts present sessions, detects anomalies, and normalizes discrepancies against the MasterSheet.",
                      stat: "LLM Discrepancy Pass",
                    },
                    {
                      step: 3,
                      label: "04 / Atomic Backup & Commit",
                      desc: "Inspect diff in Merged Preview, commit in 1-click, and auto-save versioned CSV files with instant rollback.",
                      stat: "Atomic Version Snapshot",
                    },
                  ].map((item) => {
                    const isActive = activeNodeStep === item.step;
                    return (
                      <div
                        key={item.step}
                        onClick={() => setActiveNodeStep(item.step)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isActive
                            ? "border-primary/60 bg-zinc-900/95 shadow-md"
                            : "border-zinc-800/70 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className={isActive ? "text-primary font-semibold" : "text-zinc-300 font-medium"}>
                            {item.label}
                          </span>
                          {isActive && <span className="size-1.5 rounded-full bg-primary animate-ping" />}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-snug">
                          {item.desc}
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                          <span>{item.stat}</span>
                          <span className={isActive ? "text-primary font-semibold" : ""}>
                            {isActive ? "Active in Viewport" : "Inspect →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Link href="/help">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-800 hover:bg-zinc-900 gap-1.5 cursor-pointer">
                      <span>Read Beginner Guide</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Ref: attendance_pipeline.flow
                  </span>
                </div>
              </div>

              {/* Right Column: Interactive Node Canvas with Moving Data Pulses */}
              <div className="lg:col-span-7 relative">
                <div className="absolute -inset-2 bg-primary/10 rounded-3xl blur-2xl -z-10 opacity-70 pointer-events-none" />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
                  {/* Canvas Window Topbar */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/95">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="size-2.5 rounded-full bg-zinc-700" />
                        <div className="size-2.5 rounded-full bg-zinc-700" />
                        <div className="size-2.5 rounded-full bg-zinc-700" />
                      </div>
                      <div className="h-3.5 w-px bg-zinc-800 mx-1" />
                      <span className="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
                        <Workflow className="size-3 text-primary" />
                        <span>unixl-graph // live-stream</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        14ms latency
                      </span>
                    </div>
                  </div>

                  {/* Canvas Workspace Viewport */}
                  <div className="relative p-5 sm:p-7 bg-zinc-950 min-h-[440px] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:18px_18px] opacity-40" />

                    {/* SVG Cables with Animated Moving Data Packets */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <defs>
                        <linearGradient id="neonWire" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3f3f46" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#71717a" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>

                      {/* Wire 1: SheetNode -> AnalyticsStackNode */}
                      <path
                        d="M 175 160 C 230 160, 240 100, 305 100"
                        fill="none"
                        stroke="url(#neonWire)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <circle r="3" fill="var(--color-primary, #6366f1)" className="filter drop-shadow-[0_0_4px_rgba(99,102,241,0.9)]">
                        <animateMotion
                          dur="2.2s"
                          repeatCount="indefinite"
                          path="M 175 160 C 230 160, 240 100, 305 100"
                        />
                      </circle>

                      {/* Wire 2: DeskTextInput -> AnalyticsStackNode */}
                      <path
                        d="M 175 60 C 230 60, 240 120, 305 120"
                        fill="none"
                        stroke="#27272a"
                        strokeWidth="1.5"
                      />
                      <circle r="2.5" fill="var(--color-primary, #6366f1)">
                        <animateMotion
                          dur="2.8s"
                          repeatCount="indefinite"
                          path="M 175 60 C 230 60, 240 120, 305 120"
                        />
                      </circle>

                      {/* Wire 3: SheetNode -> DynamicMasterSheetNode */}
                      <path
                        d="M 175 175 C 230 175, 240 270, 305 270"
                        fill="none"
                        stroke="url(#neonWire)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <circle r="3" fill="var(--color-primary, #6366f1)" className="filter drop-shadow-[0_0_4px_rgba(99,102,241,0.9)]">
                        <animateMotion
                          dur="2.6s"
                          repeatCount="indefinite"
                          path="M 175 175 C 230 175, 240 270, 305 270"
                        />
                      </circle>

                      {/* Wire 4: DynamicMasterSheetNode -> MergedPreviewNode */}
                      <path
                        d="M 485 270 C 515 270, 520 270, 550 270"
                        fill="none"
                        stroke="#3f3f46"
                        strokeWidth="1.5"
                      />
                      <circle r="3" fill="var(--color-primary, #6366f1)" className="filter drop-shadow-[0_0_4px_rgba(99,102,241,0.9)]">
                        <animateMotion
                          dur="1.8s"
                          repeatCount="indefinite"
                          path="M 485 270 C 515 270, 520 270, 550 270"
                        />
                      </circle>

                      {/* Wire 5: AnalyticsStack -> SaveFileNode */}
                      <path
                        d="M 485 100 C 515 100, 520 100, 550 100"
                        fill="none"
                        stroke="#27272a"
                        strokeWidth="1.5"
                      />
                      <circle r="2.5" fill="var(--color-primary, #6366f1)">
                        <animateMotion
                          dur="3s"
                          repeatCount="indefinite"
                          path="M 485 100 C 515 100, 520 100, 550 100"
                        />
                      </circle>
                    </svg>

                    {/* Monochromatic Node Layout (Zinc + Primary) */}
                    <div className="relative z-10 grid grid-cols-3 gap-6 w-full max-w-lg text-[10px]">
                      {/* Column 1: Source Nodes */}
                      <div className="space-y-4">
                        {/* Node: DeskTextInput */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 0 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <Terminal className="size-3 text-primary" />
                              P/A tracker
                            </span>
                            <span className="text-[8px] text-zinc-500">In</span>
                          </div>
                          <div className="px-1.5 py-0.5 rounded bg-zinc-950 font-mono text-[9px] text-zinc-400 truncate border border-zinc-800/80">
                            &quot;CO24009/Lab-tracker&quot;
                          </div>
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border border-zinc-950" />
                        </div>

                        {/* Node: DeskSheetNode */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 0 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <FileSpreadsheet className="size-3 text-primary" />
                              Desk Sheet
                            </span>
                            <span className="text-[8px] font-mono text-zinc-400">91 rows</span>
                          </div>
                          <div className="rounded bg-zinc-950 border border-zinc-800/80 p-1 font-mono text-[8px] space-y-0.5">
                            <div className="flex justify-between text-zinc-500 border-b border-zinc-800 pb-0.5">
                              <span>Roll</span>
                              <span>Jul 1</span>
                              <span>Jul 2</span>
                            </div>
                            <div className="flex justify-between text-zinc-300">
                              <span>#1001</span>
                              <span className="text-primary font-bold">P</span>
                              <span className="text-primary font-bold">P</span>
                            </div>
                          </div>
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border border-zinc-950" />
                        </div>
                      </div>

                      {/* Column 2: Transform & AI Layer */}
                      <div className="space-y-4">
                        {/* Node: AnalyticsStackNode */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 1 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <Layers className="size-3 text-primary" />
                              Stack Node
                            </span>
                            <span className="text-[8px] text-zinc-500">Dates</span>
                          </div>
                          <div className="text-[9px] text-zinc-400 space-y-0.5 font-mono">
                            <div className="flex justify-between">
                              <span>Key:</span>
                              <span className="text-zinc-200">Enrollment</span>
                            </div>
                            <div className="text-primary font-medium">
                              + Side-by-side date expansion
                            </div>
                          </div>
                          <div className="absolute -left-1.5 top-[40%] -translate-y-1/2 size-2.5 rounded-full bg-zinc-700 border border-zinc-950" />
                          <div className="absolute -left-1.5 top-[60%] -translate-y-1/2 size-2.5 rounded-full bg-zinc-700 border border-zinc-950" />
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border border-zinc-950" />
                        </div>

                        {/* Node: DynamicMasterSheet */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 2 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <Sparkles className="size-3 text-primary" />
                              AI Align
                            </span>
                            <span className="text-[8px] text-zinc-500">LLM</span>
                          </div>
                          <div className="px-1.5 py-1 rounded bg-zinc-950 font-mono text-[8px] text-zinc-400 border border-zinc-800/80 leading-tight">
                            &ldquo;Count total & present sessions...&rdquo;
                          </div>
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-zinc-700 border border-zinc-950" />
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border border-zinc-950" />
                        </div>
                      </div>

                      {/* Column 3: Output & Preview */}
                      <div className="space-y-4">
                        {/* Node: SaveFileNode */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 3 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <Save className="size-3 text-primary" />
                              Save File
                            </span>
                            <span className="text-[8px] text-emerald-400">Auto: ON</span>
                          </div>
                          <div className="text-[8px] font-mono text-zinc-400 truncate">
                            📁 /attendance.csv
                          </div>
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-zinc-700 border border-zinc-950" />
                        </div>

                        {/* Node: UpdatedMergedPreview */}
                        <div className={`p-2.5 rounded-lg border bg-zinc-900/90 backdrop-blur-md shadow-md space-y-1.5 relative transition-all ${
                          activeNodeStep === 3 ? "border-primary ring-1 ring-primary/40" : "border-zinc-800"
                        }`}>
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="flex items-center gap-1 font-semibold">
                              <Table2 className="size-3 text-primary" />
                              Merged
                            </span>
                            <span className="text-[8px] text-zinc-500">Preview</span>
                          </div>
                          <div className="py-1 rounded bg-zinc-800/80 text-center font-mono text-[8px] text-zinc-200 border border-zinc-700/60">
                            ✓ Confirm Merge
                          </div>
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-zinc-700 border border-zinc-950" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Footer Bar */}
                  <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-primary" />
                      Zero-token in-memory schema resolution
                    </span>
                    <span className="text-zinc-500">
                      Step {activeNodeStep + 1} of 4 Selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Attendance Stacking Engine Showcase */}
          {activeShowcaseTab === "attendance" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                    <CheckCircle2 className="size-3" /> Auto Time-Series Matrix
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Multi-Day Roll-Call Without Formula Maintenance
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Instructors simply log daily session attendance. AnalyticsStackNode detects new date columns, aligns
                    records against master enrollment numbers, and recalculates semester percentages in real time.
                  </p>
                  <ul className="space-y-2 text-xs font-mono text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Eliminates 30+ fragmented Excel sheets per course
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Automatic P/A session totals & percentage formulas
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Instant CSV & XLSX export for registrar compliance
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/help">
                      <Button size="sm" className="gap-2 text-xs h-9 cursor-pointer">
                        <span>Read Attendance Flow Guide</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs shadow-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5 text-zinc-200">
                        <FileSpreadsheet className="size-3.5 text-primary" />
                        MasterSheet_CO24009_Attendance.xlsx
                      </span>
                      <span className="text-emerald-400">● 91 Active Students</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="py-1.5 px-2">Enrollment</th>
                            <th className="py-1.5 px-2">Student Name</th>
                            <th className="py-1.5 px-2 text-center">01-Jul</th>
                            <th className="py-1.5 px-2 text-center">02-Jul</th>
                            <th className="py-1.5 px-2 text-center">03-Jul</th>
                            <th className="py-1.5 px-2 text-right">Total Present</th>
                            <th className="py-1.5 px-2 text-right">% Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-zinc-300">
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">2024-CO-001</td>
                            <td className="py-1.5 px-2">Aarav Sharma</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">3 / 3</td>
                            <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">100%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">2024-CO-002</td>
                            <td className="py-1.5 px-2">Diya Patel</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-center text-rose-400 font-bold">A</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">2 / 3</td>
                            <td className="py-1.5 px-2 text-right text-amber-400 font-bold">66.7%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">2024-CO-003</td>
                            <td className="py-1.5 px-2">Rohan Varma</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-center text-primary font-bold">P</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">3 / 3</td>
                            <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Overtime & Timesheets Showcase */}
          {activeShowcaseTab === "payroll" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                    <Activity className="size-3" /> Shift Hours Reconciliation
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Biometric Punch Clocks to Payroll CSV
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Raw biometric clocks export thousands of disjointed timestamps. UNIXL normalizes shift spans,
                    applies overtime multiplier tiers, and automatically deducts statutory breaks.
                  </p>
                  <ul className="space-y-2 text-xs font-mono text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Calculates 1.5x and 2.0x overtime tiers deterministically
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Flags clock-in anomalies and missing badge punches
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3 text-primary" /> Direct integration with ADP, Workday, and SAP CSV formats
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs shadow-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5 text-zinc-200">
                        <Table2 className="size-3.5 text-primary" />
                        Biometric_Reconciliation_Summary.csv
                      </span>
                      <span className="text-emerald-400">● 1,420 Punches Reconciled</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="py-1.5 px-2">Emp ID</th>
                            <th className="py-1.5 px-2">Shift Type</th>
                            <th className="py-1.5 px-2 text-right">Standard Hrs</th>
                            <th className="py-1.5 px-2 text-right">OT 1.5x</th>
                            <th className="py-1.5 px-2 text-right">Gross Total</th>
                            <th className="py-1.5 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-zinc-300">
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">EMP-8841</td>
                            <td className="py-1.5 px-2">Night Shift B</td>
                            <td className="py-1.5 px-2 text-right">40.0 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-primary">6.5 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">$1,842.50</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">✓ Approved</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">EMP-8842</td>
                            <td className="py-1.5 px-2">Day Shift A</td>
                            <td className="py-1.5 px-2 text-right">38.5 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-zinc-400">0.0 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">$1,347.50</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">✓ Approved</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 font-semibold text-zinc-200">EMP-8843</td>
                            <td className="py-1.5 px-2">Weekend Surge</td>
                            <td className="py-1.5 px-2 text-right">40.0 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-primary">12.0 hrs</td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">$2,190.00</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">✓ Approved</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Live Telemetry Video Showcase */}
          {activeShowcaseTab === "video" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="size-4 text-primary animate-pulse" />
                    Live Engine Telemetry & Pipeline Execution
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time execution recording: 14 nodes, 3 data sources, zero memory leakage.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded">
                    4K / 60 FPS Stream
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                    className="h-8 text-xs gap-1.5 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
                  >
                    {isPlayingVideo ? <Pause className="size-3" /> : <Play className="size-3" />}
                    <span>{isPlayingVideo ? "Pause Telemetry" : "Resume Telemetry"}</span>
                  </Button>
                </div>
              </div>

              {/* Video Player Container */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center shadow-2xl">
                {/* HTML5 video element with clean cloud video fallback */}
                <video
                  autoPlay={isPlayingVideo}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover opacity-85"
                  poster="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"
                >
                  <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm" />
                </video>

                {/* Futuristic HUD Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-1 rounded bg-zinc-900/90 border border-zinc-700/70 text-zinc-200 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      PIPELINE STREAM // ACTIVE (EXEC_091)
                    </span>
                    <span className="px-2 py-1 rounded bg-zinc-900/90 border border-zinc-700/70 text-zinc-400">
                      MEM: 42.1 MB · CPU: 1.4% · THREADS: 4
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-zinc-900/90 backdrop-blur-md p-3 rounded-lg border border-zinc-700/70 text-xs font-mono space-y-1 max-w-xl">
                      <div className="text-zinc-400 text-[10px]">EXECUTION LOG STREAM:</div>
                      <div className="text-emerald-400 truncate">✓ [12:54:01] Ingested 91 records from Desk Sheet #CO24009</div>
                      <div className="text-primary truncate">✓ [12:54:02] AnalyticsStackNode: Generated side-by-side date vector [01-Jul ... 03-Jul]</div>
                      <div className="text-zinc-300 truncate">✓ [12:54:03] Gemini AI: Reconciled 4 mismatched enrollment keys</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Production Blueprint Showcase (Attendance Architecture) ─── */}
      <section id="architecture" className="py-20 sm:py-28 border-b border-zinc-800/80 bg-zinc-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
                Production Blueprint
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Inspect a real-world attendance pipeline.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A six-node architecture handling daily ingestion, student matching, time-series expansion, and
                MasterSheet updates without script maintenance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageModalOpen(true);
                  handleResetZoom();
                }}
                className="gap-2 text-xs h-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 cursor-pointer"
              >
                <Maximize2 className="size-3.5 text-primary" />
                <span>Fullscreen Blueprint</span>
              </Button>
              {/* <Link href="/help">
                <Button size="sm" className="gap-2 text-xs h-9 cursor-pointer">
                  <span>Read Step-by-Step Guide</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link> */}
            </div>
          </div>

          {/* Blueprint Card (Click to Zoom Lightbox) */}
          <div
            onClick={() => {
              setImageModalOpen(true);
              handleResetZoom();
            }}
            className="group relative rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl cursor-zoom-in hover:border-zinc-700 transition-all"
          >
            <div className="relative w-full h-[380px] sm:h-[520px]">
              <Image
                src="/basicFlowOfTrackAttandance.png"
                alt="Production Attendance Flow Diagram"
                fill
                className="object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-[1.01]"
                priority
              />
            </div>
            <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-700/70 text-xs text-zinc-300 flex items-center gap-2 shadow-lg group-hover:border-primary/60 transition-all">
              <Maximize2 className="size-3.5 text-primary" />
              <span className="font-mono text-[11px]">Click to inspect full architecture blueprint</span>
            </div>
          </div>

          {/* Node Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">01. Desk Input</span>
              <p className="text-[11px] text-zinc-400 mt-1">Non-technical forms</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">02. Header Ref</span>
              <p className="text-[11px] text-zinc-400 mt-1">Enrollment match key</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">03. Merge Node</span>
              <p className="text-[11px] text-zinc-400 mt-1">Left/Right join schema</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">04. Stack Node</span>
              <p className="text-[11px] text-zinc-400 mt-1">Side-by-side date expansion</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">05. AI Reconcile</span>
              <p className="text-[11px] text-zinc-400 mt-1">LLM P/A percentage logic</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-primary font-bold">06. Atomic Save</span>
              <p className="text-[11px] text-zinc-400 mt-1">MasterSheet snapshot</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Capabilities (MNC Enterprise Bento Grid) ─── */}
      <section id="features" className="py-20 sm:py-28 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl space-y-2">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
              Enterprise Suite
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for mission-critical spreadsheet operations.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Engineered to give developer reliability to operational spreadsheets without brittle formula chains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <Workflow className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">Visual DAG Graph Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect nodes with typed handles. Unlike Excel where formulas are hidden inside cells, UNIXL exposes
                full data lineage and execution sequence explicitly.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                Deterministic execution order
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <Sliders className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">The Desk Interface</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Decoupled interfaces: data engineers build the visual node graph, while branch staff or teachers enter
                daily numbers on a simplified tabular form.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                Zero canvas training required for staff
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <Layers className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">Time-Series Analytics Stacks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stack daily attendance or periodic ledger columns side-by-side automatically. Matches IDs across dates
                without overwriting past entries.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                Auto date expansion on match key
              </div>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <Sparkles className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">AI Schema & Column Alignment</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                One department submits `Roll_No`, another submits `Enrollment`. Integrated Gemini and LangChain agents
                intelligently resolve schema discrepancies.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                LLM-powered fuzzy schema resolution
              </div>
            </div>

            {/* Card 5 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <FolderTree className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">Workspace Files & Syncfusion</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hierarchical folder directory directly inside your project. Inspect large datasets in high-performance
                Syncfusion sheets and save snapshots atomically.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                VS Code style folder explorer
              </div>
            </div>

            {/* Card 6 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">Enterprise Privacy & Audit</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All workflows, datasets, and history remain within your designated Supabase PostgreSQL instance. Zero
                model training on customer data.
              </p>
              <div className="pt-2 text-[10px] font-mono text-zinc-500">
                Role-based access & row-level security
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MNC Target Solutions (With Online Industry Imagery) ─── */}
      <section id="use-cases" className="py-20 sm:py-28 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
              Enterprise Solutions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Tailored for high-stakes operational sectors.
            </h2>
            <p className="text-sm text-zinc-400">
              Eliminate repetitive manual Excel overhead across organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Case 1: Education */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
                  alt="Higher Education & Universities"
                  fill
                  unoptimized
                  className="object-cover opacity-75 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-xs">
                  <span className="bg-zinc-900/90 text-primary px-2 py-0.5 rounded border border-zinc-700 font-semibold">
                    Higher Education
                  </span>
                  <span className="text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded">Attendance & Credits</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-base font-bold text-white">
                  Classroom Attendance & Continuous Assessment
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Teachers input daily roll-call attendance from desk view. The graph matches Enrollment IDs, stacks daily
                  P/A records chronologically, and updates semester credit totals in the institution MasterSheet.
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Replaces 30+ fragmented Excel sheets</span>
                  <Link href="/help" className="text-primary hover:underline flex items-center gap-1">
                    Read guide <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Case 2: Supply Chain */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&auto=format&fit=crop"
                  alt="Global Supply Chain Logistics"
                  fill
                  unoptimized
                  className="object-cover opacity-75 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-xs">
                  <span className="bg-zinc-900/90 text-primary px-2 py-0.5 rounded border border-zinc-700 font-semibold">
                    Logistics & Supply
                  </span>
                  <span className="text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded">Inventory Audits</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-base font-bold text-white">
                  Multi-Warehouse Inventory Stock Reconciliation
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Reconcile daily SKU counts across multiple fulfillment hubs. The graph detects negative variances,
                  flags missing stock batches, and updates real-time store availability without manual VLOOKUP joins.
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>99.9% inventory accuracy across branches</span>
                  <span className="text-zinc-500">Enterprise Template</span>
                </div>
              </div>
            </div>

            {/* Case 3: Finance & Payroll */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
                  alt="Enterprise Finance & Payroll"
                  fill
                  unoptimized
                  className="object-cover opacity-75 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-xs">
                  <span className="bg-zinc-900/90 text-primary px-2 py-0.5 rounded border border-zinc-700 font-semibold">
                    Finance & Payroll
                  </span>
                  <span className="text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded">Timesheets & Hours</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-base font-bold text-white">
                  Shift Hours & Overtime Wage Reconciliation
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Biometric punch clocks export raw timestamps daily. The node pipeline aggregates total hours, calculates
                  overtime multiplier tiers, reconciles employee tax bands, and outputs payroll-ready CSVs.
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Eliminates 14 hours of manual payroll calculation</span>
                  <span className="text-zinc-500">Enterprise Template</span>
                </div>
              </div>
            </div>

            {/* Case 4: Healthcare Shifts */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                <Image
                  src="https://img.magnific.com/free-photo/realistic-scene-with-health-worker-taking-care-elderly-patient_23-2151231385.jpg?t=st=1789025911~exp=1789029511~hmac=fe1fe7272be9d5821920e1c98007dcc2306f27f0459db1d052ec7b35253106e0&w=740"
                  alt="Healthcare Operations"
                  fill
                  unoptimized
                  className="object-cover opacity-75 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-xs">
                  <span className="bg-zinc-900/90 text-primary px-2 py-0.5 rounded border border-zinc-700 font-semibold">
                    Healthcare Systems
                  </span>
                  <span className="text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded">Clinical Staffing</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-base font-bold text-white">
                  Clinical Rotations & Compliance Log Audits
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Track nurse and physician shift rosters against mandatory rest interval regulations. Instantly flags
                  understaffed emergency wards and generates compliance audit trails.
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>HIPAA-ready dedicated data isolation</span>
                  <span className="text-zinc-500">Enterprise Template</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparison: Traditional vs. UNIXL ─── */}
      <section className="py-20 sm:py-28 border-b border-zinc-800/80 bg-zinc-900/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Why operations teams migrate to UNIXL
            </h2>
            <p className="text-sm text-zinc-400">
              A side-by-side look at the architectural upgrade from traditional sheets.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 text-xs">
              {/* Left: Traditional Excel */}
              <div className="p-6 sm:p-8 space-y-3.5 bg-zinc-900/30">
                <div className="font-mono text-zinc-400 font-bold text-xs uppercase tracking-wider">
                  Traditional Spreadsheets (Excel / Sheets)
                </div>
                <ul className="space-y-2.5 text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-600 font-mono">✕</span>
                    <span>Formulas break silently when columns are added, renamed, or shifted.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-600 font-mono">✕</span>
                    <span>Operators have full access to overwrite formulas and delete master rows by accident.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-600 font-mono">✕</span>
                    <span>Reconciling daily dates requires manual VLOOKUP gymnastics and copy-pasting.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-600 font-mono">✕</span>
                    <span>No visual lineage: nobody knows who built cell `E42` or why it computes `SUM(C2:D10)`.</span>
                  </li>
                </ul>
              </div>

              {/* Right: UNIXL */}
              <div className="p-6 sm:p-8 space-y-3.5 bg-zinc-900/60">
                <div className="font-mono text-primary font-bold text-xs uppercase tracking-wider">
                  The UNIXL Platform
                </div>
                <ul className="space-y-2.5 text-zinc-200">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono font-bold">✓</span>
                    <span>Visual DAG node cables guarantee clear data provenance and unbreakable dependencies.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono font-bold">✓</span>
                    <span>Desk Panel decouples inputs: non-technical staff only see their clean input form.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono font-bold">✓</span>
                    <span>Analytics Stack nodes expand daily dates automatically side-by-side without manual merge.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono font-bold">✓</span>
                    <span>Atomic workspace file backups with built-in rollback protection and diff preview.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Enterprise Security & Compliance Section ─── */}
      <section className="py-16 border-b border-zinc-800/80 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
                  Governance & Compliance
                </Badge>
                <h3 className="text-2xl font-bold text-white">Bank-Grade Security for Operational Data</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
                <ShieldCheck className="size-4" />
                <span>Zero Model Training on Customer Data</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-400">
              <div className="space-y-2">
                <div className="font-bold text-zinc-200 font-mono flex items-center gap-2">
                  <Database className="size-4 text-primary" /> Dedicated PostgreSQL RLS
                </div>
                <p className="leading-relaxed">
                  Every project runs isolated schemas in Supabase PostgreSQL with strict row-level security and automated hourly snapshots.
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-bold text-zinc-200 font-mono flex items-center gap-2">
                  <Lock className="size-4 text-primary" /> End-to-End Encryption
                </div>
                <p className="leading-relaxed">
                  All sheet payloads and API communications are encrypted using TLS 1.3 in transit and AES-256 at rest.
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-bold text-zinc-200 font-mono flex items-center gap-2">
                  <Server className="size-4 text-primary" /> Air-Gapped / Self-Host Ready
                </div>
                <p className="leading-relaxed">
                  Deploy UNIXL inside your own AWS VPC, Azure tenant, or on-premises Docker cluster for total sovereignty.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-20 sm:py-28 border-b border-zinc-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5 font-mono">
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-zinc-400">
              Technical and operational questions answered.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              {
                q: "Can I connect existing CSV, Excel, or Google Sheets?",
                a: "Yes. You can upload CSVs directly to your project Workspace Files, import them into Syncfusion sheets, or use the GetFileNode and SpreadsheetInputNode to ingest any structured data.",
              },
              {
                q: "Do non-technical team members need to learn the Workflow Editor?",
                a: "No! That is the core purpose of the Desk interface. Engineers configure the underlying logic once in the Workflow Editor. Field staff, teachers, or branch operators simply open the Desk tab to submit daily numbers without touching node handles.",
              },
              {
                q: "How does edge column propagation save AI tokens?",
                a: "In traditional AI workflow engines, every node change or edge connection triggers an expensive LLM call. UNIXL resolves column schemas statically in memory as soon as you connect an edge. Only when you explicitly click 'Run Graph' are tokens consumed.",
              },
              {
                q: "Where is my data stored and is it secure?",
                a: "All datasets and folder hierarchies are stored in your own dedicated Supabase PostgreSQL database with row-level security. Data never leaves your designated infrastructure, and AI models do not train on customer inputs.",
              },
              {
                q: "Can I export or download processed files?",
                a: "Yes. You can download datasets as CSV directly from the Files explorer, export Syncfusion workbooks to XLSX, or configure SaveFileNode to write intermediate snapshots to disk automatically.",
              },
            ].map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-zinc-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <span className="text-zinc-500">
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pre-Footer CTA Banner ─── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 sm:p-14 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Ready to upgrade your spreadsheet workflows?
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Join operational leaders building reproducible, visual data pipelines with UNIXL today.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/auth/sign-in">
                <Button size="lg" className="h-11 px-7 text-sm font-semibold gap-2 shadow-xs cursor-pointer">
                  <span>Create Free Account</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/help">
                <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-medium border-zinc-800 bg-zinc-900 hover:bg-zinc-800 cursor-pointer">
                  <span>Browse Help Guides</span>
                </Button>
              </Link>
            </div>

            <p className="text-[11px] font-mono text-zinc-500">
              Open-source friendly · Managed cloud or self-host · Instant onboarding
            </p>
          </div>
        </div>
      </section>

      {/* ─── MNC SaaS Footer ─── */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-500 py-12 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
            {/* Column 1 */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary shadow-xs">
                  <Layers className="size-3.5 text-primary" />
                </div>
                <span className="font-bold text-sm text-white tracking-tight font-mono">UNIXL</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                The visual DAG platform for operational spreadsheet automation, multi-sheet reconciliations, and time-series analytics.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Systems Operational (v2.4)</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-2.5">
              <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">Product</span>
              <ul className="space-y-2 text-xs">
                <li><a href="#interactive-showcase" className="hover:text-zinc-200">Visual Studio</a></li>
                <li><a href="#features" className="hover:text-zinc-200">Desk Interface</a></li>
                <li><a href="#features" className="hover:text-zinc-200">Analytics Stacks</a></li>
                <li><a href="#features" className="hover:text-zinc-200">Workspace Files</a></li>
                <li><Link href="/help" className="hover:text-zinc-200">Tutorial Guides</Link></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="space-y-2.5">
              <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">Solutions</span>
              <ul className="space-y-2 text-xs">
                <li><a href="#use-cases" className="hover:text-zinc-200">Education & Attendance</a></li>
                <li><a href="#use-cases" className="hover:text-zinc-200">Payroll & Timesheets</a></li>
                <li><a href="#use-cases" className="hover:text-zinc-200">Lead Deduplication</a></li>
                <li><a href="#use-cases" className="hover:text-zinc-200">Inventory Audits</a></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div className="space-y-2.5">
              <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider font-mono">Resources</span>
              <ul className="space-y-2 text-xs">
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-zinc-200 flex items-center gap-1">GitHub <ExternalLink className="size-2.5" /></a></li>
                <li><Link href="/help" className="hover:text-zinc-200">Documentation</Link></li>
                <li><a href="#faq" className="hover:text-zinc-200">Privacy Policy</a></li>
                <li><a href="#faq" className="hover:text-zinc-200">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 font-mono">
            <span>© {new Date().getFullYear()} UNIXL Technologies Inc. All rights reserved.</span>
            <span>Engineered for precision data operations.</span>
          </div>
        </div>
      </footer>

      {/* ─── Fullscreen Blueprint Lightbox Modal ─── */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
          {/* Modal Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-zinc-800 bg-zinc-950/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-primary">
                <Workflow className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-mono">
                    Production Architecture Blueprint
                  </h3>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                    6 Nodes Validated
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Attendance Pipeline · Side-by-Side Dates Expansion · MasterSheet Commit
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  className="h-7 px-2 text-zinc-400 hover:text-white"
                  title="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <span className="text-[11px] font-mono px-1.5 text-zinc-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  className="h-7 px-2 text-zinc-400 hover:text-white"
                  title="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetZoom}
                  className="h-7 px-2 text-zinc-400 hover:text-white text-[11px] font-mono"
                  title="Reset zoom"
                >
                  <RotateCcw className="size-3" />
                </Button>
              </div>

              <Link href="/help" onClick={() => setImageModalOpen(false)}>
                <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 gap-1.5">
                  <FileText className="size-3.5" />
                  <span>Read Guide</span>
                </Button>
              </Link>

              <a
                href="/basicFlowOfTrackAttandance.png"
                download="attendance_architecture_blueprint.png"
                className="inline-flex"
              >
                <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 gap-1.5">
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Save Image</span>
                </Button>
              </a>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setImageModalOpen(false)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                title="Close (Esc)"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Modal Image Viewport */}
          <div
            onClick={() => setImageModalOpen(false)}
            className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center cursor-zoom-out"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-6xl w-full h-full min-h-[500px] flex items-center justify-center transition-transform duration-200 cursor-default"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <Image
                src="/basicFlowOfTrackAttandance.png"
                alt="Production Attendance Flow Diagram Fullscreen Blueprint"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Modal Footer Bar */}
          <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Press ESC or click outside to dismiss</span>
            <span className="hidden sm:inline">Diagram Resolution: 4K Native Vector Flow</span>
          </div>
        </div>
      )}
    </div>
  );
}
