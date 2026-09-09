"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  Maximize2,
  Table2,
  Cpu,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Terminal,
  Activity,
  Lightbulb,
  Workflow,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  Tag,
  Zap,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { toast } from "sonner";

// ─── Flow Guide Schema for Easy Extensibility ───
export interface FlowStep {
  stepNumber: number;
  title: string;
  nodeName: string;
  nodeType: string;
  badgeColor: string;
  description: string;
  handlesConnected?: { from: string; to: string }[];
  keySettings?: { label: string; value: string }[];
  proTip?: string;
}

export interface FlowGuide {
  id: string;
  title: string;
  subtitle: string;
  category: "Attendance & HR" | "Data Cleaning" | "Finance & Payroll" | "Analytics";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  status: "ready" | "coming_soon";
  image: string;
  nodeCount: number;
  estimatedTime: string;
  tags: string[];
  summary: string;
  problemStatement: string;
  solutionOverview: string;
  nodesUsed: { name: string; category: string; description: string; color: string }[];
  steps: FlowStep[];
  promptTemplate?: string;
  tips: string[];
}

// ─── Extensible Flow Guides Database ───
// To add more flows in the future, simply append a new object to this array!
const FLOW_GUIDES: FlowGuide[] = [
  {
    id: "attendance-tracking",
    title: "Basic Attendance Tracking & MasterSheet System",
    subtitle: "Complete beginner pipeline to track daily attendance, match enrollment IDs, and push to cumulative analytics.",
    category: "Attendance & HR",
    difficulty: "Beginner",
    status: "ready",
    image: "/basicFlowOfTrackAttandance.png",
    nodeCount: 6,
    estimatedTime: "5 - 10 mins",
    tags: ["Attendance", "MasterSheet", "Analytics Stack", "Desk Sheet", "AI Alignment"],
    summary:
      "This workflow demonstrates how to take a daily attendance spreadsheet from the Desk panel, capture dynamic subject codes and table names, align daily dates side-by-side in Analytics, calculate cumulative attendance counts using AI alignment, and merge the final totals back into the MasterSheet.",
    problemStatement:
      "In schools, universities, or offices, attendance is taken daily or per-period on simple sheets (P/A). Manually updating cumulative spreadsheets, matching student IDs across different day formats, and keeping time-series attendance trends updated in analytics is tedious and prone to human error.",
    solutionOverview:
      "By connecting DeskSheetNode with AnalyticsStackNode (Column Alignment mode) and DynamicMasterSheetNode, every time a new class sheet is submitted, student attendance is instantly matched by Enrollment number, daily date columns are stacked chronologically in Analytics, and cumulative totals are updated in the MasterSheet in one click.",
    nodesUsed: [
      {
        name: "DeskSheetNode",
        category: "Input",
        color: "amber",
        description: "Loads the daily attendance sheet entered or uploaded in the Desk panel (e.g. S.No, Enrollment, Name, Jul 1, Jul 2...).",
      },
      {
        name: "DeskTextInputNode",
        category: "Input",
        color: "teal",
        description: "Captures dynamic text input from the Desk panel (e.g. subject code 'CO24009/Lab' or tracking table name 'P/A tracker').",
      },
      {
        name: "AnalyticsStackNode (P/A Tracker)",
        category: "Output",
        color: "violet",
        description: "Configured in 'Align Columns' mode with Row Match Key 'Enrollment' to stack new daily dates side-by-side.",
      },
      {
        name: "DynamicMasterSheetNode",
        category: "AI & Calcy",
        color: "blue",
        description: "Matches Enrollment IDs, calculates total and attended classes using Gemini LLM, and updates the cumulative MasterSheet.",
      },
      {
        name: "UpdatedMergedPreviewNode",
        category: "Output",
        color: "indigo",
        description: "Visualizes the computed updates against original records and provides a one-click 'Confirm Merge in MasterSheet' button.",
      },
      {
        name: "AnalyticsStackNode (Calculated Tracker)",
        category: "Output",
        color: "violet",
        description: "Configured in 'Append Rows' mode to track calculated attendance percentages and student performance overtime.",
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Setup Input Data from Desk Panel",
        nodeName: "Desk Sheet & Desk Text Input",
        nodeType: "Input Nodes",
        badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        description:
          "Place a DeskSheetNode on the canvas. This node acts as the receiver for whatever attendance table is active on the user's Desk. Then, add two DeskTextInputNodes: one for the subject code (e.g., 'CO24009/Lab') and one for the table identifier ('P/A tracker').",
        keySettings: [
          { label: "Desk Sheet Data", value: "Expects Enrollment, Name, Date Columns (Jul 1, Jul 2...)" },
          { label: "Subject Code Input", value: "Sets the subfolder or target subject path" },
          { label: "P/A Tracker Input", value: "Sets the destination table name in Analytics" },
        ],
        proTip: "Connecting Desk inputs means users in the Desk interface can change the subject code or date without touching the workflow canvas!",
      },
      {
        stepNumber: 2,
        title: "Track Daily Attendance Dates in Analytics",
        nodeName: "Analytics Stack Node (P/A Tracker)",
        nodeType: "Output Node",
        badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        description:
          "Connect the DeskSheetNode's data output into the 'data' handle of AnalyticsStackNode. Connect the 'P/A tracker' DeskTextInputNode into the 'table-name' handle. In node settings, set Stack Alignment Mode to 'Align Columns (e.g. Daily Dates Jul 1, Jul 2...)' and set Row Match Key Column to 'Enrollment'.",
        handlesConnected: [
          { from: "DeskSheetNode (out)", to: "AnalyticsStackNode (data in)" },
          { from: "DeskTextInputNode [P/A tracker] (out)", to: "AnalyticsStackNode (table-name in)" },
        ],
        keySettings: [
          { label: "Stack Alignment Mode", value: "Align Columns (Side-by-side date expansion)" },
          { label: "Row Match Key Column", value: "Enrollment (Matches each student reliably)" },
          { label: "Auto Execute Mode", value: "OFF (Manual click 'Push to Analytics' or trigger on run)" },
        ],
        proTip: "Every time new attendance dates are submitted, this stack keeps existing columns and appends the new dates without duplicate rows!",
      },
      {
        stepNumber: 3,
        title: "Intelligent Calculation via Dynamic MasterSheet",
        nodeName: "Dynamic MasterSheet Node",
        nodeType: "AI Calcy Node",
        badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description:
          "Connect the DeskSheetNode into 'data' input and the subject code DeskTextInputNode into 'target-path'. In the custom prompt field, enter instructions for the AI engine to match Enrollment ID, count attended sessions, and calculate attendance rates.",
        handlesConnected: [
          { from: "DeskSheetNode (out)", to: "DynamicMasterSheetNode (data in)" },
          { from: "DeskTextInputNode [subject code] (out)", to: "DynamicMasterSheetNode (target-path in)" },
        ],
        keySettings: [
          { label: "Sheet Tab Name", value: "Sheet1 (or active tab in MasterSheet)" },
          { label: "Target Column / Path", value: "Dynamic from connected handle (e.g. CO24009/Lab)" },
        ],
        proTip: "The AI understands variations like 'P', 'Present', '1', or checkmarks automatically based on your prompt instruction.",
      },
      {
        stepNumber: 4,
        title: "Inspect & Confirm Merge in Merged Preview",
        nodeName: "Updated Merged Preview Node",
        nodeType: "Output Node",
        badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        description:
          "Connect DynamicMasterSheetNode's 'updates' handle into the UpdatedMergedPreviewNode. This node provides a live preview table displaying calculated counts alongside previous MasterSheet values, showing exactly what changed before saving.",
        handlesConnected: [
          { from: "DynamicMasterSheetNode (updates)", to: "UpdatedMergedPreviewNode (in)" },
        ],
        keySettings: [
          { label: "Preview Table", value: "Shows Enrollment, Name, Total Classes, Attended, %" },
          { label: "Confirm Action", value: "1-Click 'Confirm Merge in MasterSheet'" },
          { label: "Save to Files", value: "Optionally export or archive as CSV/JSON in Workspace Files" },
        ],
        proTip: "Always review the row count in the preview to make sure all students were matched properly before confirming the merge!",
      },
      {
        stepNumber: 5,
        title: "Push Computed Metrics to Analytics",
        nodeName: "Analytics Stack Node (Calculated Tracker)",
        nodeType: "Output Node",
        badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        description:
          "Connect the calculated updates from DynamicMasterSheetNode into a second AnalyticsStackNode configured in 'Append Rows (Vertical Stack)' mode. Connect a DeskTextInputNode labeled 'CCalculated tracker' to name the analytics table.",
        handlesConnected: [
          { from: "DynamicMasterSheetNode (updates)", to: "AnalyticsStackNode #2 (data in)" },
          { from: "DeskTextInputNode [CCalculated tracker] (out)", to: "AnalyticsStackNode #2 (table-name in)" },
        ],
        keySettings: [
          { label: "Stack Alignment Mode", value: "Append Rows (Vertical Stack for periodic snapshots)" },
        ],
        proTip: "This allows you to generate visual charts in the Analytics tab showing class attendance trends over weeks and months!",
      },
    ],
    promptTemplate:
      "Match Enrollment ID in column 1. Calculate present count and update total and attended classes for target path.",
    tips: [
      "Ensure student Enrollment numbers are unique across all rows to guarantee flawless row matching.",
      "Use consistent date headers in your daily sheets (e.g. 'Jul 1', 'Jul 2' or '2026-07-01') so column alignment stacks chronologically.",
      "Keep 'Auto Execute' OFF initially while testing your workflow, and use the manual 'Push to Analytics' button to verify table results.",
      "You can save intermediate snapshots to Workspace Files at any point using the SaveFileNode.",
    ],
  },
  {
    id: "payroll-hours-flow",
    title: "Employee Hours & Overtime Payroll Calculator",
    subtitle: "Consolidate shift punch cards, match employee IDs, and calculate overtime wage tiers.",
    category: "Finance & Payroll",
    difficulty: "Intermediate",
    status: "coming_soon",
    image: "/basicFlowOfTrackAttandance.png",
    nodeCount: 5,
    estimatedTime: "8 mins",
    tags: ["Payroll", "Overtime", "Formula Node", "Merge Node"],
    summary:
      "A ready-made flow template for HR departments to calculate monthly shift hours, overtime rates, and tax deductions from raw CSV time-clock exports.",
    problemStatement:
      "Employees log irregular shift hours and overtime across multiple branch offices. Consolidating punch records manually in Excel takes days each month.",
    solutionOverview:
      "Combines GetFileNode (biometric logs) + FormulaNode (hour sum & tier rules) + MergeNode (employee tax rates) + SaveFileNode (payroll ready CSV).",
    nodesUsed: [],
    steps: [],
    tips: [],
  },
  {
    id: "multisheet-dedup-flow",
    title: "Multi-Source Lead & Customer Deduplication",
    subtitle: "Merge disparate CSV files, normalize email formats, and drop duplicates automatically.",
    category: "Data Cleaning",
    difficulty: "Beginner",
    status: "coming_soon",
    image: "/basicFlowOfTrackAttandance.png",
    nodeCount: 4,
    estimatedTime: "5 mins",
    tags: ["Deduplication", "Filter", "Data Library", "Drop Columns"],
    summary:
      "Easily clean and merge customer contact lists from CRM exports, landing page forms, and event registrations without duplicate emails.",
    problemStatement:
      "Marketing campaigns send repeated messages when customers submit inquiries through different channels.",
    solutionOverview:
      "Uses AppendNode + LowercaseNode + DropColumnNode + FilterNode to output clean master lead tables.",
    nodesUsed: [],
    steps: [],
    tips: [],
  },
];

export default function HelpPage() {
  const params = useParams();
  const dashid = (params?.dashid as string) || "";
  const [selectedFlowId, setSelectedFlowId] = useState<string>("attendance-tracking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const categories = ["All", "Attendance & HR", "Finance & Payroll", "Data Cleaning", "Analytics"];

  // Filter flows
  const filteredFlows = useMemo(() => {
    return FLOW_GUIDES.filter((flow) => {
      const matchesSearch =
        flow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || flow.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const activeFlow = useMemo(() => {
    return FLOW_GUIDES.find((f) => f.id === selectedFlowId) || FLOW_GUIDES[0]!;
  }, [selectedFlowId]);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ── Top Hero Banner ── */}
      <div className="border-b bg-gradient-to-b from-card to-background/80 px-6 py-8 sm:px-10 sm:py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
                  <BookOpen className="size-3.5" />
                  <span>Knowledge Base & Tutorials</span>
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  UNIXL Workflow Guides
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                How to Build Powerful Workflows
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Step-by-step visual architectural guides designed for beginners. Learn how to connect input nodes,
                AI processors, and analytics pipelines to automate real-world spreadsheet tasks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/dashboard/dash/${dashid}/editor`}>
                <Button className="gap-2 text-xs shadow-md bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Workflow className="size-4" />
                  <span>Open Flow Editor</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search tutorials, nodes, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-card/60"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-8 text-xs px-3 rounded-full transition-all ${
                    selectedCategory === cat ? "" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid: Flow Selector Cards (Top/Sidebar) & Active Tutorial ── */}
      <div className="max-w-6xl mx-auto px-6 py-8 sm:px-10 space-y-8">
        {/* ── Flow Selection Cards Catalog ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              <span>Available Workflow Templates ({filteredFlows.length})</span>
            </h2>
            <span className="text-xs text-muted-foreground">Select a workflow to view full guide</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredFlows.map((flow) => {
              const isSelected = selectedFlowId === flow.id;
              const isReady = flow.status === "ready";

              return (
                <div
                  key={flow.id}
                  onClick={() => isReady && setSelectedFlowId(flow.id)}
                  className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                      : isReady
                      ? "border-border bg-card hover:border-primary/50 hover:bg-muted/40 shadow-sm"
                      : "border-border/50 bg-card/40 opacity-70 cursor-not-allowed"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-medium ${
                          flow.difficulty === "Beginner"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {flow.difficulty}
                      </Badge>
                      {isReady ? (
                        <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Ready
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Template
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {flow.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
                        {flow.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {flow.estimatedTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="size-3" /> {flow.nodeCount} nodes
                    </span>
                    <ChevronRight
                      className={`size-4 transition-transform ${
                        isSelected ? "text-primary translate-x-1" : "text-muted-foreground/50"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Flow Deep-Dive Guide ── */}
        {activeFlow.status === "ready" ? (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Header / Badges of Active Flow */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                      {activeFlow.category}
                    </Badge>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                      {activeFlow.difficulty} Level
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" /> Setup: {activeFlow.estimatedTime}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Cpu className="size-3.5" /> {activeFlow.nodeCount} Connected Nodes
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {activeFlow.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImageModalOpen(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>View Diagram Fullscreen</span>
                  </Button>
                  <Link href={`/dashboard/dash/${dashid}/editor`}>
                    <Button size="sm" className="h-8 text-xs gap-1.5">
                      <Zap className="size-3.5" />
                      <span>Build in Editor</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Problem vs Solution Callouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                  <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Lightbulb className="size-4" />
                    <span>The Challenge</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeFlow.problemStatement}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    <span>How This Workflow Solves It</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeFlow.solutionOverview}
                  </p>
                </div>
              </div>

              {/* ── Visual Flow Diagram Card ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Workflow className="size-4 text-primary" />
                    <span>Visual Workflow Canvas Diagram (Reference Architecture)</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">Click image to expand in HD</span>
                </div>

                <div
                  onClick={() => setImageModalOpen(true)}
                  className="group relative rounded-xl border border-border/80 overflow-hidden bg-zinc-950 shadow-inner cursor-zoom-in transition-all hover:border-primary/50"
                >
                  <div className="relative w-full h-80 sm:h-[420px]">
                    <Image
                      src={activeFlow.image}
                      alt={activeFlow.title}
                      fill
                      className="object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-[1.01]"
                      priority
                    />
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-md text-[11px] text-zinc-300 flex items-center gap-1.5 border border-white/10 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="size-3.5" />
                    <span>Expand High-Resolution Architecture</span>
                  </div>
                </div>
              </div>

              {/* ── Key Nodes Breakdown Pill Grid ── */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nodes Used in This Architecture ({activeFlow.nodesUsed.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeFlow.nodesUsed.map((node, i) => (
                    <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{node.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {node.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {node.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Step-by-Step Beginner Guide ── */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="border-b pb-4 space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>Step-by-Step Assembly Guide for Beginners</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Follow these instructions in the Workflow Editor to construct this attendance tracking system from scratch.
                </p>
              </div>

              <div className="space-y-6">
                {activeFlow.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="relative pl-7 sm:pl-9 pb-6 last:pb-0 border-l-2 border-primary/20 last:border-transparent space-y-3"
                  >
                    {/* Step Number Circle */}
                    <div className="absolute -left-[15px] top-0 size-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                      {step.stepNumber}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                      <Badge className={`text-[10px] px-2 py-0.5 border ${step.badgeColor}`}>
                        {step.nodeName}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Handles Connected */}
                    {step.handlesConnected && step.handlesConnected.length > 0 && (
                      <div className="rounded-md bg-muted/40 p-2.5 space-y-1 text-xs">
                        <div className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                          <Workflow className="size-3 text-primary" />
                          <span>Wire Connections:</span>
                        </div>
                        {step.handlesConnected.map((conn, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                            <span className="text-primary font-semibold">{conn.from}</span>
                            <span>➔</span>
                            <span className="text-foreground">{conn.to}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Key Settings Table */}
                    {step.keySettings && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {step.keySettings.map((setting, idx) => (
                          <div key={idx} className="p-2 rounded bg-background border text-[11px] flex flex-col gap-0.5">
                            <span className="text-muted-foreground font-medium">{setting.label}</span>
                            <span className="font-semibold text-foreground font-mono">{setting.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pro Tip */}
                    {step.proTip && (
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/20 text-[11px] text-primary leading-snug">
                        <Lightbulb className="size-3.5 shrink-0 mt-0.5 text-primary" />
                        <span><strong>Pro Tip:</strong> {step.proTip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── AI Prompt Template Box ── */}
            {activeFlow.promptTemplate && (
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-4 text-primary" />
                      <span>Recommended Dynamic MasterSheet AI Prompt</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Paste this prompt inside your DynamicMasterSheetNode custom instruction box.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyPrompt(activeFlow.promptTemplate!)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    <span>{copiedPrompt ? "Copied" : "Copy Prompt"}</span>
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-emerald-400 border border-emerald-500/20 selection:bg-emerald-900">
                  {activeFlow.promptTemplate}
                </div>
              </div>
            )}

            {/* ── Best Practices & Checklist ── */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Beginner Checklist & Best Practices</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {activeFlow.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 border border-border">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-12 text-center space-y-3 bg-card/40">
            <Clock className="size-8 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold">Template Flow Guide Coming Soon</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              This workflow template is currently being documented. Select the <strong>Attendance Tracking System</strong> guide above to explore a full working walkthrough.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedFlowId("attendance-tracking")}
              className="text-xs"
            >
              Back to Attendance System Guide
            </Button>
          </div>
        )}
      </div>

      {/* ── Lightbox / Fullscreen Image Dialog ── */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold flex items-center justify-between pr-6">
              <span>{activeFlow.title} — High-Resolution Architecture</span>
              <Badge variant="outline" className="text-xs font-normal">
                UNIXL Workflow Canvas
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="relative flex-1 min-h-[550px] w-full bg-zinc-950 rounded-lg overflow-hidden border">
            <Image
              src={activeFlow.image}
              alt="High Resolution Flow Diagram"
              fill
              className="object-contain p-2"
              priority
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
