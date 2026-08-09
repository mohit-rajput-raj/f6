"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { Sparkles, Sliders, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/components";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import { getUserLLMKeys } from "@/app/[project]/dash/[dashid]/(documents)/data-library/api-key-actions";
import api from "@/lib/axios";

interface SubjectOption {
  subject: string;
  component: string;
}

export function AISchemaAlignNode({ id, data }: any) {
  const { data: sessionData } = useSession();
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState<number>(0);
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatesCount, setUpdatesCount] = useState<number>(0);

  // Load API key from DB or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);
      if (storedKey) setApiKey(storedKey);
    }
    if (sessionData?.user?.id) {
      getUserLLMKeys(sessionData.user.id).then((keys) => {
        if (provider === "gemini" && keys.geminiApiKey) setApiKey(keys.geminiApiKey);
        if (provider === "openai" && keys.openaiApiKey) setApiKey(keys.openaiApiKey);
        if (provider === "claude" && keys.claudeApiKey) setApiKey(keys.claudeApiKey);
      }).catch(console.warn);
    }
  }, [provider, sessionData?.user?.id]);

  // Extract available subjects from incoming master grid dataset
  useEffect(() => {
    const inputGrid = data?.masterGrid?.data || data?.inputGrid;
    if (Array.isArray(inputGrid) && inputGrid.length > 0) {
      const detected: SubjectOption[] = [];
      const subPattern = /[A-Z]{2}\d{3,}/i;
      for (const row of inputGrid.slice(0, 10)) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          if (cell && subPattern.test(String(cell))) {
            const val = String(cell).trim();
            if (!detected.some((d) => d.subject === val)) {
              detected.push({ subject: val, component: "Theory" });
              detected.push({ subject: val, component: "Tutorial" });
              detected.push({ subject: val, component: "Lab" });
            }
          }
        }
      }
      if (detected.length > 0) {
        setSubjects(detected);
      }
    }
  }, [data?.masterGrid, data?.inputGrid]);

  const handleAlign = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const masterGrid = data?.masterGrid?.data || data?.inputGrid;
      const csvContent = data?.csvContent || data?.fileData?.rawText || (data?.fileData?.data ? JSON.stringify(data.fileData) : null);

      if (!masterGrid || !Array.isArray(masterGrid)) {
        throw new Error("Missing Master Sheet grid data input handle");
      }
      if (!csvContent) {
        throw new Error("Missing CSV file data input handle");
      }

      const activeTarget = subjects[selectedSubjectIdx] || { subject: "General", component: "Theory" };

      // Convert CSV grid or JSON dataset to CSV string if needed
      let csvString = typeof csvContent === "string" ? csvContent : "";
      if (!csvString && typeof csvContent === "object" && csvContent.columns) {
        const headers = csvContent.columns.join(",");
        const rows = csvContent.data.map((r: any[]) => r.join(",")).join("\n");
        csvString = `${headers}\n${rows}`;
      }

      // Call Python service PYP FastAPI server (/ai/align-schema)
      const pypUrl = process.env.NEXT_PUBLIC_PYP_SERVER_URL || "http://localhost:8000";
      const resp = await fetch(`${pypUrl}/ai/align-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_grid: masterGrid,
          csv_string: csvString,
          target_subject: activeTarget.subject,
          target_component: activeTarget.component,
          provider: provider,
          api_key: apiKey || undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Alignment backend error");
      }

      const result = await resp.json();
      if (result.success) {
        setUpdatesCount(result.updates.length);
        setSuccessMsg(`Matched & aligned ${result.updates.length} student records!`);
        if (data?.onResult) {
          data.onResult({
            alignment: result.alignment,
            updates: result.updates,
            targetSubject: activeTarget.subject,
            targetComponent: activeTarget.component,
          });
        }
      } else {
        throw new Error("Failed to align schema");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Schema alignment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 rounded-xl border border-indigo-500/30 bg-card p-4 shadow-lg text-foreground transition-all">
      {/* Handles */}
      <Handle type="target" position={Position.Left} id="master-grid" style={{ top: "25%" }} />
      <Handle type="target" position={Position.Left} id="csv-file" style={{ top: "75%" }} />
      <Handle type="source" position={Position.Right} id="updates" style={{ top: "50%" }} />

      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">AI Schema Alignment</h3>
            <p className="text-[10px] text-muted-foreground">Match CSV & Master Sheet</p>
          </div>
        </div>
        {updatesCount > 0 && (
          <Badge variant="secondary" className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {updatesCount} matched
          </Badge>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* Target Subject Selector */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Target Subject & Component</label>
          {subjects.length > 0 ? (
            <select
              className="w-full rounded-md border bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              value={selectedSubjectIdx}
              onChange={(e) => setSelectedSubjectIdx(Number(e.target.value))}
            >
              {subjects.map((sub, idx) => (
                <option key={idx} value={idx}>
                  {sub.subject} ({sub.component})
                </option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="e.g. CO24553 (Theory)"
              onChange={(e) => {
                const val = e.target.value;
                setSubjects([{ subject: val, component: "Theory" }]);
              }}
              className="h-7 text-xs"
            />
          )}
        </div>

        {/* LLM Provider & Key */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">Provider</label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">API Key</label>
            <Input
              type="password"
              placeholder="Stored or Custom"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAlign}
          disabled={loading}
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sliders className="size-3.5" />}
          {loading ? "Aligning..." : "Analyze & Align CSV"}
        </Button>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px]">
            <AlertCircle className="size-3 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">
            <CheckCircle className="size-3 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
