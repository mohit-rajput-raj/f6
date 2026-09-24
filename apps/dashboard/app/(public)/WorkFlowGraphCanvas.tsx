"use client";

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  Workflow,
  Terminal,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Save,
  Table2,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  ArrowRight,
} from "lucide-react";

interface WorkflowGraphProps {
  activeNodeStep?: number;
  onSelectStep?: (step: number) => void;
}

interface Connection {
  from: string;
  to: string;
  activeStep: number;
}

const CONNECTIONS: Connection[] = [
  { from: "pa-tracker", to: "stack-node", activeStep: 1 },
  { from: "desk-sheet", to: "stack-node", activeStep: 1 },
  { from: "desk-sheet", to: "ai-align", activeStep: 2 },
  { from: "stack-node", to: "save-file", activeStep: 3 },
  { from: "ai-align", to: "merged", activeStep: 3 },
];

const STAGE_LABELS: Record<number, string> = {
  0: "Source Ingestion",
  1: "Schema Stacking",
  2: "AI Alignment",
  3: "Atomic Commit",
};

export const WorkflowGraphCanvas: React.FC<WorkflowGraphProps> = ({
  activeNodeStep = 0,
  onSelectStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const portsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [paths, setPaths] = useState<
    Array<{ id: string; d: string; active: boolean }>
  >([]);

  const registerPort = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      portsRef.current.set(id, el);
    } else {
      portsRef.current.delete(id);
    }
  };

  const updateConnections = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newPaths = CONNECTIONS.map((conn) => {
      const sourceEl = portsRef.current.get(`${conn.from}-out`);
      const targetEl = portsRef.current.get(`${conn.to}-in`);

      if (!sourceEl || !targetEl) return null;

      const sRect = sourceEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();

      const x1 = sRect.left + sRect.width / 2 - containerRect.left;
      const y1 = sRect.top + sRect.height / 2 - containerRect.top;
      const x2 = tRect.left + tRect.width / 2 - containerRect.left;
      const y2 = tRect.top + tRect.height / 2 - containerRect.top;

      const dx = Math.max(Math.abs(x2 - x1) * 0.45, 30);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      return {
        id: `${conn.from}->${conn.to}`,
        d,
        active: activeNodeStep >= conn.activeStep,
      };
    }).filter(Boolean) as Array<{ id: string; d: string; active: boolean }>;

    setPaths(newPaths);
  };

  useLayoutEffect(() => {
    updateConnections();
  }, [activeNodeStep]);

  useEffect(() => {
    const handleResize = () => updateConnections();
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(() => updateConnections());
    if (containerRef.current) observer.observe(containerRef.current);

    // Run once after fonts/layout settle
    const timer = setTimeout(updateConnections, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-w-full select-none font-sans">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Window Topbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-zinc-700/80 border border-zinc-600/50" />
              <span className="size-2.5 rounded-full bg-zinc-700/80 border border-zinc-600/50" />
              <span className="size-2.5 rounded-full bg-zinc-700/80 border border-zinc-600/50" />
            </div>
            <div className="h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
              <Workflow className="size-3.5 text-zinc-400" />
              <span>pipeline.flow</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-500">live-stream</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
              100%
            </span>
          </div>
        </div>

        {/* Canvas Body */}
        <div
          ref={containerRef}
          className="relative p-6 sm:p-8 bg-zinc-950 min-h-[460px] flex items-center justify-center overflow-hidden"
        >
          {/* Subtle Technical Dot Grid */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(#52525b 0.75px, transparent 0.75px)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* Dynamic SVG Cable Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {paths.map((path) => (
              <g key={path.id}>
                {/* Background cable stroke */}
                <path
                  d={path.d}
                  fill="none"
                  stroke={path.active ? "#3f3f46" : "#27272a"}
                  strokeWidth="1.5"
                />

                {/* Active transmission line */}
                {path.active && (
                  <>
                    <path
                      d={path.d}
                      fill="none"
                      stroke="#a1a1aa"
                      strokeWidth="1.5"
                      strokeOpacity="0.8"
                    />
                    {/* Subtle, elegant data packet bead */}
                    <circle
                      r="2.5"
                      fill="#fafafa"
                      className="filter drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]"
                    >
                      <animateMotion
                        dur="2.4s"
                        repeatCount="indefinite"
                        path={path.d}
                      />
                    </circle>
                  </>
                )}
              </g>
            ))}
          </svg>

          {/* Node Columns (3 columns: Source -> Compute -> Output) */}
          <div className="relative z-20 w-full grid grid-cols-3 gap-8 sm:gap-10 items-center max-w-4xl mx-auto">
            {/* Column 1: Source Nodes (Step 0) */}
            <div className="space-y-5">
              <NodeCard
                id="pa-tracker"
                title="P/A Tracker"
                badge="Source CSV"
                stepIndex={0}
                active={activeNodeStep === 0}
                onSelectStep={onSelectStep}
                icon={<Terminal className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasOutput
              >
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950/80 border border-zinc-800/80 text-zinc-300 truncate">
                    <FileCode2 className="size-3 text-zinc-500 shrink-0" />
                    <span className="truncate">CO24009_Lab_Sep.csv</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 text-[9px] px-0.5">
                    <span>Format: CSV</span>
                    <span>Delimited</span>
                  </div>
                </div>
              </NodeCard>

              <NodeCard
                id="desk-sheet"
                title="Desk Sheet"
                badge="MasterSheet"
                stepIndex={0}
                active={activeNodeStep === 0}
                onSelectStep={onSelectStep}
                icon={<FileSpreadsheet className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasOutput
              >
                <div className="rounded border border-zinc-800/90 bg-zinc-950/90 overflow-hidden font-mono text-[9px]">
                  <div className="grid grid-cols-3 bg-zinc-900/90 px-2 py-1 text-zinc-400 border-b border-zinc-800/80 font-medium">
                    <span>Roll</span>
                    <span className="text-center">Jul 1</span>
                    <span className="text-center">Jul 2</span>
                  </div>
                  <div className="grid grid-cols-3 px-2 py-1 text-zinc-300">
                    <span className="text-zinc-500">#1001</span>
                    <span className="text-center font-semibold text-emerald-400">
                      P
                    </span>
                    <span className="text-center font-semibold text-emerald-400">
                      P
                    </span>
                  </div>
                </div>
              </NodeCard>
            </div>

            {/* Column 2: Transform & Compute Layer (Step 1 & 2) */}
            <div className="space-y-5">
              <NodeCard
                id="stack-node"
                title="Stack Node"
                badge="Matrix"
                stepIndex={1}
                active={activeNodeStep === 1}
                onSelectStep={onSelectStep}
                icon={<Layers className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasInput
                hasOutput
              >
                <div className="space-y-1.5 p-2 rounded bg-zinc-950/80 border border-zinc-800/80 font-mono text-[10px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Key Field:</span>
                    <span className="text-zinc-200 font-medium">
                      Enrollment
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 text-[9px]">
                    <span>Mode:</span>
                    <span className="text-zinc-300">Date Matrix Expansion</span>
                  </div>
                </div>
              </NodeCard>

              <NodeCard
                id="ai-align"
                title="AI Alignment"
                badge="Gemini LLM"
                stepIndex={2}
                active={activeNodeStep === 2}
                onSelectStep={onSelectStep}
                icon={<Sparkles className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasInput
                hasOutput
              >
                <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 space-y-1 font-mono text-[10px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Target:</span>
                    <span className="text-zinc-200">CO24804/Tut.</span>
                  </div>
                  <p className="text-zinc-500 text-[9px] line-clamp-1">
                    Calculate sessions & reconcile
                  </p>
                </div>
              </NodeCard>
            </div>

            {/* Column 3: Output & Review (Step 3) */}
            <div className="space-y-5">
              <NodeCard
                id="save-file"
                title="Save File"
                badge="Snapshot"
                stepIndex={3}
                active={activeNodeStep === 3}
                onSelectStep={onSelectStep}
                icon={<Save className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasInput
              >
                <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 font-mono text-[10px] space-y-1">
                  <div className="text-zinc-300 truncate">
                    📁 /attendance_sync.csv
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 text-[9px]">
                    <span>Write: Atomic</span>
                    <span className="text-emerald-400">Auto-Ready</span>
                  </div>
                </div>
              </NodeCard>

              <NodeCard
                id="merged"
                title="Merged Preview"
                badge="Commit"
                stepIndex={3}
                active={activeNodeStep === 3}
                onSelectStep={onSelectStep}
                icon={<Table2 className="size-3.5 text-zinc-300" />}
                registerPort={registerPort}
                hasInput
              >
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between text-zinc-400 text-[9px]">
                    <span>Target: Sheet1</span>
                    <span className="text-zinc-300">91 records</span>
                  </div>
                  <div className="w-full py-1.5 px-2 rounded bg-zinc-800/90 border border-zinc-700/80 text-zinc-200 text-center font-medium flex items-center justify-center gap-1 text-[10px] transition-colors group-hover:border-zinc-500">
                    <span>Confirm Merge</span>
                    <ArrowRight className="size-3 text-zinc-400" />
                  </div>
                </div>
              </NodeCard>
            </div>
          </div>
        </div>

        {/* Footer Telemetry Bar */}
        <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-zinc-400" />
            <span className="text-zinc-400">
              In-memory schema pipeline · 91 records · 0 conflicts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">
              Step {activeNodeStep + 1} of 4:
            </span>
            <span className="text-zinc-200 font-medium">
              {STAGE_LABELS[activeNodeStep] || "Processing"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NodeCardProps {
  id: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  active: boolean;
  stepIndex: number;
  hasInput?: boolean;
  hasOutput?: boolean;
  onSelectStep?: (step: number) => void;
  registerPort: (id: string, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

const NodeCard: React.FC<NodeCardProps> = ({
  id,
  title,
  badge,
  icon,
  active,
  stepIndex,
  hasInput,
  hasOutput,
  onSelectStep,
  registerPort,
  children,
}) => {
  return (
    <div
      onClick={() => onSelectStep?.(stepIndex)}
      className={`group relative p-3 rounded-xl border bg-zinc-900/90 backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer ${
        active
          ? "border-zinc-400/90 bg-zinc-900 shadow-md ring-1 ring-white/10"
          : "border-zinc-800 hover:border-zinc-700/90 hover:bg-zinc-900/95"
      }`}
    >
      {/* Input Port Anchor */}
      {hasInput && (
        <div
          ref={(el) => registerPort(`${id}-in`, el)}
          className={`absolute -left-1 top-1/2 -translate-y-1/2 size-2 rounded-full border border-zinc-800 transition-colors ${
            active ? "bg-zinc-200 border-zinc-400" : "bg-zinc-700"
          }`}
        />
      )}

      {/* Node Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
            {icon}
          </div>
          <span className="font-medium text-zinc-200 text-xs tracking-tight">
            {title}
          </span>
        </div>
        <span
          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
            active
              ? "bg-zinc-800 text-zinc-200 border-zinc-600"
              : "bg-zinc-950/60 text-zinc-500 border-zinc-800"
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Body */}
      {children}

      {/* Output Port Anchor */}
      {hasOutput && (
        <div
          ref={(el) => registerPort(`${id}-out`, el)}
          className={`absolute -right-1 top-1/2 -translate-y-1/2 size-2 rounded-full border border-zinc-800 transition-colors ${
            active ? "bg-zinc-200 border-zinc-400" : "bg-zinc-700"
          }`}
        />
      )}
    </div>
  );
};
